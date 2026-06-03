import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const root = process.cwd();
const idolDbPath = path.join(root, 'app', 'idols.js');
const imageDir = path.join(root, 'public', 'idols');
const reportPath = path.join(root, 'regression-test', 'sr-r-idol-import-report.json');
const listUrl =
  'https://seesaawiki.jp/gakumasu/d/%a5%d7%a5%ed%a5%c7%a5%e5%a1%bc%a5%b9%a5%a2%a5%a4%a5%c9%a5%eb%b0%ec%cd%f7';

const userAgent = 'gakumas-contest-tracker-sr-r-import/1.0';

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[【】「」『』\[\]（）()・･\s!！?？♡♥]/g, '')
    .replace(/\uFE0F/g, '')
    .toLowerCase()
    .trim();
}

function safeIdSegment(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[【】「」『』\[\]（）()]/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/[♡♥]/g, '')
    .replace(/[!！?？:：,，.。'"`]/g, '')
    .replace(/[／/\\|]/g, '_')
    .replace(/[・･\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function extractPlan(value) {
  const text = String(value ?? '');
  if (text.includes('アノマリー')) return 'アノマリー';
  if (text.includes('ロジック')) return 'ロジック';
  if (text.includes('センス')) return 'センス';
  return '';
}

function parseCardName(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  const match = text.match(/^【(.+?)】(.+)$/);
  if (!match) return null;
  return {
    title: match[1].trim(),
    character: match[2].replace(/\s+/g, '').trim(),
  };
}

function makeEntryKey({ title, character, rarity }) {
  return `${normalizeKey(title)}|${normalizeKey(character)}|${rarity}`;
}

function makeShort(title, character) {
  const given = character.replace(/\s+/g, '').slice(-2);
  if (title.length <= 8) return `${title}${given}`;
  return `${title.slice(0, 6)}…${given}`;
}

async function fetchSeesaaHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return iconv.decode(Buffer.from(await res.arrayBuffer()), 'EUC-JP');
}

function findSkillCardImage(html, detailUrl) {
  const $ = cheerio.load(html);
  let image = '';

  $('table').each((_, table) => {
    if (image) return;
    const firstHeader = $(table).find('tr').first().find('th,td').first().text().replace(/\s+/g, '').trim();
    if (!firstHeader.includes('固有スキルカード')) return;
    const src = $(table).find('img[src]').first().attr('src');
    if (src) image = new URL(src, detailUrl).href;
  });

  return image;
}

function inferCharacterPrefixMap(idolDb) {
  const map = new Map();
  for (const idol of idolDb) {
    const safeTitle = safeIdSegment(idol.title);
    const suffix = `_${safeTitle}`;
    if (safeTitle && idol.id.endsWith(suffix)) {
      map.set(idol.character, idol.id.slice(0, -suffix.length));
    }
  }
  return map;
}

async function nextImageNumber() {
  const files = await fs.readdir(imageDir);
  return (
    Math.max(
      0,
      ...files
        .map((file) => file.match(/^(\d+)\.(?:png|jpg|jpeg|webp)$/i)?.[1])
        .filter(Boolean)
        .map(Number),
    ) + 1
  );
}

function imageExtensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return ext;
  return '.png';
}

function parseRowsFromTable($, table, rarity) {
  const rows = [];
  $(table)
    .find('tr')
    .slice(1)
    .each((_, row) => {
      const cells = $(row)
        .find('th,td')
        .map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
        .get();
      const parsed = parseCardName(cells[0]);
      const plan = extractPlan(cells[1]);
      const href = $(row).find('a[href]').first().attr('href');
      if (!parsed || !plan || !href) return;
      rows.push({
        ...parsed,
        rarity,
        plan,
        rawPlan: cells[1],
        detailUrl: new URL(href, listUrl).href,
      });
    });
  return rows;
}

const dbUrl = pathToFileURL(idolDbPath);
dbUrl.search = `t=${Date.now()}`;
const { idolDb } = await import(dbUrl.href);

const report = {
  source: listUrl,
  beforeCount: idolDb.length,
  added: [],
  skippedExisting: [],
  skippedUncertain: [],
  missingImages: [],
};

const html = await fetchSeesaaHtml(listUrl);
const $ = cheerio.load(html);
const cardTables = [];

$('table').each((_, table) => {
  const headers = $(table)
    .find('tr')
    .first()
    .find('th,td')
    .map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
    .get();
  if (headers[0] === 'カード名' && headers.some((header) => header.includes('プラン'))) {
    cardTables.push(table);
  }
});

if (cardTables.length < 3) {
  throw new Error(`Expected SSR/SR/R card tables, found ${cardTables.length}`);
}

const targetRows = [
  ...parseRowsFromTable($, cardTables[1], 'SR'),
  ...parseRowsFromTable($, cardTables[2], 'R'),
];

const existingKeys = new Set(idolDb.map((idol) => makeEntryKey(idol)));
const characterPrefixMap = inferCharacterPrefixMap(idolDb);
let imageNumber = await nextImageNumber();

for (const row of targetRows) {
  const key = makeEntryKey(row);
  if (existingKeys.has(key)) {
    report.skippedExisting.push(row);
    continue;
  }

  const characterPrefix = characterPrefixMap.get(row.character);
  if (!characterPrefix) {
    report.skippedUncertain.push({ ...row, reason: 'No matching built-in character prefix found' });
    continue;
  }

  const detailHtml = await fetchSeesaaHtml(row.detailUrl);
  const imageUrl = findSkillCardImage(detailHtml, row.detailUrl);
  if (!imageUrl) {
    report.missingImages.push({ ...row, reason: '固有スキルカード image not found' });
    continue;
  }

  const imageExt = imageExtensionFromUrl(imageUrl);
  const imagePath = path.join(imageDir, `${imageNumber}${imageExt}`);
  const imageRes = await fetch(imageUrl, { headers: { 'User-Agent': userAgent } });
  if (!imageRes.ok) {
    report.missingImages.push({ ...row, imageUrl, reason: `Image fetch failed: ${imageRes.status}` });
    continue;
  }

  await fs.writeFile(imagePath, Buffer.from(await imageRes.arrayBuffer()));

  const entry = {
    id: `${characterPrefix}_${safeIdSegment(row.title)}`,
    name: `${row.title} ${row.character}`,
    short: makeShort(row.title, row.character),
    character: row.character,
    title: row.title,
    plan: row.plan,
    rarity: row.rarity,
    image: `/idols/${imageNumber}${imageExt}`,
  };

  idolDb.push(entry);
  existingKeys.add(key);
  report.added.push({ ...entry, source: row.detailUrl, skillCardImage: imageUrl });
  imageNumber += 1;
}

report.afterCount = idolDb.length;
report.addedCount = report.added.length;
report.skippedExistingCount = report.skippedExisting.length;
report.skippedUncertainCount = report.skippedUncertain.length;
report.missingImagesCount = report.missingImages.length;

await fs.writeFile(idolDbPath, `export const idolDb = ${JSON.stringify(idolDb, null, 2)};\n`, 'utf8');
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(JSON.stringify(report, null, 2));
