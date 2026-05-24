import { idolDb } from "../idols";

export function findIdolByName(name) {
  return idolDb.find((idol) => idol.name === name) || null;
}

export function makeStableIdolKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u3040-\u30ff\u3400-\u9fff]/g, "");
}

export function getIdolKey(idol) {
  if (!idol) return "";
  return idol.id || idol.key || makeStableIdolKey(idol.name || idol.short || "");
}

export function getIdolDisplayName(idol) {
  if (!idol) return "";

  const baseName = idol.name || idol.short || "";
  const variant =
    idol.variant ||
    idol.costume ||
    idol.cardName ||
    idol.title ||
    idol.style ||
    "";

  if (variant && !baseName.includes(variant)) {
    return `${baseName}（${variant}）`;
  }

  return baseName;
}

export function getIdolImage(idol) {
  if (!idol) return "";
  return idol.image || idol.imageUrl || idol.icon || idol.thumbnail || "";
}

export function buildFallbackImagePath(idolId) {
  if (!idolId) return "";
  return `/idols/${idolId}.png`;
}

export function resolveRecordIdolImage(record, stage, member, side = "my") {
  const image =
    record[`s${stage}_${side}${member}_idol_image`] ||
    record[`s${stage}_${side}${member}_idol_image_url`] ||
    "";

  if (image) return image;

  const idolId = record[`s${stage}_${side}${member}_idol_id`];

  return buildFallbackImagePath(idolId);
}
