import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const idolDbPath = path.join(rootDir, "app", "idols.js");
const outputDir = path.join(rootDir, "public", "idols");
const listUrl =
  "https://seesaawiki.jp/gakumasu/d/%a5%d7%a5%ed%a5%c7%a5%e5%a1%bc%a5%b9%a5%a2%a5%a4%a5%c9%a5%eb%b0%ec%cd%f7";
const manualSkillImageUrls = new Map([
  [
    makeCardKey("VEIL", "秦谷美鈴"),
    "https://img.game8.jp/12527896/110d9c825e0bdbcb0505d0b321663bea.webp/original",
  ],
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[【】「」『』]/g, "")
    .trim();
}

function makeCardKey(title, character) {
  return `${normalizeKey(title)}|${normalizeKey(character)}`;
}

function isWikiContentImage(src) {
  return (
    /^https:\/\/image\d+\.seesaawiki\.jp\/g\/u\/gakumasu\//.test(src) &&
    !src.includes("spacer.gif")
  );
}

async function fetchEucJpHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gakumas-contest-tracker-local-import/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return iconv.decode(buffer, "EUC-JP");
}

function extractCardLinks(html) {
  const $ = cheerio.load(html);
  const links = new Map();

  $("a").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, "").trim();
    const href = $(element).attr("href");
    const match = text.match(/^【(.+)】(.+)$/);

    if (!match || !href) return;

    const [, title, character] = match;
    links.set(makeCardKey(title, character), {
      title,
      character,
      href,
      text,
    });
  });

  return links;
}

function extractSkillCardImage(html) {
  const $ = cheerio.load(html);
  let sectionBody = null;

  $("h1,h2,h3,h4,h5").each((_, heading) => {
    if (sectionBody) return;

    const text = $(heading).text().replace(/\s+/g, "").trim();
    if (!text.includes("固有スキル・固有Pアイテム")) return;

    const titleBlock = $(heading).closest("div");
    const nextBody = titleBlock.next();

    if (nextBody.length > 0) {
      sectionBody = nextBody;
    }
  });

  const root = sectionBody ?? $("body");

  let skillTableImage = "";

  root.find("table").each((_, table) => {
    if (skillTableImage) return;

    const firstRowText = $(table)
      .find("tr")
      .first()
      .text()
      .replace(/\s+/g, "")
      .trim();

    if (firstRowText !== "固有スキルカード") return;

    skillTableImage =
      $(table)
        .find("img")
        .map((__, image) => $(image).attr("src"))
        .get()
        .filter(Boolean)
        .filter(isWikiContentImage)[0] || "";
  });

  if (skillTableImage) {
    return skillTableImage;
  }

  const imageSources = root
    .find("img")
    .map((_, image) => $(image).attr("src"))
    .get()
    .filter(Boolean)
    .filter(isWikiContentImage);

  return imageSources[0] || "";
}

async function downloadImage(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gakumas-contest-tracker-local-import/1.0",
      Referer: "https://seesaawiki.jp/gakumasu/",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";

  if (path.extname(destination).toLowerCase() === ".png" && contentType !== "image/png") {
    await sharp(buffer).png().toFile(destination);
    return;
  }

  await fs.writeFile(destination, buffer);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const idolDbUrl = pathToFileURL(idolDbPath);
  idolDbUrl.search = `t=${Date.now()}`;
  const { idolDb } = await import(idolDbUrl.href);
  const listHtml = await fetchEucJpHtml(listUrl);
  const cardLinks = extractCardLinks(listHtml);

  const report = {
    total: idolDb.length,
    matched: 0,
    downloaded: 0,
    missingLink: [],
    missingImage: [],
    failed: [],
  };

  for (let index = 0; index < idolDb.length; index += 1) {
    const idol = idolDb[index];
    const link = cardLinks.get(makeCardKey(idol.title, idol.character));

    if (!link) {
      report.missingLink.push(`${idol.title} / ${idol.character}`);
      idol.image = "";
      continue;
    }

    report.matched += 1;

    try {
      const html = await fetchEucJpHtml(link.href);
      const imageUrl =
        extractSkillCardImage(html) ||
        manualSkillImageUrls.get(makeCardKey(idol.title, idol.character)) ||
        "";

      if (!imageUrl) {
        report.missingImage.push(link.text);
        idol.image = "";
        continue;
      }

      const fileName = `${index + 1}.png`;
      await downloadImage(imageUrl, path.join(outputDir, fileName));
      idol.image = `/idols/${fileName}`;
      report.downloaded += 1;

      await sleep(120);
    } catch (error) {
      report.failed.push({
        idol: `${idol.title} / ${idol.character}`,
        message: error.message,
      });
      idol.image = "";
    }
  }

  const nextSource = `export const idolDb = ${JSON.stringify(idolDb, null, 2)};\n`;
  await fs.writeFile(idolDbPath, nextSource, "utf8");

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
