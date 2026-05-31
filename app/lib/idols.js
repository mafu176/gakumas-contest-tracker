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
  return resolveIdolImage(idol);
}

export function buildFallbackImagePath(idolId) {
  if (!idolId) return "";
  return `/idols/${idolId}.png`;
}

function normalizeIdolIdentifier(value) {
  return String(value ?? "").trim();
}

function collectIdolIdentifiers(idol) {
  if (!idol) return [];

  return [
    idol.idol_db_id,
    idol.idolDbId,
    idol.id,
    idol.key,
    idol.name,
    idol.displayName,
    idol.short,
    idol.title && idol.character ? `${idol.title} ${idol.character}` : "",
    getIdolDisplayName(idol),
  ]
    .map(normalizeIdolIdentifier)
    .filter(Boolean);
}

function getStoredCustomIdols() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage?.getItem("gakumasCustomIdols");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDefaultIdolSources() {
  return [...idolDb, ...getStoredCustomIdols()];
}

function findMatchingIdol(idol, idolSources = getDefaultIdolSources()) {
  const identifiers = new Set(collectIdolIdentifiers(idol));
  if (identifiers.size === 0) return null;

  return idolSources.find((candidate) =>
    collectIdolIdentifiers(candidate).some((identifier) =>
      identifiers.has(identifier)
    )
  ) || null;
}

export function resolveIdolImage(idol, idolSources = getDefaultIdolSources()) {
  if (!idol) return "";

  const directImage =
    idol.image ||
    idol.imageUrl ||
    idol.image_url ||
    idol.icon ||
    idol.thumbnail ||
    "";

  if (directImage) return directImage;

  const matchedIdol = findMatchingIdol(idol, idolSources);
  if (!matchedIdol || matchedIdol === idol) return "";

  return (
    matchedIdol.image ||
    matchedIdol.imageUrl ||
    matchedIdol.image_url ||
    matchedIdol.icon ||
    matchedIdol.thumbnail ||
    ""
  );
}

export function resolveRecordIdolImage(record, stage, member, side = "my") {
  const prefix = `s${stage}_${side}${member}`;
  const image =
    record[`${prefix}_idol_image`] ||
    record[`${prefix}_idol_image_url`] ||
    "";

  if (image) return image;

  const resolvedImage = resolveIdolImage({
    idol_db_id: record[`${prefix}_idol_db_id`],
    id: record[`${prefix}_idol_id`],
    name: record[`${prefix}_idol_name`] || record[`${prefix}_idol`],
    displayName: record[`${prefix}_idol`],
    short: record[`${prefix}_idol_variant`],
  });

  if (resolvedImage) return resolvedImage;

  const idolId = record[`${prefix}_idol_id`];

  return buildFallbackImagePath(idolId);
}
