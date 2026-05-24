import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const idolDbPath = path.join(rootDir, "app", "idols.js");
const reportPath = path.join(rootDir, "regression-test", "idol-db-check-report.json");
const allowedPlans = new Set(["センス", "ロジック", "アノマリー", "未設定"]);

function groupBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  return [...map.entries()].filter(([, values]) => values.length > 1);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const idolDbUrl = pathToFileURL(idolDbPath);
  idolDbUrl.search = `t=${Date.now()}`;
  const { idolDb } = await import(idolDbUrl.href);

  const duplicateIds = groupBy(idolDb, (idol) => idol.id || "").map(
    ([id, idols]) => ({
      id,
      idols: idols.map((idol) => `${idol.character} / ${idol.title}`),
    })
  );

  const duplicateImages = groupBy(
    idolDb.filter((idol) => idol.image),
    (idol) => idol.image
  ).map(([image, idols]) => ({
    image,
    idols: idols.map((idol) => `${idol.character} / ${idol.title}`),
  }));

  const missingImages = [];
  const remoteImages = [];
  const invalidPlans = [];

  for (const idol of idolDb) {
    if (!allowedPlans.has(idol.plan)) {
      invalidPlans.push({
        id: idol.id,
        idol: `${idol.character} / ${idol.title}`,
        plan: idol.plan,
      });
    }

    if (!idol.image) {
      missingImages.push({
        id: idol.id,
        idol: `${idol.character} / ${idol.title}`,
        image: "",
      });
      continue;
    }

    if (/^https?:\/\//.test(idol.image)) {
      remoteImages.push({
        id: idol.id,
        idol: `${idol.character} / ${idol.title}`,
        image: idol.image,
      });
      continue;
    }

    const localPath = path.join(rootDir, "public", idol.image.replace(/^\//, ""));
    if (!(await exists(localPath))) {
      missingImages.push({
        id: idol.id,
        idol: `${idol.character} / ${idol.title}`,
        image: idol.image,
      });
    }
  }

  const report = {
    total: idolDb.length,
    ok:
      duplicateIds.length === 0 &&
      duplicateImages.length === 0 &&
      missingImages.length === 0 &&
      remoteImages.length === 0 &&
      invalidPlans.length === 0,
    duplicateIds,
    duplicateImages,
    missingImages,
    remoteImages,
    invalidPlans,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
