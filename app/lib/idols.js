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

export function isEmptyIdolSlot(idol) {
  if (!idol) return true;
  if (typeof idol === "string") return idol.trim() === "";
  if (typeof idol !== "object") return false;

  return [
    idol.idol_db_id,
    idol.idolDbId,
    idol.id,
    idol.key,
    idol.name,
    idol.displayName,
    idol.short,
    idol.image,
    idol.imageUrl,
    idol.image_url,
    idol.icon,
    idol.thumbnail,
    idol.title,
    idol.variant,
    idol.character,
  ].every((value) => String(value ?? "").trim() === "");
}

export function getIdolDisplayName(idol) {
  if (isEmptyIdolSlot(idol)) return "";

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
    idol.image,
    idol.imageUrl,
    idol.image_url,
    idol.icon,
    idol.thumbnail,
    idol.title && idol.character ? `${idol.title} ${idol.character}` : "",
    idol.variant && idol.character ? `${idol.variant} ${idol.character}` : "",
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
  if (isEmptyIdolSlot(idol)) return "";

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

export function resolveIdolDisplayName(
  idol,
  idolSources = getDefaultIdolSources()
) {
  if (isEmptyIdolSlot(idol)) return "";

  const matchedIdol = findMatchingIdol(idol, idolSources);
  if (matchedIdol) {
    return (
      matchedIdol.displayName ||
      getIdolDisplayName(matchedIdol) ||
      matchedIdol.name ||
      matchedIdol.short ||
      matchedIdol.id ||
      ""
    );
  }

  const recordName = idol.idol_name || idol.name || "";
  const recordVariant =
    idol.idol_variant ||
    idol.variant ||
    idol.costume ||
    idol.cardName ||
    idol.title ||
    idol.style ||
    "";

  if (recordName && recordVariant && !recordName.includes(recordVariant)) {
    return `${recordVariant} ${recordName}`;
  }

  return (
    idol.displayName ||
    recordName ||
    idol.idol ||
    idol.short ||
    idol.idol_db_id ||
    idol.idolDbId ||
    idol.id ||
    idol.key ||
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

export function resolveRecordIdolDisplayName(
  record,
  stage,
  member,
  side = "my",
  idolSources = getDefaultIdolSources()
) {
  const prefix = `s${stage}_${side}${member}`;
  return resolveIdolDisplayName(
    {
      idol_db_id: record[`${prefix}_idol_db_id`],
      idolDbId: record[`${prefix}_idol_db_id`],
      id: record[`${prefix}_idol_id`],
      key: record[`${prefix}_idol_id`],
      idol: record[`${prefix}_idol`],
      name: record[`${prefix}_idol_name`] || record[`${prefix}_idol`],
      displayName: record[`${prefix}_idol`],
      idol_name: record[`${prefix}_idol_name`],
      idol_variant: record[`${prefix}_idol_variant`],
      variant: record[`${prefix}_idol_variant`],
      title: record[`${prefix}_idol_variant`],
      image: record[`${prefix}_idol_image`],
    },
    idolSources
  );
}
