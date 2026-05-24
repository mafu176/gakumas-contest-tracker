import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const root = process.cwd();
const idolDbPath = path.join(root, 'app', 'idols.js');
const url='https://seesaawiki.jp/gakumasu/d/%a5%d7%a5%ed%a5%c7%a5%e5%a1%bc%a5%b9%a5%a2%a5%a4%a5%c9%a5%eb%b0%ec%cd%f7';

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[【】「」『』\[\]（）()・･\s!！?？♡]/g, '')
    .replace(/\uFE0F/g, '')
    .toLowerCase()
    .trim();
}

function makeKey(title, character) {
  return `${normalizeKey(title)}|${normalizeKey(character)}`;
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
  return { title: match[1].trim(), character: match[2].replace(/\s+/g, '').trim() };
}

const res = await fetch(url, { headers: { 'User-Agent': 'gakumas-contest-tracker-local-plan-check/1.0' }});
const html = iconv.decode(Buffer.from(await res.arrayBuffer()), 'EUC-JP');
const $ = cheerio.load(html);
const wikiPlanByKey = new Map();

$('table').each((_, table) => {
  const firstRow = $(table).find('tr').first().find('th,td').map((__, cell) => $(cell).text().replace(/\s+/g, '').trim()).get();
  if (firstRow[0] !== 'カード名' || !firstRow.some((cell) => cell.includes('プラン'))) return;

  $(table).find('tr').slice(1).each((__, row) => {
    const cells = $(row).find('th,td').map((___, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get();
    const parsed = parseCardName(cells[0]);
    const plan = extractPlan(cells[1]);
    if (!parsed || !plan) return;
    wikiPlanByKey.set(makeKey(parsed.title, parsed.character), { ...parsed, plan, rawPlan: cells[1] });
  });
});

const dbUrl = pathToFileURL(idolDbPath);
dbUrl.search = `t=${Date.now()}`;
const { idolDb } = await import(dbUrl.href);
const report = { wikiCards: wikiPlanByKey.size, dbCards: idolDb.length, changed: [], missing: [] };

for (const idol of idolDb) {
  const hit = wikiPlanByKey.get(makeKey(idol.title, idol.character));
  if (!hit) {
    report.missing.push({ title: idol.title, character: idol.character, currentPlan: idol.plan });
    continue;
  }
  if (idol.plan !== hit.plan) {
    report.changed.push({ title: idol.title, character: idol.character, from: idol.plan, to: hit.plan });
    idol.plan = hit.plan;
  }
}

await fs.writeFile(idolDbPath, `export const idolDb = ${JSON.stringify(idolDb, null, 2)};\n`, 'utf8');
await fs.writeFile(path.join(root, 'regression-test', 'idol-plan-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
