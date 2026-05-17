import fs from "fs";

const URL = "https://gktools.ris.moe/dex/collection/p-idols";

const characterPlan = {
  "花海 咲季": "センス",
  "月村 手毬": "ロジック",
  "藤田 ことね": "センス",
  "有村 麻央": "センス",
  "葛城 リーリヤ": "ロジック",
  "倉本 千奈": "ロジック",
  "紫雲 清夏": "センス",
  "篠澤 広": "ロジック",
  "姫崎 莉波": "センス",
  "花海 佑芽": "ロジック",
  "十王 星南": "アノマリー",
  "秦谷 美鈴": "アノマリー",
  "雨夜 燕": "アノマリー",
};

function normalizeId(text) {
  return text
    .replace(/\s+/g, "_")
    .replace(/[！!]/g, "")
    .replace(/[？?]/g, "")
    .replace(/[↑↓]/g, "")
    .replace(/[（）()]/g, "")
    .replace(/[・]/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function shortName(character, title) {
  const char = character.replace(/\s/g, "");

  if (title === "Campus mode!!") {
    return `Campus${char.slice(-2)}`;
  }

  if (title.length <= 8) {
    return title;
  }

  return `${title.slice(0, 6)}…${char.slice(-2)}`;
}

const res = await fetch(URL);
const html = await res.text();

const text = html
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<[^>]+>/g, "\n")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const characters = Object.keys(characterPlan);
const idols = [];

let imageIndex = 1;

for (let i = 0; i < text.length - 1; i++) {
  const character = text[i];
  const title = text[i + 1];

  if (!characters.includes(character)) {
    continue;
  }

  if (
    title.includes("0/") ||
    title === "Collected" ||
    title === "By idol" ||
    title === "By plan"
  ) {
    continue;
  }

  const id = normalizeId(`${character}_${title}`);

  idols.push({
    id,
    name: `${title} ${character.replace(/\s/g, "")}`,
    short: shortName(character, title),
    character: character.replace(/\s/g, ""),
    title,
    plan: characterPlan[character] || "未設定",
    rarity: "SSR",
    image: `https://gkimg.ris.moe/idols/${imageIndex}.png`,
  });

  imageIndex++;
}

const unique = Array.from(
  new Map(idols.map((idol) => [idol.id, idol])).values()
);

const output = `export const idolDb = ${JSON.stringify(unique, null, 2)};
`;

fs.writeFileSync("./app/idols.js", output, "utf8");

console.log(`${unique.length}件のアイドルを app/idols.js に出力しました`);
console.log("画像URL付き");