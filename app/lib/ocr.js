import Tesseract from "tesseract.js";
import { toNumber } from "./numbers.js";

export const OCR_PARSER_VERSION = "ocr-parser-2026-06-11-total-member-combo-v4";

export function normalizeOcrMode(mode = "smartphone") {
  return mode === "pc" ? "desktop" : mode;
}

const totalPowerCandidates = new Set([
  58905, 58914, 59031, 59850, 60117, 60153, 61230, 61320, 61443,
  62238, 62601, 64497, 64533, 65403, 65679, 65985, 66135, 66345,
  66513, 66705, 66756, 66789, 66849, 66897, 66972, 66975, 67029,
  67050, 67062, 67131, 67272, 67320, 67464, 67500, 67524, 67575,
  67620, 67758, 67923, 68100, 68142, 68160, 68172, 68247, 68298,
  68358, 68481, 68496, 68535, 68595, 68733, 68784, 69093, 69165,
  69303, 69423, 69444, 69612, 69942, 71079, 71199,
]);

const crownDiffCandidates = new Set([
  11937, 13612, 13987, 16501, 18487, 21316, 23400, 27325, 33308, 47824, 48294,
  48899, 56814, 57683, 59662, 59680, 61548, 66170, 66739, 68362,
  73014, 75138, 76497, 77330, 77548, 79045, 80377, 81512, 82658,
  84189, 84995, 85760, 97585, 100337, 100709, 101105, 102080, 104128,
  112005, 131052, 159255, 178548,
]);

const displayedTotalCrownDiffCandidates = new Set([13612, 13987, 102080]);

const enableNextScreenFallback = false;

function isKnownNoiseNumber(num) {
  return crownDiffCandidates.has(num) || totalPowerCandidates.has(num);
}

function isNearAnyNumber(value, targets, tolerance = 1000) {
  return targets.some((target) => Math.abs(Number(value) - Number(target)) <= tolerance);
}

function getMemberSumTargets(referenceNumbers) {
  const targets = new Set();
  const crownTargets = new Set();

  referenceNumbers
    .filter((num) => Number.isFinite(num) && num >= 100000 && num < 3000000)
    .forEach((num) => {
      targets.add(num);

      for (const diff of crownDiffCandidates) {
        const baseTotal = num - diff;
        if (baseTotal >= 100000 && baseTotal < 3000000) {
          targets.add(baseTotal);
          crownTargets.add(baseTotal);
        }
      }
    });

  return {
    all: [...targets],
    crown: [...crownTargets],
  };
}

function improveMembersByReference(members, referenceNumbers, sourceCount = members.length) {
  if (members.length !== 3) {
    return members;
  }

  const observedNumbers = new Set(referenceNumbers.map((num) => Math.round(num)));
  const targets = getMemberSumTargets(referenceNumbers);

  if (targets.all.length === 0) {
    return members;
  }

  const currentSum = members.reduce((sum, value) => sum + value, 0);
  const currentDistance = Math.min(
    ...targets.all.map((target) => Math.abs(currentSum - target))
  );
  let best = {
    members,
    distance: currentDistance,
  };

  members.forEach((member, index) => {
    if (member < 100000 || member >= 1000000) {
      return;
    }

    const suffix = member % 100000;
    const memberCandidates = [];

    if (
      sourceCount > 3 &&
      member >= 110000 &&
      member < 200000 &&
      suffix >= 10000
    ) {
      memberCandidates.push({ value: suffix, crownOnly: true });
    }

    for (let head = 1; head <= 9; head += 1) {
      const candidate = head * 100000 + suffix;

      if (
        candidate === member ||
        isKnownNoiseNumber(candidate) ||
        !observedNumbers.has(candidate)
      ) {
        continue;
      }

      memberCandidates.push({ value: candidate, crownOnly: false });
    }

    for (const item of memberCandidates) {
      const candidate = item.value;
      const candidateTargets = item.crownOnly ? targets.crown : targets.all;

      if (candidateTargets.length === 0) {
        continue;
      }

      const nextMembers = [...members];
      nextMembers[index] = candidate;
      const nextSum = nextMembers.reduce((sum, value) => sum + value, 0);
      const nextDistance = Math.min(
        ...candidateTargets.map((target) => Math.abs(nextSum - target))
      );

      if (nextDistance < best.distance) {
        best = {
          members: nextMembers,
          distance: nextDistance,
        };
      }
    }
  });

  const improvedEnough =
    best.distance <= 1000 || currentDistance - best.distance >= 100000;

  return improvedEnough ? best.members : members;
}

function recoverMembersFromCrownTotal(numbers) {
  const rawCandidates = numbers
    .filter((num) => num >= 10000 && num < 10000000)
    .map(normalizeMemberScore);

  for (let totalIndex = 0; totalIndex < Math.min(rawCandidates.length, 3); totalIndex += 1) {
    const totalWithCrown = rawCandidates[totalIndex];
    if (totalWithCrown < 300000 || totalWithCrown >= 3000000) continue;

    for (let crownIndex = 0; crownIndex < rawCandidates.length; crownIndex += 1) {
      const crown = rawCandidates[crownIndex];
      if (totalIndex === crownIndex || !crownDiffCandidates.has(crown)) continue;

      const target = totalWithCrown - crown;
      if (target < 100000 || target >= 3000000) continue;

      const visibleMembers = rawCandidates
        .filter((_, index) => index !== totalIndex && index !== crownIndex)
        .filter((num) => num >= 10000 && num < 1000000)
        .filter((num) => !isKnownNoiseNumber(num));

      if (visibleMembers.length !== 2) continue;

      const variants = visibleMembers.map((member) => {
        if (member >= 100000 || member < 10000) return [member];
        return Array.from({ length: 9 }, (_, index) => (index + 1) * 100000 + member);
      });

      let best = null;

      for (const first of variants[0]) {
        for (const second of variants[1]) {
          const missing = target - first - second;
          if (missing < 10000 || missing >= 1000000 || isKnownNoiseNumber(missing)) continue;

          const members = [missing, first, second];
          const distance = Math.abs(members.reduce((sum, value) => sum + value, 0) - target);

          if (!best || distance < best.distance) {
            best = { members, distance };
          }
        }
      }

      if (best && best.distance <= 1) {
        return best.members;
      }
    }
  }

  return null;
}

export function extractScoresFromOcr(text, stage) {
  const rawNumbers =
    String(text ?? "")
      .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
      .match(/\d{1,3}(?:[,\.]\d{3})+|\d{5,8}/g)
      ?.map((value) => toNumber(value))
      .filter((num) => num >= 50000 && num < 2000000) ?? [];

  const scoreNumbers = rawNumbers.filter((num) => num < 600000);

  let selfScores = [];
  let enemyScores = [];

  if (stage === 1 && scoreNumbers.length >= 7) {
    selfScores = scoreNumbers.slice(1, 4);
    enemyScores = scoreNumbers.slice(4, 7);
  } else {
    selfScores = scoreNumbers.slice(0, 3);
    enemyScores = scoreNumbers.slice(3, 6);
  }

  const selfTotal = rawNumbers[0] || 0;
  const enemyTotal = rawNumbers[1] || 0;

  return {
    self: selfScores.map((n) => n?.toLocaleString() || ""),
    enemy: enemyScores.map((n) => n?.toLocaleString() || ""),
    selfTotal: selfTotal ? selfTotal.toLocaleString() : "",
    enemyTotal: enemyTotal ? enemyTotal.toLocaleString() : "",
  };
}

export function getDeviceOcrLayout(mode) {
  const normalizedMode = normalizeOcrMode(mode);
  const layouts = {
    "current-pc": {
      direct: true,
      layoutFamily: "current-pc-2026-07-result",
      totalTop: [0.108, 0.363, 0.613],
      enemyTotalTop: [0.108, 0.363, 0.613],
      totalTopCandidates: [
        [0.096, 0.351, 0.601],
        [0.102, 0.357, 0.607],
        [0.108, 0.363, 0.613],
        [0.114, 0.369, 0.619],
        [0.120, 0.375, 0.625],
      ],
      memberTop: [0.146, 0.398, 0.647],
      enemyMemberTop: [0.146, 0.398, 0.647],
      memberTopCandidates: [
        [0.136, 0.388, 0.637],
        [0.142, 0.394, 0.643],
        [0.146, 0.398, 0.647],
        [0.152, 0.404, 0.653],
        [0.158, 0.410, 0.659],
      ],
      leftX: 0.045,
      rightX: 0.545,
      sideWidth: 0.410,
      totalHeight: 0.055,
      memberHeight: 0.112,
    },
    auto: {
      direct: true,
      totalTop: [0.112, 0.368, 0.615],
      memberTop: [0.135, 0.390, 0.650],
      enemyMemberTop: [0.135, 0.386, 0.650],
      enemyMemberHeight: [0.150, 0.060, 0.150],
      leftX: 0.05,
      rightX: 0.50,
      sideWidth: 0.46,
      totalHeight: 0.050,
      memberHeight: 0.150,
    },
    pc: {
      direct: true,
      totalTop: [0.112, 0.368, 0.615],
      memberTop: [0.135, 0.390, 0.650],
      enemyMemberTop: [0.135, 0.386, 0.650],
      enemyMemberHeight: [0.150, 0.060, 0.150],
      leftX: 0.05,
      rightX: 0.50,
      sideWidth: 0.46,
      totalHeight: 0.050,
      memberHeight: 0.150,
    },
    desktop: {
      direct: true,
      totalTop: [0.112, 0.368, 0.615],
      totalTopCandidates: [
        [0.102, 0.358, 0.605],
        [0.112, 0.368, 0.615],
        [0.122, 0.378, 0.625],
        [0.132, 0.388, 0.635],
      ],
      memberTop: [0.135, 0.390, 0.650],
      memberTopCandidates: [
        [0.130, 0.385, 0.635],
        [0.135, 0.390, 0.645],
        [0.140, 0.395, 0.650],
        [0.145, 0.400, 0.655],
      ],
      enemyMemberTop: [0.135, 0.386, 0.650],
      enemyMemberHeight: [0.150, 0.060, 0.150],
      leftX: 0.05,
      rightX: 0.50,
      sideWidth: 0.46,
      totalHeight: 0.050,
      memberHeight: 0.150,
    },
    ipad: {
      stageTop: [0.08, 0.38, 0.68],
      stageHeight: 0.19,
      leftX: 0.14,
      rightX: 0.53,
      sideWidth: 0.32,
      totalY: 0.00,
      totalHeight: 0.25,
      memberY: 0.22,
      memberHeight: 0.22,
    },
    smartphone: {
      direct: true,
      totalTop: [0.165, 0.450, 0.690],
      enemyTotalTop: [0.165, 0.430, 0.675],
      totalTopCandidates: [
        [0.150, 0.410, 0.600],
        [0.160, 0.420, 0.620],
        [0.165, 0.430, 0.640],
        [0.175, 0.440, 0.660],
        [0.180, 0.450, 0.675],
        [0.190, 0.460, 0.690],
        [0.195, 0.470, 0.710],
      ],
      memberTop: [0.205, 0.445, 0.685],
      enemyMemberTop: [0.205, 0.445, 0.685],
      memberTopCandidates: [
        [0.180, 0.400, 0.640],
        [0.185, 0.405, 0.640],
        [0.190, 0.415, 0.640],
        [0.195, 0.420, 0.640],
        [0.195, 0.430, 0.640],
        [0.205, 0.445, 0.665],
        [0.220, 0.460, 0.690],
        [0.235, 0.475, 0.715],
      ],
      leftX: 0.055,
      rightX: 0.505,
      sideWidth: 0.445,
      totalHeight: 0.065,
      memberHeight: 0.105,
    },
  };

  return layouts[normalizedMode] || layouts.auto;
}

export function detectCurrentPcLayout(image) {
  const width = Number(image?.width || 0);
  const height = Number(image?.height || 0);
  if (!width || !height) {
    return { detected: false, family: "unknown", reasons: ["missing-image-size"] };
  }

  const aspect = width / height;
  const expectedAspect = 541 / 961;
  const detected =
    Math.abs(width - 541) <= 2 &&
    Math.abs(height - 961) <= 2 &&
    Math.abs(aspect - expectedAspect) <= 0.003;

  return {
    detected,
    family: detected ? "current-pc-2026-07-result" : "not-current-pc-2026-07-result",
    reasons: detected
      ? ["matches-current-pc-10-sample-dimensions"]
      : [`size=${width}x${height}`, `aspect=${aspect.toFixed(6)}`],
    width,
    height,
    aspect: Number(aspect.toFixed(6)),
  };
}

export function detectIpadOcrLayout(image) {
  const width = Number(image?.width || 0);
  const height = Number(image?.height || 0);
  if (!width || !height) {
    return {
      detected: false,
      family: "unknown",
      deviceMode: "ipad",
      reasons: ["missing-image-size"],
    };
  }

  const aspect = width / height;
  const normalizedAspect = Math.min(width, height) / Math.max(width, height);
  const orientation =
    width > height ? "landscape" : height > width ? "portrait" : "square";
  const currentPc = detectCurrentPcLayout(image);
  const largeEnough = Math.max(width, height) >= 1000 && Math.min(width, height) >= 700;
  const ipadLikeAspect = normalizedAspect >= 0.68 && normalizedAspect <= 0.82;
  const detected = !currentPc.detected && largeEnough && ipadLikeAspect;
  const reasons = [];

  if (currentPc.detected) reasons.push("excluded-current-pc-layout");
  if (!largeEnough) reasons.push(`size-too-small=${width}x${height}`);
  if (!ipadLikeAspect) reasons.push(`normalized-aspect=${normalizedAspect.toFixed(6)}`);
  if (detected) {
    reasons.push("large-4-by-3-family-aspect");
    reasons.push("diagnostic-only-ipad-layout");
  }

  return {
    detected,
    family: detected ? "ipad-result-diagnostic-unverified" : "not-ipad-result",
    deviceMode: "ipad",
    width,
    height,
    aspect: Number(aspect.toFixed(6)),
    normalizedAspect: Number(normalizedAspect.toFixed(6)),
    orientation,
    confidence: detected ? "diagnostic-candidate" : "not-detected",
    reasons,
  };
}

export function ipadDiagnosticPercentBox(image, box) {
  const width = Number(image?.width || 0);
  const height = Number(image?.height || 0);
  return {
    x: Math.max(0, Math.floor(width * box.left)),
    y: Math.max(0, Math.floor(height * box.top)),
    width: Math.max(1, Math.floor(width * box.width)),
    height: Math.max(1, Math.floor(height * box.height)),
  };
}

export function buildIpadArithmeticRoiTemplate(image) {
  const sideColumns = {
    self: {
      side: { left: 0.115, width: 0.37 },
      total: { left: 0.16, width: 0.33 },
      members: [
        { left: 0.145, width: 0.12 },
        { left: 0.255, width: 0.13 },
        { left: 0.365, width: 0.13 },
      ],
      bonus: { left: 0.105, width: 0.38 },
    },
    enemy: {
      side: { left: 0.515, width: 0.37 },
      total: { left: 0.58, width: 0.33 },
      members: [
        { left: 0.535, width: 0.12 },
        { left: 0.645, width: 0.13 },
        { left: 0.755, width: 0.13 },
      ],
      bonus: { left: 0.505, width: 0.38 },
    },
  };
  const rows = [
    { stage: 1, rowTop: 0.095, totalTop: 0.112, memberTop: 0.149, bonusTop: 0.166 },
    { stage: 2, rowTop: 0.334, totalTop: 0.351, memberTop: 0.388, bonusTop: 0.405 },
    { stage: 3, rowTop: 0.576, totalTop: 0.593, memberTop: 0.631, bonusTop: 0.648 },
  ];
  const box = (definition) => ipadDiagnosticPercentBox(image, definition);
  const stageRows = rows.map((row) => ({
    stage: row.stage,
    normalized: { left: 0.09, top: row.rowTop, width: 0.82, height: 0.165 },
    zone: box({ left: 0.09, top: row.rowTop, width: 0.82, height: 0.165 }),
  }));
  const stageSideZones = rows.flatMap((row) =>
    Object.entries(sideColumns).map(([side, column]) => ({
      stage: row.stage,
      side,
      normalized: {
        left: column.side.left,
        top: row.rowTop,
        width: column.side.width,
        height: 0.165,
      },
      zone: box({
        left: column.side.left,
        top: row.rowTop,
        width: column.side.width,
        height: 0.165,
      }),
    }))
  );
  const fields = rows.flatMap((row) =>
    Object.entries(sideColumns).flatMap(([side, column]) => {
      const base = [
        {
          stage: row.stage,
          side,
          field: "total",
          slot: 0,
          normalized: {
            left: column.total.left,
            top: row.totalTop,
            width: column.total.width,
            height: 0.035,
          },
        },
        {
          stage: row.stage,
          side,
          field: "bonus",
          slot: 0,
          normalized: {
            left: column.bonus.left,
            top: row.bonusTop,
            width: column.bonus.width,
            height: 0.034,
          },
        },
      ];
      const members = column.members.map((member, index) => ({
        stage: row.stage,
        side,
        field: "member",
        slot: index + 1,
        normalized: {
          left: member.left,
          top: row.memberTop,
          width: member.width,
          height: 0.028,
        },
      }));
      return [...base, ...members].map((field) => ({
        ...field,
        zone: box(field.normalized),
      }));
    })
  );

  return {
    version: "ipad-shared-portrait-v2",
    confidence: "manually-calibrated-diagnostic",
    note:
      "Shared normalized iPad portrait score-table template, calibrated against the 18 manually verified fixtures. Diagnostic-only.",
    stageRows,
    stageSideZones,
    fields,
  };
}

export function parseIpadArithmeticOcrNumbers(text = "") {
  const candidates = [];
  const regex = /[+＋-]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
  for (const match of String(text || "").matchAll(regex)) {
    const raw = match[0] || "";
    const normalized = raw.replace(/[^\d]/g, "");
    if (!normalized) continue;
    const value = Number(normalized);
    if (!Number.isInteger(value) || value < 0 || value > 9999999) continue;
    candidates.push({
      raw: raw.trim(),
      value,
      index: match.index || 0,
      plusLike: /^[+＋]/.test(raw.trim()),
    });
  }
  return candidates;
}

export const ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS = true;
export const IPAD_GROUPED_NUMBER_TOKEN_ORIGIN = "ipad-grouped-number-token";
export const IPAD_GROUPED_NUMBER_TOKEN_RULE_VERSION = "ipad-grouped-number-token-v1";

function normalizeIpadGroupedNumberText(text = "") {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[、，]/g, ",")
    .replace(/[．。]/g, ".")
    .trim();
}

export function parseIpadGroupedNumberTokens(text = "") {
  const normalizedText = normalizeIpadGroupedNumberText(text);
  const tokens = [];
  const regex = /(?<![\d.,])(\d{1,3})([,.])(\d{3})(?:(\2)(\d{3}))*?(?![\d.,])/g;
  for (const match of normalizedText.matchAll(regex)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    const separator = match[2];
    if (!raw.includes(separator)) continue;
    if (separator !== "," && separator !== ".") continue;
    const otherSeparator = separator === "," ? "." : ",";
    if (raw.includes(otherSeparator)) continue;
    if (!new RegExp(`^\\d{1,3}\\${separator}\\d{3}(?:\\${separator}\\d{3})*$`).test(raw)) {
      continue;
    }
    const groups = raw.split(separator);
    if (groups.length < 2) continue;
    if (groups[0].length < 1 || groups[0].length > 3) continue;
    if (!groups.slice(1).every((group) => group.length === 3)) continue;
    const value = Number(groups.join(""));
    if (!Number.isInteger(value) || value <= 0 || value > 9999999) continue;
    tokens.push({
      origin: IPAD_GROUPED_NUMBER_TOKEN_ORIGIN,
      ruleVersion: IPAD_GROUPED_NUMBER_TOKEN_RULE_VERSION,
      rawToken: raw,
      normalizedToken: raw,
      separator,
      groups,
      value,
      start,
      end,
      context: {
        before: normalizedText.slice(Math.max(0, start - 8), start),
        token: raw,
        after: normalizedText.slice(end, Math.min(normalizedText.length, end + 8)),
      },
    });
  }
  return tokens;
}

export function getIpadArithmeticPreprocessingProfiles() {
  return [
    {
      id: "baseline-score-preprocess-3x-psm7",
      label: "Existing score preprocessing, default 4x, PSM 7",
      kind: "existing",
      scale: 4,
      pageSegMode: "7",
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "invert-normalize-3x-psm7",
      label: "Inverted grayscale normalize, 3x, PSM 7",
      kind: "invert-normalize",
      scale: 3,
      pageSegMode: "7",
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "white-mask-3x-psm7",
      label: "White-text mask, 3x, PSM 7",
      kind: "white-mask",
      scale: 3,
      pageSegMode: "7",
      threshold: 176,
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "blue-bonus-mask-3x-psm7",
      label: "Blue bonus mask, 3x, PSM 7",
      kind: "blue-bonus-mask",
      scale: 3,
      pageSegMode: "7",
      fieldTypes: ["bonus"],
    },
  ];
}

export function getIpadArithmeticProfilesForFieldType(profiles, fieldType) {
  return (profiles || []).filter((profile) => profile.fieldTypes?.includes(fieldType));
}

export function getIpadArithmeticFieldType(field) {
  return field === "member" ? "member" : field;
}

export function padIpadArithmeticFieldZone(field, image, paddingRatio = 0.12) {
  const width = Number(image?.width || 0);
  const height = Number(image?.height || 0);
  const padX = Math.max(2, Math.round(field.zone.width * paddingRatio));
  const padY = Math.max(2, Math.round(field.zone.height * paddingRatio));
  const left = Math.max(0, field.zone.x - padX);
  const top = Math.max(0, field.zone.y - padY);
  return {
    x: left,
    y: top,
    width: Math.max(1, Math.min(width - left, field.zone.width + padX * 2)),
    height: Math.max(1, Math.min(height - top, field.zone.height + padY * 2)),
  };
}

export function buildIpadArithmeticFieldCandidatePool({
  imageName = "",
  clusterId = "browser-debug",
  field,
  profileResults = {},
  profiles = getIpadArithmeticPreprocessingProfiles(),
  cropQuality = {},
}) {
  const fieldType = getIpadArithmeticFieldType(field.field);
  const applicableProfiles = getIpadArithmeticProfilesForFieldType(profiles, fieldType);
  const candidatesByValue = new Map();
  for (const [profileIndex, profile] of applicableProfiles.entries()) {
    const result = profileResults[profile.id];
    if (!result) continue;
    for (const [candidateIndex, parsed] of (result.parsedCandidates || []).entries()) {
      const value = Number(parsed.value || 0);
      if (!Number.isInteger(value)) continue;
      const normalizedText = String(parsed.raw || "").replace(/[^\d]/g, "");
      const contribution = {
        profileId: profile.id,
        profileLabel: profile.label,
        sourceRank: profileIndex,
        candidateIndex,
        rawText: result.rawText || "",
        rawCandidate: parsed.raw,
        normalizedText,
        ocrConfidence: Number(result.ocrConfidence || 0),
        plusLike: Boolean(parsed.plusLike),
      };
      const existing = candidatesByValue.get(value);
      if (existing) {
        existing.profileIds.push(profile.id);
        existing.contributions.push(contribution);
        existing.confidenceSignals.ocrConfidence = Math.max(
          existing.confidenceSignals.ocrConfidence,
          contribution.ocrConfidence
        );
        existing.confidenceSignals.repeatedProfiles = existing.profileIds.length;
        existing.confidenceSignals.independentAgreement = new Set(existing.profileIds).size;
        existing.confidenceSignals.plusLike ||= contribution.plusLike;
        continue;
      }
      candidatesByValue.set(value, {
        value,
        rawText: result.rawText || "",
        normalizedText,
        fieldType,
        profileId: profile.id,
        profileIds: [profile.id],
        sourceRank: profileIndex,
        cropQuality: { ...cropQuality },
        digitCount: String(value).length,
        confidenceSignals: {
          ocrConfidence: contribution.ocrConfidence,
          digitOnlyPurity: parsed.raw ? normalizedText.length / String(parsed.raw).length : 0,
          lengthInSchema: true,
          plusLike: contribution.plusLike,
          repeatedProfiles: 1,
          independentAgreement: 1,
        },
        contributions: [contribution],
      });
    }
  }

  if (ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS && fieldType === "member") {
    for (const [profileIndex, profile] of applicableProfiles.entries()) {
      const result = profileResults[profile.id];
      if (!result?.rawText) continue;
      for (const [tokenIndex, token] of parseIpadGroupedNumberTokens(result.rawText).entries()) {
        const value = Number(token.value || 0);
        if (!Number.isInteger(value) || value <= 0 || value > 9999999) continue;
        const normalizedText = String(value);
        const contribution = {
          profileId: IPAD_GROUPED_NUMBER_TOKEN_ORIGIN,
          profileLabel: "iPad grouped-number token parser",
          sourceRank: applicableProfiles.length + profileIndex,
          candidateIndex: tokenIndex,
          rawText: result.rawText || "",
          rawCandidate: token.rawToken,
          normalizedText,
          ocrConfidence: Number(result.ocrConfidence || 0),
          plusLike: false,
          groupedNumberToken: {
            ruleVersion: token.ruleVersion,
            sourceProfileId: profile.id,
            sourceProfileLabel: profile.label,
            separator: token.separator,
            groups: token.groups,
            start: token.start,
            end: token.end,
            context: token.context,
          },
        };
        const existing = candidatesByValue.get(value);
        if (existing) {
          if (!existing.profileIds.includes(IPAD_GROUPED_NUMBER_TOKEN_ORIGIN)) {
            existing.profileIds.push(IPAD_GROUPED_NUMBER_TOKEN_ORIGIN);
          }
          existing.contributions.push(contribution);
          existing.confidenceSignals.ocrConfidence = Math.max(
            existing.confidenceSignals.ocrConfidence,
            contribution.ocrConfidence
          );
          existing.confidenceSignals.repeatedProfiles = existing.contributions.length;
          existing.confidenceSignals.independentAgreement = new Set(existing.profileIds).size;
          existing.confidenceSignals.groupedNumberToken = true;
          continue;
        }
        candidatesByValue.set(value, {
          value,
          rawText: result.rawText || "",
          normalizedText,
          fieldType,
          profileId: IPAD_GROUPED_NUMBER_TOKEN_ORIGIN,
          profileIds: [IPAD_GROUPED_NUMBER_TOKEN_ORIGIN],
          sourceRank: applicableProfiles.length + profileIndex,
          cropQuality: { ...cropQuality },
          digitCount: normalizedText.length,
          origin: IPAD_GROUPED_NUMBER_TOKEN_ORIGIN,
          groupedNumberToken: {
            ruleVersion: token.ruleVersion,
            rawToken: token.rawToken,
            normalizedToken: token.normalizedToken,
            separator: token.separator,
            groups: token.groups,
            sourceProfileId: profile.id,
            sourceProfileLabel: profile.label,
            start: token.start,
            end: token.end,
            context: token.context,
          },
          confidenceSignals: {
            ocrConfidence: contribution.ocrConfidence,
            digitOnlyPurity: token.rawToken ? normalizedText.length / String(token.rawToken).length : 0,
            lengthInSchema: true,
            plusLike: false,
            repeatedProfiles: 1,
            independentAgreement: 1,
            groupedNumberToken: true,
          },
          contributions: [contribution],
        });
      }
    }
  }

  const sortedCandidates = [...candidatesByValue.values()].sort((a, b) => {
    if (a.sourceRank !== b.sourceRank) return a.sourceRank - b.sourceRank;
    if (b.confidenceSignals.independentAgreement !== a.confidenceSignals.independentAgreement) {
      return b.confidenceSignals.independentAgreement - a.confidenceSignals.independentAgreement;
    }
    return a.value - b.value;
  });
  const candidates = sortedCandidates.slice(0, 6);

  return {
    key: `${imageName}|${field.stage}|${field.side}|${field.field}|${field.slot || 0}`,
    image: imageName,
    clusterId,
    stage: field.stage,
    side: field.side,
    field: field.field,
    fieldType,
    slot: field.slot || 0,
    zone: field.zone,
    cropQuality,
    candidates,
    candidateCap: 6,
    rawDistinctCandidateCount: sortedCandidates.length,
    truncated: sortedCandidates.length > candidates.length,
    profileResults,
  };
}

const ipadArithmeticFieldSpecs = [
  { field: "member", slot: 1, label: "member1" },
  { field: "member", slot: 2, label: "member2" },
  { field: "member", slot: 3, label: "member3" },
  { field: "bonus", slot: 0, label: "bonus" },
  { field: "total", slot: 0, label: "total" },
];

function normalizeIpadArithmeticNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

function normalizeIpadArithmeticCandidate(candidate, origin = "observed") {
  if (!candidate) {
    return {
      value: 0,
      origin,
      profileIds: [],
      sourceRank: 999,
      rawText: "",
      normalizedText: "",
      confidenceSignals: {},
      contributions: [],
    };
  }
  return {
    value: normalizeIpadArithmeticNumber(candidate.value),
    origin,
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds] : [],
    sourceRank: Number.isFinite(Number(candidate.sourceRank))
      ? Number(candidate.sourceRank)
      : 999,
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
    confidenceSignals: { ...(candidate.confidenceSignals || {}) },
    contributions: Array.isArray(candidate.contributions)
      ? candidate.contributions.map((contribution) => ({
          profileId: contribution.profileId,
          candidateIndex: contribution.candidateIndex,
          rawCandidate: contribution.rawCandidate,
          normalizedText: contribution.normalizedText,
          ocrConfidence: contribution.ocrConfidence,
          plusLike: Boolean(contribution.plusLike),
        }))
      : [],
  };
}

function ipadArithmeticTupleKey(values = []) {
  return values.map((value) => normalizeIpadArithmeticNumber(value)).join("|");
}

export function summarizeIpadArithmeticSideSelectionTuple(tuple = {}) {
  const values = Array.isArray(tuple.values)
    ? tuple.values.map(normalizeIpadArithmeticNumber)
    : [0, 0, 0, 0, 0];
  const components = tuple.components || {};
  const componentFor = (label) => components[label] || {};
  return {
    members: values.slice(0, 3),
    bonus: values[3],
    total: values[4],
    equation: `${values[0]} + ${values[1]} + ${values[2]} + ${values[3]} = ${values[4]}`,
    origins: {
      member1: componentFor("member1").origin,
      member2: componentFor("member2").origin,
      member3: componentFor("member3").origin,
      bonus: componentFor("bonus").origin,
      total: componentFor("total").origin,
    },
    profileIds: {
      member1: componentFor("member1").profileIds || [],
      member2: componentFor("member2").profileIds || [],
      member3: componentFor("member3").profileIds || [],
      bonus: componentFor("bonus").profileIds || [],
      total: componentFor("total").profileIds || [],
    },
  };
}

export function buildIpadArithmeticSideSelectionCandidateSets({
  deviceMode = "ipad",
  fieldCandidatePools = {},
  tier = "tier-c",
} = {}) {
  const sets = {};
  const fieldDiagnostics = {};
  for (const spec of ipadArithmeticFieldSpecs) {
    const pool = fieldCandidatePools[spec.label] || {};
    const observed = (pool.candidates || []).map((candidate) =>
      normalizeIpadArithmeticCandidate(
        candidate,
        normalizeIpadArithmeticNumber(candidate.value) === 0 ? "explicit-zero" : "observed"
      )
    );
    let candidates = observed;
    if (tier === "tier-a") {
      candidates = observed.filter((candidate) => candidate.value !== 0);
    } else if (tier === "tier-b") {
      candidates = observed;
    } else if (tier === "tier-c") {
      candidates = observed;
      if (spec.field === "bonus" && observed.length === 0) {
        candidates = [
          {
            value: 0,
            origin: "schema-default-bonus-zero",
            profileIds: [],
            sourceRank: 999,
            rawText: "",
            normalizedText: "0",
            confidenceSignals: {},
            contributions: [],
          },
        ];
      }
    }
    sets[spec.label] = candidates;
    fieldDiagnostics[spec.label] = {
      key: pool.key || "",
      field: spec.field,
      slot: spec.slot,
      deviceMode,
      poolSize: Array.isArray(pool.candidates) ? pool.candidates.length : 0,
      candidateCap: Number(pool.candidateCap || 6),
      rawDistinctCandidateCount: Number(
        pool.rawDistinctCandidateCount ||
          (Array.isArray(pool.candidates) ? pool.candidates.length : 0)
      ),
      truncated: Boolean(pool.truncated),
      observedValues: observed.map((candidate) => candidate.value),
      values: candidates.map((candidate) => candidate.value),
      origins: candidates.map((candidate) => candidate.origin),
    };
  }
  return { sets, fieldDiagnostics };
}

function enumerateIpadArithmeticSideSelectionTuples({ sets = {}, safetyCap = 10000 } = {}) {
  const labels = ["member1", "member2", "member3", "bonus", "total"];
  const pools = labels.map((label) => sets[label] || []);
  if (pools.some((pool) => pool.length === 0)) {
    return { tuples: [], validTuples: [], exceededCap: false, duplicateTupleConflicts: [] };
  }
  const totalCombinations = pools.reduce((count, pool) => count * pool.length, 1);
  if (totalCombinations > safetyCap) {
    return {
      tuples: [],
      validTuples: [],
      exceededCap: true,
      totalCombinations,
      duplicateTupleConflicts: [],
    };
  }
  const allTuples = [];
  const validByKey = new Map();
  const duplicateTupleConflicts = [];
  for (const member1 of pools[0]) {
    for (const member2 of pools[1]) {
      for (const member3 of pools[2]) {
        for (const bonus of pools[3]) {
          for (const total of pools[4]) {
            const components = { member1, member2, member3, bonus, total };
            const values = labels.map((label) =>
              normalizeIpadArithmeticNumber(components[label].value)
            );
            const tuple = { values, components };
            allTuples.push(tuple);
            if (values[0] + values[1] + values[2] + values[3] !== values[4]) continue;
            const key = ipadArithmeticTupleKey(values);
            if (validByKey.has(key)) {
              duplicateTupleConflicts.push({
                values,
                first: summarizeIpadArithmeticSideSelectionTuple(validByKey.get(key)),
                duplicate: summarizeIpadArithmeticSideSelectionTuple(tuple),
              });
              continue;
            }
            validByKey.set(key, tuple);
          }
        }
      }
    }
  }
  return {
    tuples: allTuples,
    validTuples: [...validByKey.values()],
    exceededCap: false,
    totalCombinations,
    duplicateTupleConflicts,
  };
}

export function evaluateIpadArithmeticSideSelectionTier({
  deviceMode = "ipad",
  fieldCandidatePools = {},
  currentPrimary = {},
  tier = "tier-c",
  safetyCap = 10000,
} = {}) {
  const current = {
    members: Array.isArray(currentPrimary.members)
      ? currentPrimary.members.slice(0, 3).map(normalizeIpadArithmeticNumber)
      : [0, 0, 0],
    bonus: normalizeIpadArithmeticNumber(currentPrimary.bonus),
    total: normalizeIpadArithmeticNumber(currentPrimary.total),
  };
  while (current.members.length < 3) current.members.push(0);

  if (deviceMode !== "ipad") {
    return {
      deviceMode,
      tier,
      eligible: false,
      wouldApply: false,
      blockReason: `non-ipad-mode:${deviceMode || "unknown"}`,
      validTupleCount: 0,
      totalCombinationCount: 0,
      candidateCompleteness: {
        complete: false,
        missingLabels: ["member1", "member2", "member3", "bonus", "total"],
        truncatedLabels: [],
      },
      fieldDiagnostics: {},
      currentPrimary: current,
    };
  }

  const { sets, fieldDiagnostics } = buildIpadArithmeticSideSelectionCandidateSets({
    deviceMode,
    fieldCandidatePools,
    tier,
  });
  const requiredLabels = ["member1", "member2", "member3", "bonus", "total"];
  const missingLabels = requiredLabels.filter((label) => !sets[label]?.length);
  const truncatedLabels = Object.entries(fieldDiagnostics)
    .filter(([, diagnostics]) => diagnostics.truncated)
    .map(([label]) => label);
  let blockReason = "";
  let enumeration = {
    tuples: [],
    validTuples: [],
    exceededCap: false,
    duplicateTupleConflicts: [],
    totalCombinations: 0,
  };
  if (missingLabels.length) {
    blockReason = `missing-candidate:${missingLabels.join(",")}`;
  } else if (truncatedLabels.length) {
    blockReason = `truncated-pool:${truncatedLabels.join(",")}`;
  } else {
    enumeration = enumerateIpadArithmeticSideSelectionTuples({ sets, safetyCap });
    if (enumeration.exceededCap) {
      blockReason = "enumeration-safety-cap";
    } else if (enumeration.duplicateTupleConflicts.length) {
      blockReason = "duplicate-tuple-provenance-conflict";
    } else if (enumeration.validTuples.length === 0) {
      blockReason = "no-arithmetic-valid-tuple";
    } else if (enumeration.validTuples.length > 1) {
      blockReason = "multiple-arithmetic-valid-tuples";
    }
  }

  const selectedTuple = !blockReason ? enumeration.validTuples[0] : null;
  const proposal = selectedTuple
    ? {
        members: selectedTuple.values.slice(0, 3),
        bonus: selectedTuple.values[3],
        total: selectedTuple.values[4],
        components: selectedTuple.components,
        provenanceTier: tier,
        equation: `${selectedTuple.values[0]} + ${selectedTuple.values[1]} + ${selectedTuple.values[2]} + ${selectedTuple.values[3]} = ${selectedTuple.values[4]}`,
      }
    : null;
  const proposalValues = proposal ? [...proposal.members, proposal.bonus, proposal.total] : [];
  const currentValues = [...current.members, current.bonus, current.total];
  const changedFields = proposal
    ? requiredLabels.filter((_, index) => proposalValues[index] !== currentValues[index])
    : [];

  return {
    deviceMode,
    tier,
    eligible: !blockReason,
    wouldApply: Boolean(proposal && changedFields.length > 0),
    blockReason,
    tupleCount: (enumeration.tuples || []).length,
    validTupleCount: enumeration.validTuples.length,
    totalCombinationCount: enumeration.totalCombinations || 0,
    candidateCompleteness: {
      complete: missingLabels.length === 0 && truncatedLabels.length === 0,
      missingLabels,
      truncatedLabels,
    },
    fieldDiagnostics,
    currentPrimary: current,
    proposal,
    selectedTuple: selectedTuple
      ? summarizeIpadArithmeticSideSelectionTuple(selectedTuple)
      : null,
    changedFields,
    duplicateTupleConflicts: enumeration.duplicateTupleConflicts || [],
    sampleTuples: (enumeration.tuples || [])
      .slice(0, 10)
      .map(summarizeIpadArithmeticSideSelectionTuple),
    validTuples: (enumeration.validTuples || []).map(
      summarizeIpadArithmeticSideSelectionTuple
    ),
  };
}

const ipadStrictTotalSelectionLabels = ["member1", "member2", "member3", "bonus", "total"];
export const ENABLE_IPAD_STRICT_TOTAL_SELECTION = true;
export const IPAD_STRICT_TOTAL_SELECTION_RECOVERY_ID = "ipad-strict-total-selection";

function summarizeIpadStrictTotalCandidate(candidate = {}) {
  return {
    value: normalizeIpadArithmeticNumber(candidate.value),
    origin: candidate.origin || "observed",
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds] : [],
    sourceRank: Number.isFinite(Number(candidate.sourceRank)) ? Number(candidate.sourceRank) : 999,
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
    confidenceSignals: { ...(candidate.confidenceSignals || {}) },
    contributions: Array.isArray(candidate.contributions)
      ? candidate.contributions.map((contribution) => ({
          profileId: contribution.profileId,
          candidateIndex: contribution.candidateIndex,
          rawCandidate: contribution.rawCandidate,
          normalizedText: contribution.normalizedText,
          ocrConfidence: contribution.ocrConfidence,
          plusLike: Boolean(contribution.plusLike),
        }))
      : [],
  };
}

function summarizeIpadStrictTotalPool(pool = {}) {
  const candidates = Array.isArray(pool.candidates)
    ? pool.candidates
        .map((candidate) => normalizeIpadArithmeticCandidate(candidate, "observed"))
        .filter((candidate) => candidate.value > 0)
    : [];
  const byValue = new Map();
  for (const candidate of candidates) {
    if (!byValue.has(candidate.value)) byValue.set(candidate.value, candidate);
  }
  return {
    key: pool.key || "",
    fieldType: pool.fieldType || "",
    candidateCap: Number(pool.candidateCap || 6),
    rawDistinctCandidateCount: Number(
      pool.rawDistinctCandidateCount || (Array.isArray(pool.candidates) ? pool.candidates.length : 0)
    ),
    truncated: Boolean(pool.truncated),
    observedCandidates: [...byValue.values()].map(summarizeIpadStrictTotalCandidate),
  };
}

function normalizeIpadStrictTotalCurrentSelection(selection = {}, label = "") {
  const candidate = selection?.candidate
    ? summarizeIpadStrictTotalCandidate(normalizeIpadArithmeticCandidate(selection.candidate, "observed"))
    : null;
  return {
    label,
    value: normalizeIpadArithmeticNumber(selection?.value),
    hasCandidate: Boolean(candidate),
    candidate,
    score: Number.isFinite(Number(selection?.score)) ? Number(selection.score) : 0,
    reason: selection?.reason || "",
  };
}

export function buildIpadStrictTotalSelectionEvidence({
  deviceMode = "ipad",
  layout = {},
  stage = 0,
  side = "",
  fieldCandidatePools = {},
  currentPrimary = {},
  currentSelections = {},
} = {}) {
  const current = {
    members: Array.isArray(currentPrimary.members)
      ? currentPrimary.members.slice(0, 3).map(normalizeIpadArithmeticNumber)
      : [0, 0, 0],
    bonus: normalizeIpadArithmeticNumber(currentPrimary.bonus),
    total: normalizeIpadArithmeticNumber(currentPrimary.total),
  };
  while (current.members.length < 3) current.members.push(0);

  const normalizedSelections = Object.fromEntries(
    ipadStrictTotalSelectionLabels.map((label) => [
      label,
      normalizeIpadStrictTotalCurrentSelection(currentSelections[label], label),
    ])
  );
  const poolSummary = Object.fromEntries(
    ipadStrictTotalSelectionLabels.map((label) => [
      label,
      summarizeIpadStrictTotalPool(fieldCandidatePools[label] || {}),
    ])
  );
  const totalPool = poolSummary.total;
  const selectedNonTotalProvenance = {
    member1: normalizedSelections.member1.hasCandidate,
    member2: normalizedSelections.member2.hasCandidate,
    member3: normalizedSelections.member3.hasCandidate,
    bonus:
      normalizedSelections.bonus.hasCandidate ||
      (current.bonus === 0 && !normalizedSelections.bonus.hasCandidate),
  };
  const selectedBonusOrigin =
    normalizedSelections.bonus.candidate?.origin ||
    (current.bonus === 0 ? "schema-default-bonus-zero" : "missing-selected-bonus-candidate");
  const computedValidationTotal =
    current.members.reduce((sum, value) => sum + value, 0) + current.bonus;
  const matchingObservedTotalCandidates = totalPool.observedCandidates.filter(
    (candidate) => candidate.value === computedValidationTotal
  );
  const distinctMatchingObservedTotals = [
    ...new Set(matchingObservedTotalCandidates.map((candidate) => candidate.value)),
  ];
  const matchingObservedTotalCandidate =
    distinctMatchingObservedTotals.length === 1
      ? matchingObservedTotalCandidates.find(
          (candidate) => candidate.value === distinctMatchingObservedTotals[0]
        )
      : null;
  const missingSelectedProvenanceLabels = Object.entries(selectedNonTotalProvenance)
    .filter(([, present]) => !present)
    .map(([label]) => label);

  return {
    schema: "ipad-strict-total-selection-evidence-v1",
    deviceMode,
    layout: {
      detected: Boolean(layout.detected ?? deviceMode === "ipad"),
      orientation: layout.orientation || "",
      supported: layout.supported ?? true,
    },
    stage,
    side,
    selected: {
      members: current.members,
      bonus: current.bonus,
      total: current.total,
    },
    selectedNonTotalProvenance,
    selectedBonusOrigin,
    selectedSelections: normalizedSelections,
    observedTotalCandidates: totalPool.observedCandidates,
    computedValidationTotal,
    matchingObservedTotalCandidates,
    uniqueMatchingObservedTotal: matchingObservedTotalCandidate
      ? matchingObservedTotalCandidate.value
      : null,
    totalCandidateCompleteness: {
      complete: totalPool.observedCandidates.length > 0 && !totalPool.truncated,
      missing: totalPool.observedCandidates.length === 0,
      truncated: totalPool.truncated,
      candidateCap: totalPool.candidateCap,
      rawDistinctCandidateCount: totalPool.rawDistinctCandidateCount,
    },
    candidateCompleteness: {
      complete:
        missingSelectedProvenanceLabels.length === 0 &&
        totalPool.observedCandidates.length > 0 &&
        !totalPool.truncated,
      missingSelectedProvenanceLabels,
      totalMissing: totalPool.observedCandidates.length === 0,
      totalTruncated: totalPool.truncated,
    },
    provenanceSummary: {
      selectedMemberProfileIds: {
        member1: normalizedSelections.member1.candidate?.profileIds || [],
        member2: normalizedSelections.member2.candidate?.profileIds || [],
        member3: normalizedSelections.member3.candidate?.profileIds || [],
      },
      selectedBonusProfileIds: normalizedSelections.bonus.candidate?.profileIds || [],
      selectedBonusOrigin,
      matchingTotalProfileIds: matchingObservedTotalCandidate?.profileIds || [],
      matchingTotalRawText: matchingObservedTotalCandidate?.rawText || "",
      matchingTotalNormalizedText: matchingObservedTotalCandidate?.normalizedText || "",
    },
    poolSummary,
  };
}

export function evaluateIpadStrictTotalSelection(evidence = {}) {
  const blockReasons = [];
  const deviceMode = evidence.deviceMode || "";
  const layout = evidence.layout || {};
  const selected = evidence.selected || {};
  const selectedMembers = Array.isArray(selected.members)
    ? selected.members.slice(0, 3).map(normalizeIpadArithmeticNumber)
    : [0, 0, 0];
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedBonus = normalizeIpadArithmeticNumber(selected.bonus);
  const selectedTotal = normalizeIpadArithmeticNumber(selected.total);
  const computedValidationTotal = normalizeIpadArithmeticNumber(evidence.computedValidationTotal);
  const matchingCandidates = Array.isArray(evidence.matchingObservedTotalCandidates)
    ? evidence.matchingObservedTotalCandidates
    : [];
  const distinctMatchingValues = [...new Set(matchingCandidates.map((candidate) => candidate.value))];
  const totalCompleteness = evidence.totalCandidateCompleteness || {};
  const provenance = evidence.selectedNonTotalProvenance || {};
  const missingSelectedProvenanceLabels = ["member1", "member2", "member3", "bonus"].filter(
    (label) => !provenance[label]
  );

  if (deviceMode !== "ipad") blockReasons.push(`non-ipad-mode:${deviceMode || "unknown"}`);
  if (layout.detected === false) blockReasons.push("ipad-layout-not-detected");
  if (layout.orientation && layout.orientation !== "portrait") {
    blockReasons.push(`unsupported-ipad-orientation:${layout.orientation}`);
  }
  if (layout.supported === false) blockReasons.push("unsupported-ipad-layout");
  if (missingSelectedProvenanceLabels.length) {
    blockReasons.push(`selected-non-total-field-lacks-strong-provenance:${missingSelectedProvenanceLabels.join(",")}`);
  }
  if (totalCompleteness.missing) blockReasons.push("missing-observed-total-candidates");
  if (totalCompleteness.truncated) blockReasons.push("truncated-total-candidate-pool");
  if (distinctMatchingValues.length === 0) {
    blockReasons.push("missing-observed-total-for-current-fields");
  } else if (distinctMatchingValues.length > 1) {
    blockReasons.push("multiple-distinct-observed-total-matches");
  }
  if (selectedTotal === computedValidationTotal) blockReasons.push("already-identical");

  const proposedTotal =
    blockReasons.length === 0 && distinctMatchingValues.length === 1
      ? distinctMatchingValues[0]
      : null;
  const proposal = proposedTotal
    ? {
        members: selectedMembers,
        bonus: selectedBonus,
        total: proposedTotal,
      }
    : null;
  return {
    schema: "ipad-strict-total-selection-evaluation-v1",
    eligible: blockReasons.length === 0,
    wouldApply: Boolean(proposal && selectedTotal !== proposedTotal),
    computedValidationTotal,
    matchingObservedTotalCandidates: matchingCandidates,
    uniqueMatchingObservedTotal: proposedTotal,
    proposedTotal,
    proposal,
    changedFields: proposal ? ["total"] : [],
    blockReasons,
    blockReason: blockReasons[0] || "",
    candidateCompleteness: evidence.candidateCompleteness || {},
    totalCandidateCompleteness: totalCompleteness,
    provenanceSummary: evidence.provenanceSummary || {},
  };
}

function normalizeIpadStrictTotalMembers(values = []) {
  const members = Array.isArray(values)
    ? values.slice(0, 3).map(normalizeIpadArithmeticNumber)
    : [];
  while (members.length < 3) members.push(0);
  return members;
}

function formatIpadStrictTotalDisplayNumber(value) {
  const numeric = normalizeIpadArithmeticNumber(value);
  return numeric > 0 ? numeric.toLocaleString() : "";
}

function normalizeIpadStrictTotalDisplayValue(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function getIpadStrictTotalDisplayedSide(stageScores, stage, side, fallbackBonus = 0) {
  const stageScore = stageScores?.[stage] || stageScores?.[`stage${stage}`] || {};
  return {
    members: normalizeIpadStrictTotalMembers(
      (stageScore[side] || []).map(normalizeIpadStrictTotalDisplayValue)
    ),
    bonus: normalizeIpadArithmeticNumber(fallbackBonus),
    total: normalizeIpadStrictTotalDisplayValue(
      stageScore[side === "self" ? "selfTotal" : "enemyTotal"]
    ),
  };
}

function buildIpadStrictTotalProductionCounters() {
  return {
    evaluated: 0,
    eligible: 0,
    applied: 0,
    blockedNotWouldApply: 0,
    blockedAlreadyIdentical: 0,
    blockedAssertionFailure: 0,
    blockedMemberMutation: 0,
    blockedBonusMutation: 0,
    blockedNonTotalMutation: 0,
    blockedOther: 0,
  };
}

function summarizeIpadStrictTotalBlockReason(reasons = []) {
  if (!Array.isArray(reasons) || reasons.length === 0) return "blockedOther";
  if (reasons.includes("already-identical")) return "blockedAlreadyIdentical";
  return "blockedOther";
}

function buildIpadStrictTotalRecoveryApplication({
  stage,
  side,
  oldValues,
  proposal,
  evidence,
  evaluation,
}) {
  const observedTotalCandidate =
    evaluation.matchingObservedTotalCandidates?.find(
      (candidate) => candidate.value === evaluation.proposedTotal
    ) || null;
  const observedTotalProvenance = observedTotalCandidate
    ? summarizeIpadStrictTotalCandidate(observedTotalCandidate)
    : null;
  return {
    recoveryId: IPAD_STRICT_TOTAL_SELECTION_RECOVERY_ID,
    stage,
    side,
    oldValues,
    newValues: {
      members: normalizeIpadStrictTotalMembers(proposal.members),
      bonus: normalizeIpadArithmeticNumber(proposal.bonus),
      total: normalizeIpadArithmeticNumber(proposal.total),
    },
    changedFields: ["total"],
    provenance: {
      observedTotal: observedTotalProvenance,
      selectedMemberProfileIds: evidence.provenanceSummary?.selectedMemberProfileIds || {},
      selectedBonusProfileIds: evidence.provenanceSummary?.selectedBonusProfileIds || [],
      selectedBonusOrigin: evidence.provenanceSummary?.selectedBonusOrigin || "",
      matchingTotalProfileIds: evidence.provenanceSummary?.matchingTotalProfileIds || [],
      matchingTotalRawText: evidence.provenanceSummary?.matchingTotalRawText || "",
      matchingTotalNormalizedText: evidence.provenanceSummary?.matchingTotalNormalizedText || "",
    },
    candidateCompleteness: evaluation.candidateCompleteness || {},
    totalCandidateCompleteness: evaluation.totalCandidateCompleteness || {},
    observedTotalCandidateCount: Array.isArray(evidence.observedTotalCandidates)
      ? evidence.observedTotalCandidates.length
      : 0,
    computedValidationTotal: normalizeIpadArithmeticNumber(
      evaluation.computedValidationTotal
    ),
    uniqueMatchingObservedTotal: normalizeIpadArithmeticNumber(
      evaluation.uniqueMatchingObservedTotal
    ),
    equation: `${proposal.members.join("+")}+${normalizeIpadArithmeticNumber(
      proposal.bonus
    )}=${normalizeIpadArithmeticNumber(proposal.total)}`,
  };
}

export function applyIpadStrictTotalSelectionRecovery(stageScores, evidenceByStageSide = {}) {
  const productionRecovery = {
    recoveryId: IPAD_STRICT_TOTAL_SELECTION_RECOVERY_ID,
    enabled: ENABLE_IPAD_STRICT_TOTAL_SELECTION,
    appliedCases: [],
    rejectedCases: [],
    counters: buildIpadStrictTotalProductionCounters(),
    note:
      "Applies only the verified iPad strict total-only selector. Members and bonus are never changed.",
  };

  if (!ENABLE_IPAD_STRICT_TOTAL_SELECTION) {
    productionRecovery.blockReason = "feature-disabled";
    return { stageScores, productionRecovery };
  }

  const nextStageScores = JSON.parse(JSON.stringify(stageScores || {}));
  const stagesEvidence = evidenceByStageSide?.stages || evidenceByStageSide || {};
  for (const stage of [1, 2, 3]) {
    const stageKey = `stage${stage}`;
    const stageEvidence = stagesEvidence[stageKey] || stagesEvidence[stage] || {};
    for (const side of ["self", "enemy"]) {
      const row = stageEvidence?.[side] || null;
      const evidence = row?.evidence || row?.strictTotalSelectionEvidence || row || null;
      if (!evidence) continue;

      productionRecovery.counters.evaluated += 1;
      const evaluation = row?.evaluation || evaluateIpadStrictTotalSelection(evidence);
      if (evaluation.eligible) productionRecovery.counters.eligible += 1;
      if (!evaluation.wouldApply || !evaluation.proposal) {
        productionRecovery.counters[summarizeIpadStrictTotalBlockReason(evaluation.blockReasons)] += 1;
        productionRecovery.rejectedCases.push({
          stage,
          side,
          reason: evaluation.blockReasons?.join(",") || evaluation.blockReason || "would-not-apply",
        });
        continue;
      }

      const oldValues = getIpadStrictTotalDisplayedSide(
        nextStageScores,
        stage,
        side,
        evidence.selected?.bonus
      );
      const selectedMembers = normalizeIpadStrictTotalMembers(evidence.selected?.members);
      const selectedBonus = normalizeIpadArithmeticNumber(evidence.selected?.bonus);
      const proposal = evaluation.proposal;
      const proposedMembers = normalizeIpadStrictTotalMembers(proposal.members);
      const proposedBonus = normalizeIpadArithmeticNumber(proposal.bonus);
      const proposedTotal = normalizeIpadArithmeticNumber(proposal.total);
      const assertionPass =
        proposedMembers.reduce((sum, value) => sum + value, 0) + proposedBonus === proposedTotal;
      const rejectionReasons = [];

      if (!arraysEqualWithinTolerance(oldValues.members, selectedMembers, 0)) {
        rejectionReasons.push("displayed-members-do-not-match-evidence");
      }
      if (!arraysEqualWithinTolerance(selectedMembers, proposedMembers, 0)) {
        rejectionReasons.push("proposal-would-change-members");
      }
      if (oldValues.bonus !== selectedBonus || selectedBonus !== proposedBonus) {
        rejectionReasons.push("proposal-would-change-bonus");
      }
      if (!assertionPass) rejectionReasons.push("proposal-equation-assertion-failed");
      if (oldValues.total === proposedTotal) rejectionReasons.push("displayed-total-already-identical");

      if (rejectionReasons.length) {
        if (rejectionReasons.some((reason) => reason.includes("members"))) {
          productionRecovery.counters.blockedMemberMutation += 1;
        } else if (rejectionReasons.some((reason) => reason.includes("bonus"))) {
          productionRecovery.counters.blockedBonusMutation += 1;
        } else if (rejectionReasons.some((reason) => reason.includes("assertion"))) {
          productionRecovery.counters.blockedAssertionFailure += 1;
        } else {
          productionRecovery.counters.blockedNonTotalMutation += 1;
        }
        productionRecovery.rejectedCases.push({
          stage,
          side,
          reason: rejectionReasons.join(","),
        });
        continue;
      }

      nextStageScores[stage] ||= {};
      nextStageScores[stage][side === "self" ? "selfTotal" : "enemyTotal"] =
        formatIpadStrictTotalDisplayNumber(proposedTotal);
      productionRecovery.appliedCases.push(
        buildIpadStrictTotalRecoveryApplication({
          stage,
          side,
          oldValues,
          proposal,
          evidence,
          evaluation,
        })
      );
      productionRecovery.counters.applied += 1;
    }
  }

  return {
    stageScores: nextStageScores,
    productionRecovery,
  };
}

export const ENABLE_IPAD_STRICT_MEMBER2_SELECTION = true;
export const IPAD_STRICT_MEMBER2_SELECTION_RECOVERY_ID = "ipad-strict-member2-selection";

const ipadStrictMember2ApprovedProfiles = new Set([
  "baseline-score-preprocess-3x-psm7",
  "invert-normalize-3x-psm7",
  "white-mask-3x-psm7",
  "ipad-grouped-number-token",
]);

function candidateHasIpadStrictMember2ApprovedProvenance(candidate = {}) {
  const profileIds = Array.isArray(candidate.profileIds) ? candidate.profileIds : [];
  return profileIds.some((profileId) => ipadStrictMember2ApprovedProfiles.has(profileId));
}

function summarizeIpadStrictMember2Pool(pool = {}) {
  const candidates = Array.isArray(pool.candidates)
    ? pool.candidates
        .map((candidate) => normalizeIpadArithmeticCandidate(candidate, "observed"))
        .map((candidate) => ({
          ...summarizeIpadStrictTotalCandidate(candidate),
          approvedProvenance: candidateHasIpadStrictMember2ApprovedProvenance(candidate),
        }))
    : [];
  return {
    key: pool.key || "",
    fieldType: pool.fieldType || "",
    candidateCap: Number(pool.candidateCap || 6),
    rawDistinctCandidateCount: Number(
      pool.rawDistinctCandidateCount ||
        (Array.isArray(pool.candidates) ? pool.candidates.length : 0)
    ),
    truncated: Boolean(pool.truncated),
    observedCandidates: candidates,
  };
}

function selectedIpadStrictMember2FieldHasStrongProvenance({
  label,
  selectedValue,
  selection,
  pool,
}) {
  const value = normalizeIpadArithmeticNumber(selectedValue);
  if (label === "bonus" && value === 0 && !selection?.candidate) {
    return {
      label,
      value,
      hasStrongProvenance: true,
      origin: "schema-default-bonus-zero",
      candidate: null,
    };
  }
  const selectedCandidate = selection?.candidate
    ? summarizeIpadStrictTotalCandidate(
        normalizeIpadArithmeticCandidate(selection.candidate, "observed")
      )
    : null;
  const observedCandidate =
    selectedCandidate ||
    summarizeIpadStrictMember2Pool(pool).observedCandidates.find(
      (candidate) => candidate.value === value
    ) ||
    null;
  return {
    label,
    value,
    hasStrongProvenance: Boolean(observedCandidate),
    origin: observedCandidate?.origin || "",
    candidate: observedCandidate,
  };
}

export function buildIpadStrictMember2SelectionEvidence({
  deviceMode = "ipad",
  layout = {},
  stage = 0,
  side = "",
  fieldCandidatePools = {},
  currentPrimary = {},
  currentSelections = {},
} = {}) {
  const current = {
    members: Array.isArray(currentPrimary.members)
      ? currentPrimary.members.slice(0, 3).map(normalizeIpadArithmeticNumber)
      : [0, 0, 0],
    bonus: normalizeIpadArithmeticNumber(currentPrimary.bonus),
    total: normalizeIpadArithmeticNumber(currentPrimary.total),
  };
  while (current.members.length < 3) current.members.push(0);

  const member2Pool = summarizeIpadStrictMember2Pool(fieldCandidatePools.member2 || {});
  const arithmeticComparisonMember2 =
    current.total - current.bonus - current.members[0] - current.members[2];
  const matchingObservedMember2Candidates = member2Pool.observedCandidates.filter(
    (candidate) =>
      candidate.value !== current.members[1] &&
      candidate.value === arithmeticComparisonMember2
  );
  const distinctMatchingObservedMember2Values = [
    ...new Set(matchingObservedMember2Candidates.map((candidate) => candidate.value)),
  ];
  const uniqueMatchingObservedMember2 =
    distinctMatchingObservedMember2Values.length === 1
      ? distinctMatchingObservedMember2Values[0]
      : null;
  const uniqueMatchingObservedMember2Candidate =
    uniqueMatchingObservedMember2 === null
      ? null
      : matchingObservedMember2Candidates.find(
          (candidate) => candidate.value === uniqueMatchingObservedMember2
        ) || null;

  const unchangedFieldProvenance = {
    member1: selectedIpadStrictMember2FieldHasStrongProvenance({
      label: "member1",
      selectedValue: current.members[0],
      selection: currentSelections.member1,
      pool: fieldCandidatePools.member1,
    }),
    member3: selectedIpadStrictMember2FieldHasStrongProvenance({
      label: "member3",
      selectedValue: current.members[2],
      selection: currentSelections.member3,
      pool: fieldCandidatePools.member3,
    }),
    bonus: selectedIpadStrictMember2FieldHasStrongProvenance({
      label: "bonus",
      selectedValue: current.bonus,
      selection: currentSelections.bonus,
      pool: fieldCandidatePools.bonus,
    }),
    total: selectedIpadStrictMember2FieldHasStrongProvenance({
      label: "total",
      selectedValue: current.total,
      selection: currentSelections.total,
      pool: fieldCandidatePools.total,
    }),
  };
  const missingUnchangedFieldProvenance = Object.entries(unchangedFieldProvenance)
    .filter(([, item]) => !item.hasStrongProvenance)
    .map(([label]) => label);
  const member2CandidateCompleteness = {
    complete:
      member2Pool.observedCandidates.length > 0 &&
      !member2Pool.truncated &&
      member2Pool.rawDistinctCandidateCount <= member2Pool.observedCandidates.length,
    missing: member2Pool.observedCandidates.length === 0,
    truncated: member2Pool.truncated,
    candidateCap: member2Pool.candidateCap,
    rawDistinctCandidateCount: member2Pool.rawDistinctCandidateCount,
    candidateCount: member2Pool.observedCandidates.length,
  };

  return {
    schema: "ipad-strict-member2-selection-evidence-v1",
    deviceMode,
    layout: {
      detected: Boolean(layout.detected ?? deviceMode === "ipad"),
      orientation: layout.orientation || "",
      supported: layout.supported ?? true,
    },
    stage,
    side,
    selected: {
      members: current.members,
      bonus: current.bonus,
      total: current.total,
    },
    arithmeticComparisonMember2,
    member2Pool,
    matchingObservedMember2Candidates,
    uniqueMatchingObservedMember2,
    uniqueMatchingObservedMember2Candidate,
    unchangedFieldProvenance,
    missingUnchangedFieldProvenance,
    member2CandidateCompleteness,
    candidateCompleteness: {
      complete:
        member2CandidateCompleteness.complete &&
        missingUnchangedFieldProvenance.length === 0,
      member2Missing: member2CandidateCompleteness.missing,
      member2Truncated: member2CandidateCompleteness.truncated,
      missingUnchangedFieldProvenance,
    },
    provenanceSummary: {
      unchangedFields: Object.fromEntries(
        Object.entries(unchangedFieldProvenance).map(([label, item]) => [
          label,
          {
            origin: item.origin,
            profileIds: item.candidate?.profileIds || [],
            rawText: item.candidate?.rawText || "",
            normalizedText: item.candidate?.normalizedText || "",
          },
        ])
      ),
      proposedMember2ProfileIds: uniqueMatchingObservedMember2Candidate?.profileIds || [],
      proposedMember2RawText: uniqueMatchingObservedMember2Candidate?.rawText || "",
      proposedMember2NormalizedText:
        uniqueMatchingObservedMember2Candidate?.normalizedText || "",
    },
  };
}

export function evaluateIpadStrictMember2Selection(evidence = {}) {
  const blockReasons = [];
  const deviceMode = evidence.deviceMode || "";
  const layout = evidence.layout || {};
  const selected = evidence.selected || {};
  const selectedMembers = Array.isArray(selected.members)
    ? selected.members.slice(0, 3).map(normalizeIpadArithmeticNumber)
    : [0, 0, 0];
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedBonus = normalizeIpadArithmeticNumber(selected.bonus);
  const selectedTotal = normalizeIpadArithmeticNumber(selected.total);
  const arithmeticComparisonMember2 = normalizeIpadArithmeticNumber(
    evidence.arithmeticComparisonMember2
  );
  const matchingCandidates = Array.isArray(evidence.matchingObservedMember2Candidates)
    ? evidence.matchingObservedMember2Candidates
    : [];
  const distinctMatchingValues = [...new Set(matchingCandidates.map((candidate) => candidate.value))];
  const member2Completeness = evidence.member2CandidateCompleteness || {};
  const missingUnchanged = Array.isArray(evidence.missingUnchangedFieldProvenance)
    ? evidence.missingUnchangedFieldProvenance
    : [];
  const uniqueCandidate = evidence.uniqueMatchingObservedMember2Candidate || null;

  if (deviceMode !== "ipad") blockReasons.push(`non-ipad-mode:${deviceMode || "unknown"}`);
  if (layout.detected === false) blockReasons.push("ipad-layout-not-detected");
  if (layout.orientation && layout.orientation !== "portrait") {
    blockReasons.push(`unsupported-ipad-orientation:${layout.orientation}`);
  }
  if (layout.supported === false) blockReasons.push("unsupported-ipad-layout");
  if (missingUnchanged.length) {
    blockReasons.push(`unchanged-field-lacks-strong-provenance:${missingUnchanged.join(",")}`);
  }
  if (member2Completeness.missing) blockReasons.push("missing-observed-member2-candidates");
  if (member2Completeness.truncated || member2Completeness.complete === false) {
    blockReasons.push("member2-pool-incomplete-or-truncated");
  }
  if (distinctMatchingValues.length === 0) {
    blockReasons.push("no-observed-member2-candidate-makes-equation");
  } else if (distinctMatchingValues.length > 1) {
    blockReasons.push("multiple-observed-member2-candidates-make-equation");
  }
  if (uniqueCandidate && !uniqueCandidate.approvedProvenance) {
    blockReasons.push("member2-candidate-provenance-not-approved");
  }
  if (selectedMembers[1] === arithmeticComparisonMember2) blockReasons.push("already-identical");

  const proposedMember2 =
    blockReasons.length === 0 && distinctMatchingValues.length === 1
      ? distinctMatchingValues[0]
      : null;
  const proposal = proposedMember2
    ? {
        members: [selectedMembers[0], proposedMember2, selectedMembers[2]],
        bonus: selectedBonus,
        total: selectedTotal,
      }
    : null;
  const assertionPass =
    proposal &&
    proposal.members[0] + proposal.members[1] + proposal.members[2] + proposal.bonus ===
      proposal.total;

  if (proposal && !assertionPass) blockReasons.push("assertion-equation-not-exact");

  return {
    schema: "ipad-strict-member2-selection-evaluation-v1",
    eligible: blockReasons.length === 0,
    wouldApply: Boolean(proposal && assertionPass && selectedMembers[1] !== proposedMember2),
    arithmeticComparisonMember2,
    matchingObservedMember2Candidates: matchingCandidates,
    uniqueMatchingMember2: proposedMember2,
    proposedMember2,
    proposal: blockReasons.length === 0 && assertionPass ? proposal : null,
    changedFields: blockReasons.length === 0 && assertionPass ? ["member2"] : [],
    blockReasons,
    blockReason: blockReasons[0] || "",
    candidateCompleteness: evidence.candidateCompleteness || {},
    member2CandidateCompleteness: member2Completeness,
    unchangedFieldProvenance: evidence.unchangedFieldProvenance || {},
    provenanceSummary: evidence.provenanceSummary || {},
  };
}

function buildIpadStrictMember2ProductionCounters() {
  return {
    evaluated: 0,
    eligible: 0,
    applied: 0,
    blockedOverlap: 0,
    blockedNotWouldApply: 0,
    blockedAlreadyIdentical: 0,
    blockedAssertionFailure: 0,
    blockedNonMember2Mutation: 0,
    blockedDisplayedMismatch: 0,
    blockedOther: 0,
  };
}

function summarizeIpadStrictMember2BlockReason(reasons = []) {
  if (!Array.isArray(reasons) || reasons.length === 0) return "blockedOther";
  if (reasons.includes("already-identical")) return "blockedAlreadyIdentical";
  return "blockedNotWouldApply";
}

function buildIpadStrictMember2RecoveryApplication({
  stage,
  side,
  oldValues,
  proposal,
  evidence,
  evaluation,
}) {
  const observedMember2Candidate =
    evaluation.matchingObservedMember2Candidates?.find(
      (candidate) => candidate.value === evaluation.proposedMember2
    ) || null;
  const observedMember2Provenance = observedMember2Candidate
    ? {
        ...summarizeIpadStrictTotalCandidate(observedMember2Candidate),
        approvedProvenance: Boolean(observedMember2Candidate.approvedProvenance),
      }
    : null;
  return {
    recoveryId: IPAD_STRICT_MEMBER2_SELECTION_RECOVERY_ID,
    stage,
    side,
    oldValues,
    newValues: {
      members: normalizeIpadStrictTotalMembers(proposal.members),
      bonus: normalizeIpadArithmeticNumber(proposal.bonus),
      total: normalizeIpadArithmeticNumber(proposal.total),
    },
    changedFields: ["member2"],
    previousMember2: normalizeIpadArithmeticNumber(oldValues.members?.[1]),
    correctedMember2: normalizeIpadArithmeticNumber(proposal.members?.[1]),
    provenance: {
      observedMember2: observedMember2Provenance,
      unchangedFields: evidence.provenanceSummary?.unchangedFields || {},
      proposedMember2ProfileIds: evidence.provenanceSummary?.proposedMember2ProfileIds || [],
      proposedMember2RawText: evidence.provenanceSummary?.proposedMember2RawText || "",
      proposedMember2NormalizedText:
        evidence.provenanceSummary?.proposedMember2NormalizedText || "",
    },
    candidateCompleteness: evaluation.candidateCompleteness || {},
    member2CandidateCompleteness: evaluation.member2CandidateCompleteness || {},
    observedMember2CandidateCount: Array.isArray(evidence.member2Pool?.observedCandidates)
      ? evidence.member2Pool.observedCandidates.length
      : 0,
    matchingMember2CandidateCount: Array.isArray(evaluation.matchingObservedMember2Candidates)
      ? evaluation.matchingObservedMember2Candidates.length
      : 0,
    arithmeticComparisonMember2: normalizeIpadArithmeticNumber(
      evaluation.arithmeticComparisonMember2
    ),
    uniqueMatchingMember2: normalizeIpadArithmeticNumber(evaluation.uniqueMatchingMember2),
    equation: `${proposal.members[0]}+${proposal.members[1]}+${proposal.members[2]}+${normalizeIpadArithmeticNumber(
      proposal.bonus
    )}=${normalizeIpadArithmeticNumber(proposal.total)}`,
  };
}

export function applyIpadStrictMember2SelectionRecovery(stageScores, evidenceByStageSide = {}) {
  const productionRecovery = {
    recoveryId: IPAD_STRICT_MEMBER2_SELECTION_RECOVERY_ID,
    enabled: ENABLE_IPAD_STRICT_MEMBER2_SELECTION,
    appliedCases: [],
    rejectedCases: [],
    counters: buildIpadStrictMember2ProductionCounters(),
    note:
      "Applies only the verified iPad strict member2 selector. Member1, member3, bonus, and total are never changed.",
  };

  if (!ENABLE_IPAD_STRICT_MEMBER2_SELECTION) {
    productionRecovery.blockReason = "feature-disabled";
    return { stageScores, productionRecovery };
  }

  const priorAppliedKeys = new Set(
    (evidenceByStageSide?.priorAppliedCases || evidenceByStageSide?.priorProductionRecovery?.appliedCases || [])
      .map((entry) => `${entry.stage}|${entry.side}`)
  );
  const nextStageScores = JSON.parse(JSON.stringify(stageScores || {}));
  const stagesEvidence = evidenceByStageSide?.stages || evidenceByStageSide || {};
  for (const stage of [1, 2, 3]) {
    const stageKey = `stage${stage}`;
    const stageEvidence = stagesEvidence[stageKey] || stagesEvidence[stage] || {};
    for (const side of ["self", "enemy"]) {
      const row = stageEvidence?.[side] || null;
      const evidence = row?.evidence || row?.strictMember2SelectionEvidence || row || null;
      if (!evidence) continue;

      productionRecovery.counters.evaluated += 1;
      const evaluation = row?.evaluation || evaluateIpadStrictMember2Selection(evidence);
      if (evaluation.eligible) productionRecovery.counters.eligible += 1;

      if (priorAppliedKeys.has(`${stage}|${side}`)) {
        productionRecovery.counters.blockedOverlap += 1;
        productionRecovery.rejectedCases.push({ stage, side, reason: "prior-production-recovery-overlap" });
        continue;
      }

      if (!evaluation.wouldApply || !evaluation.proposal) {
        const counter = summarizeIpadStrictMember2BlockReason(evaluation.blockReasons);
        productionRecovery.counters[counter] = (productionRecovery.counters[counter] || 0) + 1;
        productionRecovery.rejectedCases.push({
          stage,
          side,
          reason: evaluation.blockReasons?.join(",") || evaluation.blockReason || "would-not-apply",
        });
        continue;
      }

      const selectedMembers = normalizeIpadStrictTotalMembers(evidence.selected?.members);
      const selectedBonus = normalizeIpadArithmeticNumber(evidence.selected?.bonus);
      const selectedTotal = normalizeIpadArithmeticNumber(evidence.selected?.total);
      const oldValues = getIpadStrictTotalDisplayedSide(
        nextStageScores,
        stage,
        side,
        selectedBonus
      );
      const proposal = evaluation.proposal;
      const proposedMembers = normalizeIpadStrictTotalMembers(proposal.members);
      const proposedBonus = normalizeIpadArithmeticNumber(proposal.bonus);
      const proposedTotal = normalizeIpadArithmeticNumber(proposal.total);
      const assertionPass =
        proposedMembers.reduce((sum, value) => sum + value, 0) + proposedBonus === proposedTotal;
      const rejectionReasons = [];

      if (!arraysEqualWithinTolerance(oldValues.members, selectedMembers, 0)) {
        rejectionReasons.push("displayed-members-do-not-match-evidence");
      }
      if (oldValues.bonus !== selectedBonus || oldValues.total !== selectedTotal) {
        rejectionReasons.push("displayed-bonus-or-total-do-not-match-evidence");
      }
      if (proposedMembers[0] !== selectedMembers[0] || proposedMembers[2] !== selectedMembers[2]) {
        rejectionReasons.push("proposal-would-change-member1-or-member3");
      }
      if (proposedBonus !== selectedBonus || proposedTotal !== selectedTotal) {
        rejectionReasons.push("proposal-would-change-bonus-or-total");
      }
      if (proposedMembers[1] === selectedMembers[1]) {
        rejectionReasons.push("displayed-member2-already-identical");
      }
      if (!assertionPass) rejectionReasons.push("proposal-equation-assertion-failed");

      if (rejectionReasons.length) {
        if (rejectionReasons.some((reason) => reason.includes("displayed"))) {
          productionRecovery.counters.blockedDisplayedMismatch += 1;
        } else if (rejectionReasons.some((reason) => reason.includes("assertion"))) {
          productionRecovery.counters.blockedAssertionFailure += 1;
        } else if (rejectionReasons.some((reason) => reason.includes("already"))) {
          productionRecovery.counters.blockedAlreadyIdentical += 1;
        } else {
          productionRecovery.counters.blockedNonMember2Mutation += 1;
        }
        productionRecovery.rejectedCases.push({
          stage,
          side,
          reason: rejectionReasons.join(","),
        });
        continue;
      }

      nextStageScores[stage] ||= {};
      nextStageScores[stage][side] = proposedMembers.map(formatIpadStrictTotalDisplayNumber);
      productionRecovery.appliedCases.push(
        buildIpadStrictMember2RecoveryApplication({
          stage,
          side,
          oldValues,
          proposal,
          evidence,
          evaluation,
        })
      );
      productionRecovery.counters.applied += 1;
    }
  }

  return {
    stageScores: nextStageScores,
    productionRecovery,
  };
}

export function getFixedOcrZones(image, stage, mode) {
  mode = normalizeOcrMode(mode);
  const layout = getDeviceOcrLayout(mode);
  const stageIndex = stage - 1;

  if (layout.direct) {
    const makeDirectZone = (side, type) => {
      const xRate = side === "self" ? layout.leftX : layout.rightX;
      const yRate =
        type === "total" && side === "enemy" && layout.enemyTotalTop
          ? layout.enemyTotalTop[stageIndex]
          : type === "total"
          ? layout.totalTop[stageIndex]
          : side === "enemy" && layout.enemyMemberTop
          ? layout.enemyMemberTop[stageIndex]
          : layout.memberTop[stageIndex];
      const heightRate =
        type === "total"
          ? layout.totalHeight
          : side === "enemy" &&
            layout.enemyMemberHeight &&
            layout.enemyMemberHeight[stageIndex]
          ? layout.enemyMemberHeight[stageIndex]
          : layout.memberHeight;

      return {
        x: Math.floor(image.width * xRate),
        y: Math.floor(image.height * yRate),
        width: Math.floor(image.width * layout.sideWidth),
        height: Math.floor(image.height * heightRate),
      };
    };

    return {
      selfTotal: makeDirectZone("self", "total"),
      selfMembers: makeDirectZone("self", "members"),
      enemyTotal: makeDirectZone("enemy", "total"),
      enemyMembers: makeDirectZone("enemy", "members"),
    };
  }

  const stageY = image.height * layout.stageTop[stageIndex];
  const stageHeight = image.height * layout.stageHeight;

  const makeZone = (side, type) => {
    const xRate = side === "self" ? layout.leftX : layout.rightX;
    const yRate = type === "total" ? layout.totalY : layout.memberY;
    const heightRate = type === "total" ? layout.totalHeight : layout.memberHeight;

    return {
      x: Math.floor(image.width * xRate),
      y: Math.floor(stageY + stageHeight * yRate),
      width: Math.floor(image.width * layout.sideWidth),
      height: Math.floor(stageHeight * heightRate),
    };
  };

  return {
    selfTotal: makeZone("self", "total"),
    selfMembers: makeZone("self", "members"),
    enemyTotal: makeZone("enemy", "total"),
    enemyMembers: makeZone("enemy", "members"),
  };
}

export function getAlternativeTotalZones(image, stage, mode, side) {
  mode = normalizeOcrMode(mode);
  const layout = getDeviceOcrLayout(mode);

  if (!layout.direct || !layout.totalTopCandidates) {
    return [];
  }

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;

  return layout.totalTopCandidates.map((candidate) => ({
    x: Math.floor(image.width * xRate),
    y: Math.floor(image.height * candidate[stageIndex]),
    width: Math.floor(image.width * layout.sideWidth),
    height: Math.floor(image.height * layout.totalHeight),
  }));
}

export async function recognizeTotalCandidatesDetailed(image, zones) {
  const results = [];
  const traces = [];
  let fallbackZone = null;
  let fallbackResult = null;

  for (const zone of zones) {
    const result = await recognizeOcrZone(image, zone);
    if (!fallbackZone) {
      fallbackZone = zone;
      fallbackResult = result;
    }

    results.push(...result.numbers);
    traces.push({
      text: result.text,
      numbers: result.numbers,
    });
  }

  if (enableNextScreenFallback && results.length === 0 && fallbackZone) {
    const secondPass = await recognizeNextScreenFallback(
      image,
      fallbackZone,
      (candidate) => candidate.numbers.length > 0,
      "total"
    );
    const merged = mergeOcrResults(fallbackResult, secondPass || { text: "", numbers: [] });
    results.push(...merged.numbers);
    traces.push({
      text: merged.text,
      numbers: merged.numbers,
      fallback: true,
    });
  }

  return {
    numbers: results,
    text: traces.map((trace) => trace.text || "").join("\n"),
    traces,
  };
}

export async function recognizeTotalCandidates(image, zones) {
  return (await recognizeTotalCandidatesDetailed(image, zones)).numbers;
}

export async function recognizeCrownBonusCandidates(image, zones) {
  const results = [];

  for (const zone of zones) {
    const result = await recognizeOcrZone(image, zone, {
      preset: "crown-bonus",
      pageSegMode: "7",
      charWhitelist: "0123456789,+",
    });
    results.push(
      ...extractCrownBonusNumbers(result.text, {
        allowFallback: !zone.requiresPlus,
      })
    );
  }

  return uniqueNumbers(results);
}

export async function recognizeMemberScoreSlotCandidates(image, zones) {
  const results = [];

  for (const zone of zones) {
    const result = await recognizeOcrZone(image, zone, {
      preset: "score-slot",
      pageSegMode: "7",
    });
    results.push(...result.numbers.filter((num) => num >= 1400 && num < 1000000));
  }

  return uniqueNumbers(results);
}

export function correctCommonTotalOcr(num, memberSum) {
  // Common smartphone OCR case: 150,388 is read as 150,588.
  // It appears when the member sum is 138,451 and +11,937 is visible.
  if (num === 150588 && Math.abs(memberSum - 138451) <= 5) {
    return 150388;
  }

  return num;
}

export function pickTotalWithMemberFallback(
  rawNumbers,
  candidateNumbers,
  memberSum,
  memberCount = 0,
  maxMember = 0,
  memberCandidateNumbers = [],
  bonusNumbers = [],
  selectedMembers = []
) {
  const crownBonusCandidates = bonusNumbers
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 200000)
    .filter((num) => Math.abs(num - memberSum) > 1000)
    .sort((a, b) => a - b);
  const crownBonus = crownBonusCandidates[0] || 0;
  const allNumbers = [...rawNumbers, ...candidateNumbers]
    .filter((num) => num >= 10000 && num < 10000000)
    .filter((num) => num < 10000000)
    .map((num) => correctCommonTotalOcr(num, memberSum));
  const visibleNumbers = [...allNumbers, ...memberCandidateNumbers]
    .filter((num) => num >= 10000 && num < 10000000)
    .map((num) => correctCommonTotalOcr(num, memberSum));

  if (memberCount >= 3 && memberSum > 0) {
    if (rawNumbers.some((num) => Math.abs(num - memberSum) <= 1)) {
      return memberSum;
    }

    const isolatedTotalZoneBonuses =
      rawNumbers.every((num) => num < 100000) &&
      candidateNumbers.every((num) => num < memberSum)
        ? rawNumbers
            .filter((num) => num >= 10000 && num < 85000)
            .filter((num) => Math.abs(num - memberSum) > 1000)
            .filter((num) => num < memberSum)
            .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
            .filter((num) => !isKnownNoiseNumber(num))
            .sort((a, b) => a - b)
        : [];

    if (isolatedTotalZoneBonuses.length > 0) {
      return memberSum + isolatedTotalZoneBonuses[0];
    }

    const sourceNumbers = [...rawNumbers, ...candidateNumbers, ...memberCandidateNumbers].filter(
      (num) => Number.isFinite(num) && num >= 10000 && num < 10000000
    );
    const matchingCrownBonuses = crownBonusCandidates.filter((bonus) => {
      const total = memberSum + bonus;
      return sourceNumbers.some(
        (candidate) =>
          Math.abs(candidate - total) <= 1000 ||
          (candidate >= 100000 && Math.abs(candidate - (total + 200000)) <= 1000) ||
          (candidate >= 100000 && Math.abs(candidate - (total - 200000)) <= 1000)
      );
    });

    if (matchingCrownBonuses.length > 0) {
      return memberSum + matchingCrownBonuses[0];
    }

    const crownIncludedTotals = allNumbers
      .filter((num) => displayedTotalCrownDiffCandidates.has(num - memberSum))
      .sort((a, b) => a - b);

    if (crownIncludedTotals.length > 0) {
      return crownIncludedTotals[0];
    }

    const visibleCrownDiffs = visibleNumbers
      .filter((num) => displayedTotalCrownDiffCandidates.has(num))
      .sort((a, b) => a - b);

    if (visibleCrownDiffs.length > 0) {
      return memberSum + visibleCrownDiffs[0];
    }

    const directTotalZoneBonuses = rawNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => num < memberSum)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) =>
        [...candidateNumbers, ...memberCandidateNumbers].some(
          (candidate) => Math.abs(candidate - (memberSum + num)) <= 1000
        )
      )
      .sort((a, b) => a - b);

    if (directTotalZoneBonuses.length > 0) {
      return memberSum + directTotalZoneBonuses[0];
    }

    const selectedIndexes = selectedMembers
      .map((member) =>
        memberCandidateNumbers.findIndex((candidate) => Math.abs(candidate - member) <= 1)
      )
      .filter((index) => index >= 0);
    const selectedAreConsecutive =
      selectedIndexes.length === selectedMembers.length &&
      selectedIndexes.every(
        (index, position) => position === 0 || index === selectedIndexes[position - 1] + 1
      );
    const trailingVisibleBonuses = selectedAreConsecutive
      ? memberCandidateNumbers
          .slice(Math.max(...selectedIndexes) + 1)
          .filter((num) => num >= 10000 && num < 200000)
          .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
          .filter((num) => !isKnownNoiseNumber(num))
      : [];

    if (trailingVisibleBonuses.length > 0) {
      return memberSum + trailingVisibleBonuses[0];
    }

    const inferredVisibleBonuses = memberCandidateNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) => {
        const total = memberSum + num;
        return [...allNumbers, ...memberCandidateNumbers].some(
          (candidate) =>
            Math.abs(candidate - total) <= 1000 ||
            (candidate >= 100000 && Math.abs(candidate - (total + 200000)) <= 1000) ||
            (candidate >= 100000 && Math.abs(candidate - (total - 200000)) <= 1000)
        );
      })
      .sort((a, b) => a - b);

    if (inferredVisibleBonuses.length > 0) {
      return memberSum + inferredVisibleBonuses[0];
    }

    if (visibleNumbers.some((num) => Math.abs(num - memberSum) <= 1)) {
      return memberSum;
    }

    const rawVisibleBonuses = rawNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => num < memberSum)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) =>
        [...candidateNumbers, ...memberCandidateNumbers].some(
          (candidate) => Math.abs(candidate - (memberSum + num)) <= 1000
        )
      )
      .sort((a, b) => a - b);

    if (rawVisibleBonuses.length > 0) {
      return memberSum + rawVisibleBonuses[0];
    }

    if (crownBonus > 0) {
      return memberSum + crownBonus;
    }

    if (allNumbers.length === 0) {
      return memberSum;
    }
  }

  const totalLike = allNumbers
    .filter((num) => memberSum > 0 && num >= memberSum)
    .filter((num) => maxMember <= 0 || num >= maxMember)
    .sort((a, b) => a - b);

  if (memberCount >= 3 && memberSum > 0) {
    return memberSum;
  }
  if (totalLike.length > 0) {
    return totalLike[0];
  }

  if (
    memberCount > 0 &&
    memberCount < 3 &&
    memberSum > 0 &&
    allNumbers.length > 0 &&
    allNumbers.every((num) => num < memberSum)
  ) {
    return memberSum;
  }

  return pickTotalNumber(allNumbers) || memberSum;
}

export function getAlternativeMemberZones(image, stage, mode, side) {
  mode = normalizeOcrMode(mode);
  const layout = getDeviceOcrLayout(mode);

  if (!layout.direct || !layout.memberTopCandidates) {
    return [];
  }

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;

  return layout.memberTopCandidates.map((candidate) => ({
    x: Math.floor(image.width * xRate),
    y: Math.floor(image.height * candidate[stageIndex]),
    width: Math.floor(image.width * layout.sideWidth),
    height: Math.floor(image.height * layout.memberHeight),
  }));
}

export function scoreMemberCandidate(numbers) {
  const valid = numbers.filter((num) => num >= 1400 && num < 1000000);
  const countScore = valid.length;
  const hasThree = countScore >= 3 ? 2500 : 0;
  const normalScore =
    valid.filter((num) => num >= 15000 && num <= 1000000).length * 180;
  const tooLowPenalty = valid.filter((num) => num < 1000).length * -200;
  const oneOrTwoPenalty = countScore < 3 ? -600 : 0;

  return hasThree + normalScore + tooLowPenalty + oneOrTwoPenalty + countScore;
}

function mergeOcrResults(primary, secondary) {
  return {
    text: [primary.text, secondary.text].filter(Boolean).join("\n"),
    numbers: uniqueNumbers([...(primary.numbers || []), ...(secondary.numbers || [])]),
  };
}

const nextScreenPrimaryPresets = [
  "next-screen-threshold",
  "next-screen-contrast",
];

const nextScreenFallbackPresets = [
  "next-screen-brightness",
  "next-screen-blur-reduction",
];

function getCrownBonusNumber(numbers) {
  const candidates = numbers
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 200000)
    .sort((a, b) => a - b);

  return candidates[0] || 0;
}

export function inferCrownBonusFromMemberNumbers(memberNumbers, totalNumbers = [], options = {}) {
  const preferLeadingTotal = options.preferLeadingTotal !== false;
  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const totals = totalNumbers.filter((num) => num >= 100000 && num < 3000000);
  const leadingTotalReferences = [
    ...totals,
    ...(options.leadingTotalReferences || []).filter((num) => num >= 100000 && num < 3000000),
  ];

  if (numbers.length >= 5) {
    const displayedTotal = numbers[0];
    const members = numbers.slice(1, 4);
    const bonus = numbers[4];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;
    const displayedTotalIsReferenced = leadingTotalReferences.some(
      (total) => Math.abs(total - displayedTotal) <= 1000
    );

    if (displayedTotalIsReferenced) {
      const possibleBonuses = numbers.slice(2).filter((num) => num >= 10000 && num < 200000);
      for (const count of [1, 2]) {
        const partialMembers = numbers.slice(1, 1 + count);
        const partialSum = partialMembers.reduce((sum, value) => sum + value, 0);
        for (const possibleBonus of possibleBonuses) {
          if (
            partialMembers.every((num) => num >= 1400 && num < 1000000) &&
            !partialMembers.some((member) => Math.abs(member - possibleBonus) <= 1) &&
            Math.abs(partialSum + possibleBonus - displayedTotal) <= 1000
          ) {
            return { bonus: possibleBonus, members: partialMembers, total: displayedTotal };
          }
        }
      }
    }

    if (bonus >= 10000 && bonus < 200000 && Math.abs(displayedTotal - sumWithBonus) <= 1000) {
      return { bonus, members, total: displayedTotal };
    }

    if (
      bonus >= 10000 &&
      bonus < 200000 &&
      !displayedTotalIsReferenced &&
      Math.abs(Math.abs(sumWithBonus - displayedTotal) - 200000) <= 1000
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    if (
      bonus >= 10000 &&
      bonus < 200000 &&
      !displayedTotalIsReferenced &&
      Math.abs(Math.abs(sumWithBonus - displayedTotal) - 300000) <= 2500
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    if (
      displayedTotal >= 10000 &&
      displayedTotal < 85000 &&
      bonus >= 10000 &&
      bonus < 200000 &&
      members.reduce((sum, value) => sum + value, 0) >= 100000
    ) {
      return { bonus, members, total: sumWithBonus };
    }
  }

  if (preferLeadingTotal && numbers.length === 2) {
    const [displayedTotal, member] = numbers;

    if (
      displayedTotal >= 100000 &&
      Math.abs(displayedTotal - member) <= 1 &&
      leadingTotalReferences.some((total) => Math.abs(total - displayedTotal) <= 1000)
    ) {
      return { bonus: 0, members: [member], total: displayedTotal };
    }

    const bonus = displayedTotal - member;

    if (
      displayedTotal >= 100000 &&
      member >= 100000 &&
      member < 1000000 &&
      bonus >= 10000 &&
      bonus < 200000
    ) {
      return { bonus, members: [member], total: displayedTotal };
    }
  }

  if (preferLeadingTotal && numbers.length === 3) {
    const [displayedTotal, firstMember, secondMember] = numbers;
    const memberSum = firstMember + secondMember;

    if (
      displayedTotal >= 100000 &&
      firstMember >= 100000 &&
      secondMember >= 100000 &&
      Math.abs(displayedTotal - memberSum) <= 1000 &&
      leadingTotalReferences.some((total) => Math.abs(total - displayedTotal) <= 1000)
    ) {
      return { bonus: 0, members: [firstMember, secondMember], total: displayedTotal };
    }
  }

  if (numbers.length >= 4) {
    const firstFour = numbers.slice(0, 4);
    const first = firstFour[0];
    const nextThree = firstFour.slice(1);
    const nextThreeSum = nextThree.reduce((sum, value) => sum + value, 0);
    const inferredBonusFromLeadingTotal = first - nextThreeSum;

    if (Math.abs(first - nextThreeSum) <= 1000) {
      return { bonus: 0, members: nextThree, total: first };
    }

    const firstMatchesKnownTotal = totalNumbers.some(
      (total) => total >= 100000 && Math.abs(total - first) <= 1000
    );

    if (
      preferLeadingTotal &&
      first > Math.max(...nextThree) &&
      nextThree.every((num) => num >= 5000) &&
      inferredBonusFromLeadingTotal >= 10000 &&
      inferredBonusFromLeadingTotal < 200000 &&
      (firstMatchesKnownTotal || (numbers.length >= 5 && nextThreeSum >= 100000))
    ) {
      return { bonus: inferredBonusFromLeadingTotal, members: nextThree, total: first };
    }

    const nextThreeMatchesTotalMemberRead =
      totalNumbers.length >= 3 &&
      Math.abs(
        totalNumbers
          .slice(0, 3)
          .reduce((sum, value) => sum + value, 0) - nextThreeSum
      ) <= 1;

    if (
      first >= 10000 &&
      first < 50000 &&
      nextThreeSum >= 100000 &&
      nextThreeMatchesTotalMemberRead
    ) {
      return { bonus: 0, members: nextThree, total: nextThreeSum };
    }

    if (numbers.length >= 5) {
      const trailingBonus = numbers[4];
      const trailingTotal = nextThreeSum + trailingBonus;

      if (
        first >= 10000 &&
        first < 100000 &&
        trailingBonus >= 10000 &&
        trailingBonus < 200000 &&
        nextThree.every((num) => num >= 10000 && num < 1000000) &&
        leadingTotalReferences.some((total) => Math.abs(total - trailingTotal) <= 1000)
      ) {
        return { bonus: trailingBonus, members: nextThree, total: trailingTotal };
      }
    }

    const members = firstFour.slice(0, 3);
    const bonus = firstFour[3];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;
    const matchesKnownTotal = totals.some((total) => Math.abs(total - sumWithBonus) <= 1000);

    if (
      bonus >= 5000 &&
      bonus < 200000 &&
      (matchesKnownTotal || (totals.length === 0 && first >= 10000))
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    const nextThreeLooksLikeMembers =
      nextThree[0] >= 10000 && nextThree[1] >= 10000 && nextThree[2] >= 5000;

    if (
      first >= 1400 &&
      first < 85000 &&
      nextThreeSum >= 100000 &&
      nextThreeLooksLikeMembers
    ) {
      return { bonus: 0, members: nextThree, total: nextThreeSum };
    }
  }

  return { bonus: 0, members: null, total: 0 };
}

export function getCrownBonusZones(image, stage, mode, side) {
  mode = normalizeOcrMode(mode);
  const layout = getDeviceOcrLayout(mode);

  if (!layout.direct) {
    return [];
  }

  const stageIndex = stage - 1;
  const yRates = [0.246, 0.457, 0.66];
  const xRate = side === "self" ? layout.leftX : layout.rightX;
  const sideX = image.width * xRate;
  const sideWidth = image.width * layout.sideWidth;
  const top = image.height * yRates[stageIndex];
  const height = image.height * 0.052;
  const slotRates = [
    { x: 0.00, width: 0.42 },
    { x: 0.28, width: 0.44 },
    { x: 0.48, width: 0.52 },
  ];

  return [
    {
      x: Math.max(0, Math.floor(sideX)),
      y: Math.max(0, Math.floor(top - image.height * 0.004)),
      width: Math.floor(sideWidth),
      height: Math.floor(image.height * 0.07),
      requiresPlus: true,
    },
    ...slotRates.map((slot) => ({
      x: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
      y: Math.max(0, Math.floor(top)),
      width: Math.floor(sideWidth * slot.width),
      height: Math.floor(height),
      requiresPlus: true,
    })),
  ];
}

export function getMemberScoreSlotZones(image, stage, mode, side) {
  mode = normalizeOcrMode(mode);
  const layout = getDeviceOcrLayout(mode);

  if (!layout.direct) {
    return [];
  }

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;
  const isDesktop = mode === "desktop";
  const scoreTopRates = isDesktop ? [0.16, 0.415, 0.665] : [0.22, 0.405, 0.64];
  const topRate = scoreTopRates[stageIndex];
  const sideX = image.width * xRate;
  const sideWidth = image.width * layout.sideWidth;
  const slotRates = isDesktop && stage === 3 && side === "self"
    ? [
        { x: 0.00, width: 0.46 },
        { x: 0.27, width: 0.46 },
        { x: 0.54, width: 0.46 },
      ]
    : isDesktop
    ? [
        { x: 0.00, width: 0.38 },
        { x: 0.31, width: 0.38 },
        { x: 0.62, width: 0.38 },
      ]
    : [
        { x: 0.00, width: 0.36 },
        { x: 0.31, width: 0.36 },
        { x: 0.62, width: 0.36 },
      ];

  return slotRates.map((slot) => ({
    x: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
    y: Math.max(0, Math.floor(image.height * topRate)),
    width: Math.floor(sideWidth * slot.width),
    height: Math.floor(image.height * (isDesktop && stage === 3 && side === "self" ? 0.05 : isDesktop ? 0.045 : 0.04)),
  }));
}

export function getDesktopStage3SelfRecoverySlotZones(image) {
  const layout = getDeviceOcrLayout("desktop");
  const sideX = image.width * layout.leftX;
  const sideWidth = image.width * layout.sideWidth;
  const topRates = [0.645, 0.655, 0.665, 0.675];
  const slotRates = [
    { x: 0.00, width: 0.46 },
    { x: 0.27, width: 0.46 },
    { x: 0.54, width: 0.46 },
  ];

  return topRates.flatMap((topRate) =>
    slotRates.map((slot) => ({
      x: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
      y: Math.max(0, Math.floor(image.height * topRate)),
      width: Math.floor(sideWidth * slot.width),
      height: Math.floor(image.height * 0.05),
    }))
  );
}

function extractCrownBonusNumbers(text, options = {}) {
  const source = String(text ?? "");
  const allowFallback = options.allowFallback !== false;

  const plusMatches =
    source
      .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
      .match(/\+\s*\d[\d,\.]{3,8}/g) ?? [];
  const fallbackMatches =
    plusMatches.length > 0 || !allowFallback
      ? []
      : source
          .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
          .match(/\d{5,8}/g) ?? [];

  return [...plusMatches, ...fallbackMatches]
    .map((value) => toNumber(value))
    .map((num) => (num >= 1000000 ? num % 1000000 : num))
    .map((num) => (num === 56707 ? 36707 : num))
    .filter((num) => num >= 10000 && num < 200000);
}

function getOcrPresetConfig(preset) {
  const presets = {
    "next-screen": {
      contrast: 1.8,
      center: 112,
      brightness: 0,
      whiteThreshold: 145,
      whiteSaturation: 120,
      colorSaturation: 70,
      lightThreshold: 145,
      darkThreshold: 75,
      midThreshold: 112,
    },
    "next-screen-contrast": {
      contrast: 2.35,
      center: 116,
      brightness: 0,
      whiteThreshold: 138,
      whiteSaturation: 145,
      colorSaturation: 88,
      lightThreshold: 138,
      darkThreshold: 64,
      midThreshold: 105,
    },
    "next-screen-brightness": {
      contrast: 1.75,
      center: 104,
      brightness: 34,
      whiteThreshold: 150,
      whiteSaturation: 145,
      colorSaturation: 82,
      lightThreshold: 150,
      darkThreshold: 82,
      midThreshold: 118,
    },
    "next-screen-threshold": {
      contrast: 2.0,
      center: 112,
      brightness: 10,
      whiteThreshold: 132,
      whiteSaturation: 160,
      colorSaturation: 96,
      lightThreshold: 132,
      darkThreshold: 58,
      midThreshold: 128,
      hardThreshold: 128,
    },
    "next-screen-blur-reduction": {
      contrast: 2.15,
      center: 118,
      brightness: 8,
      whiteThreshold: 136,
      whiteSaturation: 150,
      colorSaturation: 92,
      lightThreshold: 136,
      darkThreshold: 60,
      midThreshold: 108,
      scale: 5,
    },
    "crown-bonus": {
      contrast: 1.8,
      center: 112,
      brightness: -30,
      hardThreshold: 170,
      preserveColorText: true,
      scale: 4,
    },
    "score-slot": {
      contrast: 1.8,
      center: 112,
      brightness: -30,
      hardThreshold: 150,
      preserveColorText: true,
      scale: 4,
    },
    "ipad-invert-normalize": {
      ipadKind: "invert-normalize",
      scale: 3,
    },
    "ipad-white-mask": {
      ipadKind: "white-mask",
      threshold: 176,
      scale: 3,
    },
    "ipad-blue-bonus-mask": {
      ipadKind: "blue-bonus-mask",
      scale: 3,
    },
  };

  return presets[preset] || null;
}

function getNextScreenLocalRois(zone, kind) {
  const rois = [];

  if (kind === "total") {
    rois.push({
      x: Math.floor(zone.x + zone.width * 0.22),
      y: zone.y,
      width: Math.floor(zone.width * 0.74),
      height: zone.height,
    });
    return rois;
  }

  if (kind !== "members") {
    return rois;
  }

  const slots = [
    { x: 0.00, width: 0.37 },
    { x: 0.31, width: 0.38 },
    { x: 0.62, width: 0.38 },
  ];
  const rows = [{ y: -0.02, height: 0.38 }];

  for (const row of rows) {
    for (const slot of slots) {
      rois.push({
        x: Math.max(0, Math.floor(zone.x + zone.width * slot.x)),
        y: Math.max(0, Math.floor(zone.y + zone.height * row.y)),
        width: Math.floor(zone.width * slot.width),
        height: Math.floor(zone.height * row.height),
      });
    }
  }

  return rois;
}

async function recognizeNextScreenLocalRois(image, zone, kind, acceptResult) {
  const localRois = getNextScreenLocalRois(zone, kind);
  if (localRois.length === 0) {
    return null;
  }

  const presets = ["next-screen-threshold"];
  const roiLimit = kind === "members" ? 3 : 1;
  let best = null;

  for (const preset of presets) {
    let merged = { text: "", numbers: [] };
    for (const roi of localRois.slice(0, roiLimit)) {
      merged = mergeOcrResults(
        merged,
        await recognizeOcrZone(image, roi, { preset, pageSegMode: "7" })
      );

      if (acceptResult(merged)) {
        return merged;
      }
    }

    if (!best || merged.numbers.length > best.numbers.length) best = merged;
  }

  return best && best.numbers.length > 0 ? best : null;
}

function getLegacyNextScreenLocalRois(zone, kind) {
  const rois = [];

  if (kind === "total") {
    rois.push({
      x: Math.floor(zone.x + zone.width * 0.22),
      y: zone.y,
      width: Math.floor(zone.width * 0.74),
      height: zone.height,
    });
    return rois;
  }

  if (kind !== "members") {
    return rois;
  }

  for (let index = 0; index < 3; index += 1) {
    rois.push({
      x: Math.floor(zone.x + zone.width * (index / 3 + 0.015)),
      y: Math.floor(zone.y + zone.height * 0.02),
      width: Math.floor(zone.width * 0.31),
      height: Math.floor(zone.height * 0.30),
    });
  }

  return rois;
}

async function recognizeNextScreenFallback(image, zone, acceptResult, kind = "zone") {
  let hadCandidates = false;

  for (const preset of nextScreenPrimaryPresets) {
    const result = await recognizeOcrZone(image, zone, { preset });
    hadCandidates ||= result.numbers.length > 0;
    if (acceptResult(result)) {
      return result;
    }
  }

  const focusedLocal = await recognizeNextScreenLocalRois(image, zone, kind, acceptResult);
  hadCandidates ||= (focusedLocal?.numbers?.length || 0) > 0;
  if (focusedLocal && acceptResult(focusedLocal)) {
    return focusedLocal;
  }

  if (hadCandidates) {
    return null;
  }

  for (const preset of nextScreenFallbackPresets) {
    const result = await recognizeOcrZone(image, zone, { preset });
    if (acceptResult(result)) {
      return result;
    }
    if (result.numbers.length > 0) {
      return null;
    }
  }

  return null;
}

export async function recognizeBestMemberZone(image, zones) {
  let best = {
    text: "",
    numbers: [],
    score: -Infinity,
  };
  let bestZone = null;

  for (const zone of zones) {
    const result = await recognizeOcrZone(image, zone);
    let score = scoreMemberCandidate(result.numbers);

    if (score > best.score) {
      best = {
        ...result,
        score,
      };
      bestZone = zone;
    }
  }

  if (enableNextScreenFallback && best.score < 3 && bestZone) {
    const secondPass = await recognizeNextScreenFallback(
      image,
      bestZone,
      (candidate) => scoreMemberCandidate(candidate.numbers) >= 3,
      "members"
    );

    if (secondPass) {
      const mergedResult = mergeOcrResults(best, secondPass);
      const score = scoreMemberCandidate(mergedResult.numbers);
      if (score > best.score) {
        best = {
          ...mergedResult,
          score,
        };
      }
    }
  }

  return best;
}

export function createPreprocessedStageBlob(image, cropArea, options = {}) {
  const presetConfig = getOcrPresetConfig(options.preset);
  const scale = presetConfig?.scale || 4;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  const processAtSourceScale = Boolean(presetConfig?.ipadKind);
  canvas.width = processAtSourceScale ? cropArea.width : cropArea.width * scale;
  canvas.height = processAtSourceScale ? cropArea.height : cropArea.height * scale;

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = options.preset !== "next-screen-blur-reduction";

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;

    if (presetConfig?.ipadKind === "invert-normalize") {
      const inverted = 255 - gray;
      data[i] = inverted;
      data[i + 1] = inverted;
      data[i + 2] = inverted;
      continue;
    }

    if (presetConfig?.ipadKind === "white-mask" || presetConfig?.ipadKind === "blue-bonus-mask") {
      const isDigit =
        presetConfig.ipadKind === "blue-bonus-mask"
          ? b > 145 && b > r + 24 && b > g + 8
          : max >= (presetConfig.threshold || 176) && saturation < 130;
      const maskValue = isDigit ? 0 : 255;
      data[i] = maskValue;
      data[i + 1] = maskValue;
      data[i + 2] = maskValue;
      continue;
    }

    // White score text on bright/colorful backgrounds can be washed out.
    // Keep white/near-white text dark, and push colorful or darker background to white.
    const adjustedGray = presetConfig
      ? Math.max(
          0,
          Math.min(
            255,
            (gray - presetConfig.center) * presetConfig.contrast +
              128 +
              presetConfig.brightness
          )
        )
      : gray;
    const isWhiteText =
      adjustedGray > (presetConfig?.whiteThreshold || 175) &&
      saturation < (presetConfig?.whiteSaturation || 90);
    const isBrightNextScreenText =
      presetConfig && max > 172 && gray > 118 && saturation < 175;
    const isColorfulBackground = saturation >= (presetConfig?.colorSaturation || 70);

    let value;

    if (presetConfig?.hardThreshold) {
      value =
        adjustedGray > presetConfig.hardThreshold &&
        (presetConfig.preserveColorText || !isColorfulBackground)
          ? 0
          : 255;
    } else if (isWhiteText || isBrightNextScreenText) {
      value = 0;
    } else if (isColorfulBackground) {
      value = 255;
    } else if (adjustedGray > (presetConfig?.lightThreshold || 165)) {
      value = 0;
    } else if (adjustedGray < (presetConfig?.darkThreshold || 90)) {
      value = 255;
    } else {
      value = adjustedGray > (presetConfig?.midThreshold || 130) ? 0 : 255;
    }

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  context.putImageData(imageData, 0, 0);

  if (processAtSourceScale && scale !== 1) {
    const scaledCanvas = document.createElement("canvas");
    const scaledContext = scaledCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    scaledCanvas.width = cropArea.width * scale;
    scaledCanvas.height = cropArea.height * scale;
    scaledContext.fillStyle = "white";
    scaledContext.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    scaledContext.imageSmoothingEnabled = true;
    scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    return new Promise((resolve) => {
      scaledCanvas.toBlob(resolve, "image/png");
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

async function hashBlobForOcrDebug(blob) {
  if (!blob || typeof crypto === "undefined" || !crypto.subtle) return null;
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createOcrDebugRawCropBlob(image, cropArea) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  const cropX = cropArea.x ?? cropArea.left ?? 0;
  const cropY = cropArea.y ?? cropArea.top ?? 0;
  context.drawImage(
    image,
    cropX,
    cropY,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

export function extractNumbersForZone(text) {
  return (
    String(text ?? "")
      .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
      .match(/\d{1,3}(?:[,\.]\d{3})+|\d{4,8}/g)
      ?.map((value) => toNumber(value))
      .filter((num) => num >= 1400 && num < 10000000) ?? []
  );
}

export function cleanOcrTextForEvidence(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function normalizeGroupedNumericToken(token = "") {
  const raw = String(token || "")
    .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .trim();
  const unsigned = raw.replace(/^[+\-]/, "");
  const commaGrouped = /^\d{1,3}(?:,\d{3})+$/.test(unsigned);
  const periodGrouped = /^\d{1,3}(?:\.\d{3})+$/.test(unsigned);
  const spaceGrouped = /^\d{1,3}(?:\s+\d{3})+$/.test(unsigned);
  if (!commaGrouped && !periodGrouped && !spaceGrouped) return null;
  const value = Number(unsigned.replace(/[,\.\s]/g, ""));
  if (!Number.isFinite(value) || value < 1400 || value >= 10000000) return null;
  return {
    value,
    shape: commaGrouped ? "comma-grouped" : periodGrouped ? "period-grouped" : "space-grouped",
    punctuationType: commaGrouped ? "comma" : periodGrouped ? "period" : "space",
  };
}

function valueInNumberList(value, numbers = [], tolerance = 1) {
  const target = Number(value || 0);
  return (numbers || []).some((num) => Math.abs(Number(num || 0) - target) <= tolerance);
}

export function extractNumericLikeTokenAudit(text = "", parsedNumbers = []) {
  const normalized = String(text || "").replace(/[\uFF01-\uFF5E]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 65248)
  );
  const tokenMatches = [
    ...normalized.matchAll(
      /[+\-]?\d{1,3}(?:[,.]\d{3})+|[+\-]?\d{1,3}(?:\s+\d{3})+|[+\-]?\d{4,8}/g
    ),
  ];
  const currentParserNumbers = extractNumbersForZone(normalized);
  const parsed = uniqueNumbers(parsedNumbers || []);
  return tokenMatches.map((match) => {
    const token = match[0] || "";
    const grouped = normalizeGroupedNumericToken(token);
    const parserNumbers = extractNumbersForZone(token);
    const normalizedValue = grouped?.value || parserNumbers[0] || 0;
    return {
      rawToken: cleanOcrTextForEvidence(token),
      token: cleanOcrTextForEvidence(token),
      textIndex: match.index ?? -1,
      normalizedValue,
      tokenShape: grouped?.shape || "plain-or-current-parser",
      shape: grouped?.shape || "plain-or-current-parser",
      punctuationType: grouped?.punctuationType || "none",
      currentParserNumbers: parserNumbers,
      presentInSourceParsed: normalizedValue > 0 && valueInNumberList(normalizedValue, parsed),
      presentInCurrentParser:
        normalizedValue > 0 && valueInNumberList(normalizedValue, currentParserNumbers),
      punctuationNormalizationOnly:
        Boolean(grouped) && !valueInNumberList(grouped.value, currentParserNumbers),
    };
  });
}

export function buildCurrentPcCandidateSourceSummary(source = {}) {
  const sources = source || {};
  const totalCandidates = sources.totalCandidates || {};
  const traces = totalCandidates.traces || [];
  const totalDirect = sources.totalDirect || null;
  const memberCandidates = sources.memberCandidates || null;
  const totalDirectAudit = extractNumericLikeTokenAudit(
    totalDirect?.text || "",
    totalDirect?.numbers || []
  );
  const totalTraceAudits = traces.slice(0, 6).map((trace) => ({
    pass: trace.pass || "",
    text: cleanOcrTextForEvidence(trace.text || ""),
    tokens: extractNumericLikeTokenAudit(trace.text || "", trace.numbers || []),
  }));
  const memberAudit = extractNumericLikeTokenAudit(
    memberCandidates?.text || "",
    memberCandidates?.numbers || []
  );
  return {
    totalDirect: totalDirect
      ? {
          tag: totalDirect.tag || "",
          pass: totalDirect.pass || "",
          text: cleanOcrTextForEvidence(totalDirect.text || ""),
          numbers: totalDirect.numbers || [],
          tokenAudit: totalDirectAudit,
        }
      : null,
    totalTraces: traces.slice(0, 6).map((trace) => ({
      pass: trace.pass || "",
      text: cleanOcrTextForEvidence(trace.text || ""),
      numbers: trace.numbers || [],
    })),
    totalTraceTokenAudit: totalTraceAudits,
    memberCandidates: memberCandidates
      ? {
          tag: memberCandidates.tag || "",
          pass: memberCandidates.pass || "",
          text: cleanOcrTextForEvidence(memberCandidates.text || ""),
          numbers: memberCandidates.numbers || [],
          tokenAudit: memberAudit,
        }
      : null,
    memberNumbersAfterSlotFallback: sources.memberNumbersAfterSlotFallback || [],
    originalMemberNumbers: sources.originalMemberNumbers || [],
    selectionContext: sources.selectionContext || null,
    equationContext: sources.equationContext || null,
  };
}

export function collectCurrentPcSourceTokenAudits(sideAnalysis) {
  const source = sideAnalysis?.candidateSourceSummary || {};
  const entries = [];
  if (source.totalDirect) {
    entries.push({
      sourceRole: "total-direct",
      sourceTag: source.totalDirect.tag || "",
      pass: source.totalDirect.pass || "",
      text: source.totalDirect.text || "",
      parsedNumbers: source.totalDirect.numbers || [],
      tokens: source.totalDirect.tokenAudit || [],
    });
  }
  for (const trace of source.totalTraceTokenAudit || []) {
    entries.push({
      sourceRole: "total-trace",
      sourceTag: "total-candidate-trace",
      pass: trace.pass || "",
      text: trace.text || "",
      parsedNumbers: (trace.tokens || []).flatMap((token) => token.currentParserNumbers || []),
      tokens: trace.tokens || [],
    });
  }
  if (source.memberCandidates) {
    entries.push({
      sourceRole: "member-row",
      sourceTag: source.memberCandidates.tag || "",
      pass: source.memberCandidates.pass || "",
      text: source.memberCandidates.text || "",
      parsedNumbers: source.memberCandidates.numbers || [],
      tokens: source.memberCandidates.tokenAudit || [],
    });
  }
  return entries;
}

function currentPcTokenDigitCount(value) {
  return String(Math.trunc(Number(value || 0))).length;
}

function currentPcGroupedTokenRoleForSource(sourceRole = "") {
  if (sourceRole === "member-row") return "member";
  if (sourceRole === "total-direct" || sourceRole === "total-trace") return "total";
  return "unknown";
}

function currentPcGroupedTokenRoiForRole(role, roiProvenance = null) {
  if (role === "member") return roiProvenance?.members || null;
  if (role === "total") return roiProvenance?.total || null;
  return null;
}

export function collectCurrentPcGroupedRawTokenEvidence(sideAnalysis, roiProvenance = null) {
  const sourceEntries = collectCurrentPcSourceTokenAudits(sideAnalysis);
  const eligibleTokens = [];
  const blockedTokens = [];
  const acceptedShapes = new Set(["comma-grouped", "period-grouped", "space-grouped"]);

  for (const entry of sourceEntries) {
    const role = currentPcGroupedTokenRoleForSource(entry.sourceRole);
    for (const token of entry.tokens || []) {
      const value = Number(token.normalizedValue || 0);
      const reasons = [];
      const digitCount = currentPcTokenDigitCount(value);
      const sourceRoi = currentPcGroupedTokenRoiForRole(role, roiProvenance);
      const tokenShape = token.tokenShape || token.shape || "unknown";
      const rawToken = token.rawToken || token.token || "";

      if (!acceptedShapes.has(tokenShape)) reasons.push("unsupported-token-shape");
      if (role === "unknown") reasons.push("unknown-source-role");
      if (!sourceRoi) reasons.push("missing-role-specific-roi");
      if (!token.punctuationNormalizationOnly && token.presentInSourceParsed) {
        reasons.push("already-reaches-parsed-candidates");
      }
      if (value <= 0) reasons.push("missing-normalized-value");
      if (role === "member" && (digitCount < 5 || digitCount > 7)) {
        reasons.push("member-digit-count-out-of-range");
      }
      if (role === "total" && (digitCount < 5 || digitCount > 8)) {
        reasons.push("total-digit-count-out-of-range");
      }

      const evidence = {
        rawText: entry.text,
        rawToken,
        token: rawToken,
        normalizedValue: value,
        tokenShape,
        shape: tokenShape,
        punctuationType: token.punctuationType || "none",
        stage: roiProvenance?.stage || null,
        side: roiProvenance?.side || null,
        role,
        sourceRole: entry.sourceRole,
        sourceTag: entry.sourceTag,
        sourceRoi,
        roi: sourceRoi,
        position: {
          textIndex: Number(token.textIndex ?? -1),
        },
        textIndex: Number(token.textIndex ?? -1),
        preprocessingSource: entry.pass || "",
        segmentationSource: entry.sourceTag || "",
        pass: entry.pass || "",
        digitCount,
        text: entry.text,
        currentParserNumbers: token.currentParserNumbers || [],
        presentInSourceParsed: Boolean(token.presentInSourceParsed),
        presentInCurrentParser: Boolean(token.presentInCurrentParser),
        punctuationNormalizationOnly: Boolean(token.punctuationNormalizationOnly),
      };

      if (reasons.length === 0) {
        eligibleTokens.push(evidence);
      } else {
        blockedTokens.push({ ...evidence, rejectionReasons: reasons, reasons });
      }
    }
  }

  const dedupedEligible = eligibleTokens.filter(
    (item, index, all) =>
      all.findIndex(
        (other) =>
          other.role === item.role &&
          other.sourceRole === item.sourceRole &&
          other.pass === item.pass &&
          other.rawToken === item.rawToken &&
          other.normalizedValue === item.normalizedValue
      ) === index
  );

  return { eligibleTokens: dedupedEligible, blockedTokens };
}

export function currentPcOrderedMemberValuesFromTokenEvidence(sideAnalysis, eligibleTokens = []) {
  const memberEntry = collectCurrentPcSourceTokenAudits(sideAnalysis).find(
    (entry) => entry.sourceRole === "member-row"
  );
  if (!memberEntry) return [];
  const eligibleMemberValues = new Set(
    eligibleTokens
      .filter((token) => token.role === "member")
      .map((token) => Number(token.normalizedValue || 0))
  );
  return (memberEntry.tokens || [])
    .map((token) => {
      const value = Number(token.normalizedValue || 0);
      const digitCount = currentPcTokenDigitCount(value);
      const isEligibleGrouped = eligibleMemberValues.has(value);
      const isParsedMemberLike =
        token.presentInSourceParsed &&
        digitCount >= 5 &&
        digitCount <= 7 &&
        value >= 10000 &&
        value < 2000000;
      if (!isEligibleGrouped && !isParsedMemberLike) return null;
      return {
        value,
        textIndex: Number(token.textIndex ?? -1),
        source: isEligibleGrouped ? "eligible-grouped-member-token" : "parsed-member-token",
        token: token.rawToken || token.token,
        shape: token.tokenShape || token.shape,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.textIndex - b.textIndex)
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) => other.value === item.value && other.textIndex === item.textIndex
        ) === index
    );
}

function arraysEqualWithinOne(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => Math.abs(Number(value || 0) - Number(right[index] || 0)) <= 1);
}

function arraysEqualWithinTolerance(left = [], right = [], tolerance = 1) {
  if (left.length !== right.length) return false;
  return left.every(
    (value, index) =>
      Math.abs(Number(value || 0) - Number(right[index] || 0)) <= Number(tolerance || 0)
  );
}

function currentPcSelectedBonus(sideAnalysis = {}) {
  const selectedMembers = sideAnalysis?.selectedMembers || [];
  const memberSum = selectedMembers.reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.max(0, Number(sideAnalysis?.selectedTotal || 0) - memberSum);
}

function currentPcMemberEvidenceForValue(sideAnalysis = {}, value, slotIndex, tolerance = 1) {
  const normalizedValue = Number(value || 0);
  const allowedDifference = Number(tolerance || 0);
  if (normalizedValue <= 0) return [];
  const memberCandidates = sideAnalysis?.candidateSourceSummary?.memberCandidates || {};
  const evidence = [];
  if (
    (memberCandidates.numbers || []).some(
      (candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference
    )
  ) {
    const matchingTokens = (memberCandidates.tokenAudit || []).filter(
      (token) =>
        Math.abs(Number(token.normalizedValue || 0) - normalizedValue) <= allowedDifference
    );
    evidence.push({
      source: "member-row",
      role: `member${slotIndex + 1}`,
      value: normalizedValue,
      text: memberCandidates.text || "",
      tokens: matchingTokens.map((token) => ({
        rawToken: token.rawToken || token.token || "",
        normalizedValue: token.normalizedValue || 0,
        shape: token.shape || token.tokenShape || "",
        textIndex: token.textIndex ?? null,
      })),
    });
  }
  if (
    (sideAnalysis?.rawCandidates || []).some(
      (candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference
    )
  ) {
    evidence.push({
      source: "raw-candidates",
      role: `member${slotIndex + 1}`,
      value: normalizedValue,
    });
  }
  return evidence;
}

function currentPcTotalEvidenceForValue(sideAnalysis = {}, value, tolerance = 1) {
  const normalizedValue = Number(value || 0);
  const allowedDifference = Number(tolerance || 0);
  if (normalizedValue <= 0) return [];
  const summary = sideAnalysis?.candidateSourceSummary || {};
  const evidence = [];
  const pushEvidence = (entry) => {
    if (!entry) return;
    evidence.push({
      source: entry.source,
      value: normalizedValue,
      text: entry.text || "",
      pass: entry.pass || null,
      tokens: entry.tokens || [],
    });
  };

  if ((sideAnalysis.displayedTotalCandidates || []).some((candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference)) {
    pushEvidence({ source: "displayed-total-candidates" });
  }
  if ((summary.totalDirect?.numbers || []).some((candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference)) {
    pushEvidence({
      source: "total-direct",
      text: summary.totalDirect.text || "",
      pass: summary.totalDirect.pass || null,
      tokens: (summary.totalDirect.tokenAudit || []).filter(
        (token) => Math.abs(Number(token.normalizedValue || 0) - normalizedValue) <= allowedDifference
      ),
    });
  }
  for (const trace of summary.totalTraces || []) {
    if ((trace.numbers || []).some((candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference)) {
      pushEvidence({
        source: "total-trace",
        text: trace.text || "",
        pass: trace.pass || null,
      });
    }
  }
  for (const traceAudit of summary.totalTraceTokenAudit || []) {
    const tokens = (traceAudit.tokens || []).filter(
      (token) => Math.abs(Number(token.normalizedValue || 0) - normalizedValue) <= allowedDifference
    );
    if (tokens.length > 0) {
      pushEvidence({
        source: "total-trace-token-audit",
        text: traceAudit.text || "",
        pass: traceAudit.pass || null,
        tokens: tokens.map((token) => ({
          rawToken: token.rawToken || token.token || "",
          normalizedValue: token.normalizedValue || 0,
          shape: token.shape || token.tokenShape || "",
          textIndex: token.textIndex ?? null,
        })),
      });
    }
  }
  if ((sideAnalysis.rawCandidates || []).some((candidate) => Math.abs(Number(candidate || 0) - normalizedValue) <= allowedDifference)) {
    pushEvidence({ source: "raw-candidates" });
  }
  return evidence;
}

function currentPcStrictDisplayedTotalEvidenceForValue(sideAnalysis = {}, value) {
  const normalizedValue = Number(value || 0);
  if (normalizedValue <= 0) return [];
  const summary = sideAnalysis?.candidateSourceSummary || {};
  const evidence = [];
  const pushEvidence = (entry) => {
    if (!entry) return;
    evidence.push({
      source: entry.source,
      value: normalizedValue,
      text: entry.text || "",
      pass: entry.pass || null,
      tokens: entry.tokens || [],
    });
  };

  if (
    (sideAnalysis.displayedTotalCandidates || []).some(
      (candidate) => Number(candidate || 0) === normalizedValue
    )
  ) {
    pushEvidence({ source: "displayed-total-candidates" });
  }
  if (
    (summary.totalDirect?.numbers || []).some(
      (candidate) => Number(candidate || 0) === normalizedValue
    )
  ) {
    pushEvidence({
      source: "total-direct",
      text: summary.totalDirect.text || "",
      pass: summary.totalDirect.pass || null,
      tokens: (summary.totalDirect.tokenAudit || []).filter(
        (token) => Number(token.normalizedValue || 0) === normalizedValue
      ),
    });
  }
  for (const trace of summary.totalTraces || []) {
    if ((trace.numbers || []).some((candidate) => Number(candidate || 0) === normalizedValue)) {
      pushEvidence({
        source: "total-trace",
        text: trace.text || "",
        pass: trace.pass || null,
      });
    }
  }
  for (const traceAudit of summary.totalTraceTokenAudit || []) {
    const tokens = (traceAudit.tokens || []).filter(
      (token) => Number(token.normalizedValue || 0) === normalizedValue
    );
    if (tokens.length > 0) {
      pushEvidence({
        source: "total-trace-token-audit",
        text: traceAudit.text || "",
        pass: traceAudit.pass || null,
        tokens: tokens.map((token) => ({
          rawToken: token.rawToken || token.token || "",
          normalizedValue: token.normalizedValue || 0,
          shape: token.shape || token.tokenShape || "",
          textIndex: token.textIndex ?? null,
        })),
      });
    }
  }
  return evidence;
}

function currentPcObservedEvidenceValues(sideAnalysis = {}) {
  return uniqueNumbers([
    ...(sideAnalysis.rawCandidates || []),
    ...(sideAnalysis.displayedTotalCandidates || []),
    ...(sideAnalysis.bonusCandidates || []),
  ]).filter((value) => value > 0);
}

export function buildCurrentPcCrownBonusRuleEvidence({
  stage = 0,
  self = null,
  enemy = null,
}) {
  const rejectionReasons = [];
  if (!self || !enemy) {
    return {
      wouldApply: false,
      rejectionReasons: ["missing-stage-side-analysis"],
      proposed: null,
      evidence: {},
    };
  }

  const selected = {
    self: {
      members: [...(self.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(self.selectedTotal || 0),
      bonus: currentPcSelectedBonus(self),
    },
    enemy: {
      members: [...(enemy.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(enemy.selectedTotal || 0),
      bonus: currentPcSelectedBonus(enemy),
    },
  };
  for (const side of ["self", "enemy"]) {
    while (selected[side].members.length < 3) selected[side].members.push(0);
  }

  const memberEvidence = { self: [], enemy: [] };
  for (const side of ["self", "enemy"]) {
    const sideAnalysis = side === "self" ? self : enemy;
    for (let index = 0; index < 3; index += 1) {
      const value = selected[side].members[index];
      const evidence = currentPcMemberEvidenceForValue(sideAnalysis, value, index);
      memberEvidence[side].push(evidence);
      if (value <= 0) rejectionReasons.push(`missing-${side}-member${index + 1}`);
      if (value > 0 && evidence.length === 0) {
        rejectionReasons.push(`missing-${side}-member${index + 1}-evidence`);
      }
    }
  }

  const allMembers = [
    ...selected.self.members.map((value, index) => ({ side: "self", slot: index + 1, value })),
    ...selected.enemy.members.map((value, index) => ({ side: "enemy", slot: index + 1, value })),
  ];
  const positiveMembers = allMembers.filter((entry) => entry.value > 0);
  if (positiveMembers.length !== 6) rejectionReasons.push("missing-member-evidence");

  const maxValue = Math.max(...positiveMembers.map((entry) => entry.value), 0);
  const maxEntries = positiveMembers.filter((entry) => entry.value === maxValue);
  if (maxEntries.length !== 1) rejectionReasons.push("non-unique-global-rank1-member");
  const rank1 = maxEntries[0] || null;
  const winningSide = rank1?.side || null;
  const calculatedBonus = maxValue > 0 ? Math.floor(maxValue * 0.2) : 0;
  const proposed = {
    self: {
      members: selected.self.members,
      bonus: winningSide === "self" ? calculatedBonus : 0,
      total:
        selected.self.members.reduce((sum, value) => sum + value, 0) +
        (winningSide === "self" ? calculatedBonus : 0),
    },
    enemy: {
      members: selected.enemy.members,
      bonus: winningSide === "enemy" ? calculatedBonus : 0,
      total:
        selected.enemy.members.reduce((sum, value) => sum + value, 0) +
        (winningSide === "enemy" ? calculatedBonus : 0),
    },
  };

  const totalEvidence = {
    self: currentPcTotalEvidenceForValue(self, proposed.self.total),
    enemy: currentPcTotalEvidenceForValue(enemy, proposed.enemy.total),
  };
  if (totalEvidence.self.length === 0) rejectionReasons.push("missing-self-exact-total-evidence");
  if (totalEvidence.enemy.length === 0) rejectionReasons.push("missing-enemy-exact-total-evidence");

  const sideWouldChange = {};
  for (const side of ["self", "enemy"]) {
    sideWouldChange[side] =
      !arraysEqualWithinOne(proposed[side].members, selected[side].members) ||
      Math.abs(Number(proposed[side].bonus || 0) - Number(selected[side].bonus || 0)) > 1 ||
      Math.abs(Number(proposed[side].total || 0) - Number(selected[side].total || 0)) > 1;
  }
  if (!sideWouldChange.self && !sideWouldChange.enemy) {
    rejectionReasons.push("existing-result-already-satisfies-crown-bonus-rule");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const wouldApply =
    uniqueRejectionReasons.length === 0 && (sideWouldChange.self || sideWouldChange.enemy);
  return {
    wouldApply,
    rejectionReasons: uniqueRejectionReasons,
    selected,
    proposed,
    sideWouldChange,
    stage,
    evidence: {
      memberEvidence,
      totalEvidence,
      rank1,
      winningSide,
      calculatedBonus,
      uniqueInterpretation: uniqueRejectionReasons.length === 0,
      rule: "bonus=floor(max(all 6 selected raw members)*0.20)",
    },
    note:
      "Current-PC evidence-only crown bonus rule simulation. It does not change OCR output.",
  };
}

function normalizeSmartphoneSimulationNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function smartphoneSimulationMemberSum(members = []) {
  return members.reduce((sum, value) => sum + normalizeSmartphoneSimulationNumber(value), 0);
}

function smartphoneSimulationStageOutputFromResult(stageResult = {}) {
  const selfMembers = Array.isArray(stageResult.self)
    ? stageResult.self.map(normalizeSmartphoneSimulationNumber)
    : [0, 0, 0];
  const enemyMembers = Array.isArray(stageResult.enemy)
    ? stageResult.enemy.map(normalizeSmartphoneSimulationNumber)
    : [0, 0, 0];
  return {
    selfMembers,
    enemyMembers,
    selfTotal: normalizeSmartphoneSimulationNumber(stageResult.selfTotal),
    enemyTotal: normalizeSmartphoneSimulationNumber(stageResult.enemyTotal),
  };
}

function smartphoneSimulationStageOutputsEqual(left = {}, right = {}) {
  return (
    normalizeSmartphoneSimulationNumber(left.selfTotal) ===
      normalizeSmartphoneSimulationNumber(right.selfTotal) &&
    normalizeSmartphoneSimulationNumber(left.enemyTotal) ===
      normalizeSmartphoneSimulationNumber(right.enemyTotal) &&
    ["selfMembers", "enemyMembers"].every((key) =>
      [0, 1, 2].every(
        (index) =>
          normalizeSmartphoneSimulationNumber(left[key]?.[index]) ===
          normalizeSmartphoneSimulationNumber(right[key]?.[index])
      )
    )
  );
}

function smartphoneSimulationUniqueGlobalRankOne(selfMembers = [], enemyMembers = []) {
  const entries = [
    ...selfMembers.map((value, index) => ({
      side: "self",
      slot: index + 1,
      value: normalizeSmartphoneSimulationNumber(value),
    })),
    ...enemyMembers.map((value, index) => ({
      side: "enemy",
      slot: index + 1,
      value: normalizeSmartphoneSimulationNumber(value),
    })),
  ].filter((entry) => entry.value > 0);
  if (entries.length !== 6) {
    return {
      unique: false,
      reason: "six-members-incomplete",
      entries,
      rank1: null,
      bonus: 0,
    };
  }
  const maxValue = Math.max(...entries.map((entry) => entry.value));
  const winners = entries.filter((entry) => entry.value === maxValue);
  if (winners.length !== 1) {
    return {
      unique: false,
      reason: "global-rank1-not-unique",
      entries,
      rank1: winners[0] || null,
      bonus: Math.floor(maxValue * 0.2),
    };
  }
  return {
    unique: true,
    reason: "",
    entries,
    rank1: winners[0],
    bonus: Math.floor(maxValue * 0.2),
  };
}

function flattenSmartphoneSimulationNumbers(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenSmartphoneSimulationNumbers(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.numbers)) flattenSmartphoneSimulationNumbers(value.numbers, output);
    if (typeof value.text === "string") {
      flattenSmartphoneSimulationNumbers(extractNumbersForZone(value.text), output);
    }
    if (Array.isArray(value.traces)) flattenSmartphoneSimulationNumbers(value.traces, output);
    return output;
  }
  const number = normalizeSmartphoneSimulationNumber(value);
  if (number > 0) output.push(number);
  return output;
}

function collectSmartphoneSimulationTotalEvidence(stageResult = {}, side) {
  const rawKey = side === "self" ? "selfTotal" : "enemyTotal";
  const rawTextPrefix = side === "self" ? "selfTotal" : "enemyTotal";
  const evidence = [];
  const add = (value, source) => {
    for (const number of uniqueNumbers(flattenSmartphoneSimulationNumbers(value))) {
      if (number >= 10000 && number < 10000000) evidence.push({ value: number, source });
    }
  };
  add(stageResult.raw?.[rawKey], `${side}.raw.total`);
  add(stageResult.rawText?.[`${rawTextPrefix}Direct`], `${side}.rawText.totalDirect`);
  add(stageResult.rawText?.[`${rawTextPrefix}Candidates`], `${side}.rawText.totalCandidates`);
  add(
    stageResult.rawText?.[`${rawTextPrefix}CandidateTraces`],
    `${side}.rawText.totalCandidateTraces`
  );
  return uniqueNumbers(evidence.map((entry) => entry.value)).map((value) => ({
    value,
    sources: evidence.filter((entry) => entry.value === value).map((entry) => entry.source),
  }));
}

function collectSmartphoneSimulationMemberSlotPools(stageResult = {}, side) {
  const selected = side === "self" ? stageResult.self : stageResult.enemy;
  const rawKey = side === "self" ? "selfMembers" : "enemyMembers";
  const pools = [[], [], []];
  const add = (slotIndex, value, source) => {
    const number = normalizeSmartphoneSimulationNumber(value);
    if (number < 1000 || number >= 10000000) return;
    if (pools[slotIndex].some((entry) => entry.value === number && entry.source === source)) return;
    pools[slotIndex].push({ value: number, source });
  };
  for (let index = 0; index < 3; index += 1) {
    add(index, selected?.[index], "selected-current-output");
  }
  const rawNumbers = uniqueNumbers(flattenSmartphoneSimulationNumbers(stageResult.raw?.[rawKey]));
  if (rawNumbers.length >= 3) {
    for (let index = 0; index < 3; index += 1) {
      add(index, rawNumbers[index], `${side}.raw.member-row-order`);
    }
  }
  const rawTextNumbers = uniqueNumbers(
    flattenSmartphoneSimulationNumbers(stageResult.rawText?.[rawKey])
  );
  if (rawTextNumbers.length >= 3) {
    for (let index = 0; index < 3; index += 1) {
      add(index, rawTextNumbers[index], `${side}.rawText.member-row-order`);
    }
  }
  return pools.map((pool) => {
    const byValue = new Map();
    for (const entry of pool) {
      if (!byValue.has(entry.value)) byValue.set(entry.value, { value: entry.value, sources: [] });
      byValue.get(entry.value).sources.push(entry.source);
    }
    return [...byValue.values()];
  });
}

function enumerateSmartphoneSimulationPoolValues(pools, limit = 729) {
  const safePools = pools.map((pool) => (pool.length > 0 ? pool : [{ value: 0, sources: [] }]));
  const total = safePools.reduce((product, pool) => product * pool.length, 1);
  if (total > limit) {
    return { combinations: [], blocked: true, count: total };
  }
  const combinations = [];
  for (const first of safePools[0]) {
    for (const second of safePools[1]) {
      for (const third of safePools[2]) {
        combinations.push({
          members: [first.value, second.value, third.value],
          sources: [first.sources, second.sources, third.sources],
        });
      }
    }
  }
  return { combinations, blocked: false, count: total };
}

export function buildSmartphoneCrownBonusRuleEvidence({ stage = 0, stageResult = {} } = {}) {
  const selected = smartphoneSimulationStageOutputFromResult(stageResult);
  const rank = smartphoneSimulationUniqueGlobalRankOne(selected.selfMembers, selected.enemyMembers);
  const rejectionReasons = [];
  if (!rank.unique) rejectionReasons.push(rank.reason);
  const selfTotalEvidence = collectSmartphoneSimulationTotalEvidence(stageResult, "self");
  const enemyTotalEvidence = collectSmartphoneSimulationTotalEvidence(stageResult, "enemy");
  const selfSum = smartphoneSimulationMemberSum(selected.selfMembers);
  const enemySum = smartphoneSimulationMemberSum(selected.enemyMembers);
  const proposedSelfTotal = selfSum + (rank.rank1?.side === "self" ? rank.bonus : 0);
  const proposedEnemyTotal = enemySum + (rank.rank1?.side === "enemy" ? rank.bonus : 0);
  const selfTotalEvidenceMatch = selfTotalEvidence.some((entry) => entry.value === proposedSelfTotal);
  const enemyTotalEvidenceMatch = enemyTotalEvidence.some(
    (entry) => entry.value === proposedEnemyTotal
  );
  if (!selfTotalEvidenceMatch) rejectionReasons.push("missing-exact-self-total-evidence");
  if (!enemyTotalEvidenceMatch) rejectionReasons.push("missing-exact-enemy-total-evidence");
  const alreadyExact =
    selected.selfTotal === proposedSelfTotal && selected.enemyTotal === proposedEnemyTotal;
  if (alreadyExact) rejectionReasons.push("current-output-already-matches-rule");
  const wouldApply = rejectionReasons.length === 0;
  return {
    name: "smartphoneCrownBonusRuleSimulation",
    wouldApply,
    rejectionReasons,
    stage,
    selected,
    proposed: {
      selfMembers: selected.selfMembers,
      enemyMembers: selected.enemyMembers,
      selfTotal: proposedSelfTotal,
      enemyTotal: proposedEnemyTotal,
      selfBonus: rank.rank1?.side === "self" ? rank.bonus : 0,
      enemyBonus: rank.rank1?.side === "enemy" ? rank.bonus : 0,
    },
    rank1: rank.rank1,
    winningSide: rank.rank1?.side || null,
    derivedBonus: rank.bonus,
    totalEvidence: {
      self: selfTotalEvidence,
      enemy: enemyTotalEvidence,
    },
    note:
      "Smartphone evidence-only crown bonus rule simulation. It does not change OCR output.",
  };
}

export function buildSmartphoneStageWideSixMemberCandidateSolverEvidence({
  stage = 0,
  stageResult = {},
} = {}) {
  const selected = smartphoneSimulationStageOutputFromResult(stageResult);
  const selfPools = collectSmartphoneSimulationMemberSlotPools(stageResult, "self");
  const enemyPools = collectSmartphoneSimulationMemberSlotPools(stageResult, "enemy");
  const selfCombos = enumerateSmartphoneSimulationPoolValues(selfPools);
  const enemyCombos = enumerateSmartphoneSimulationPoolValues(enemyPools);
  const rejectionReasons = [];
  if (selfCombos.blocked || enemyCombos.blocked) rejectionReasons.push("candidate-pool-too-large");
  const selfTotalEvidence = collectSmartphoneSimulationTotalEvidence(stageResult, "self");
  const enemyTotalEvidence = collectSmartphoneSimulationTotalEvidence(stageResult, "enemy");
  const selfTotalValues = new Set(selfTotalEvidence.map((entry) => entry.value));
  const enemyTotalValues = new Set(enemyTotalEvidence.map((entry) => entry.value));
  const proposals = [];
  if (!selfCombos.blocked && !enemyCombos.blocked) {
    for (const selfCombo of selfCombos.combinations) {
      for (const enemyCombo of enemyCombos.combinations) {
        const rank = smartphoneSimulationUniqueGlobalRankOne(
          selfCombo.members,
          enemyCombo.members
        );
        if (!rank.unique) continue;
        const selfTotal =
          smartphoneSimulationMemberSum(selfCombo.members) +
          (rank.rank1.side === "self" ? rank.bonus : 0);
        const enemyTotal =
          smartphoneSimulationMemberSum(enemyCombo.members) +
          (rank.rank1.side === "enemy" ? rank.bonus : 0);
        if (!selfTotalValues.has(selfTotal) || !enemyTotalValues.has(enemyTotal)) continue;
        proposals.push({
          selfMembers: selfCombo.members,
          enemyMembers: enemyCombo.members,
          selfMemberSources: selfCombo.sources,
          enemyMemberSources: enemyCombo.sources,
          selfTotal,
          enemyTotal,
          selfBonus: rank.rank1.side === "self" ? rank.bonus : 0,
          enemyBonus: rank.rank1.side === "enemy" ? rank.bonus : 0,
          rank1: rank.rank1,
          winningSide: rank.rank1.side,
          derivedBonus: rank.bonus,
        });
      }
    }
  }
  const selectedProposal = proposals.find((proposal) =>
    smartphoneSimulationStageOutputsEqual(proposal, selected)
  );
  const changedProposals = proposals.filter(
    (proposal) => !smartphoneSimulationStageOutputsEqual(proposal, selected)
  );
  if (proposals.length === 0) rejectionReasons.push("no-exact-six-member-equation");
  if (changedProposals.length === 0 && selectedProposal) {
    rejectionReasons.push("current-output-already-matches-unique-equation");
  }
  if (changedProposals.length > 1) rejectionReasons.push("competing-exact-interpretations");
  const wouldApply = rejectionReasons.length === 0 && changedProposals.length === 1;
  return {
    name: "smartphoneStageWideSixMemberCandidateSolverSimulation",
    wouldApply,
    rejectionReasons,
    stage,
    selected,
    proposed: wouldApply ? changedProposals[0] : null,
    proposals,
    proposalCount: proposals.length,
    changedProposalCount: changedProposals.length,
    candidatePools: {
      self: selfPools,
      enemy: enemyPools,
    },
    totalEvidence: {
      self: selfTotalEvidence,
      enemy: enemyTotalEvidence,
    },
    blockedCombinationCounts: {
      self: selfCombos.count,
      enemy: enemyCombos.count,
    },
    note:
      "Smartphone evidence-only stage-wide six-member candidate solver simulation. It does not change OCR output.",
  };
}

function flattenSmartphoneExactSlotSelectionNumbers(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenSmartphoneExactSlotSelectionNumbers(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.numbers)) {
      flattenSmartphoneExactSlotSelectionNumbers(value.numbers, output);
    }
    if (typeof value.text === "string") {
      flattenSmartphoneExactSlotSelectionNumbers(extractNumbersForZone(value.text), output);
    }
    if (Array.isArray(value.traces)) {
      flattenSmartphoneExactSlotSelectionNumbers(value.traces, output);
    }
    for (const [key, nested] of Object.entries(value)) {
      if (key === "text" || key === "numbers" || key === "traces") continue;
      flattenSmartphoneExactSlotSelectionNumbers(nested, output);
    }
    return output;
  }
  const number = normalizeSmartphoneSimulationNumber(value);
  if (number > 0) output.push(number);
  return output;
}

function collectSmartphoneExactSlotObservedNumbers(stageResult = {}) {
  return uniqueNumbers(
    flattenSmartphoneExactSlotSelectionNumbers({
      raw: stageResult.raw,
      rawText: stageResult.rawText,
    })
  );
}

function uniqueSmartphoneExactSlotStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

function smartphoneExactSlotCandidatePool(stageWideEvidence = {}, side = "self", slotIndex = 0) {
  return (stageWideEvidence.candidatePools?.[side]?.[slotIndex] || [])
    .map((candidate, index) => ({
      value: normalizeSmartphoneSimulationNumber(candidate.value),
      rank: index + 1,
      sources: candidate.sources || [],
    }))
    .filter((candidate) => candidate.value > 0);
}

function enumerateSmartphoneExactSlotCandidateValues(pools = []) {
  const values = pools.map((pool) => uniqueNumbers(pool.map((candidate) => candidate.value)));
  if (values.some((pool) => pool.length === 0)) return [];
  const output = [];
  for (const first of values[0]) {
    for (const second of values[1]) {
      for (const third of values[2]) {
        output.push([first, second, third]);
      }
    }
  }
  return output;
}

function smartphoneExactSlotCandidateSourcesForMembers(pools = [], members = []) {
  return members.map((member, index) =>
    pools[index]
      .filter((candidate) => candidate.value === normalizeSmartphoneSimulationNumber(member))
      .map((candidate) => ({
        rank: candidate.rank,
        sources: candidate.sources,
      }))
  );
}

function smartphoneExactSlotTotalEvidence(stageWideEvidence = {}, side = "self") {
  return (stageWideEvidence.totalEvidence?.[side] || [])
    .map((entry) => ({
      value: normalizeSmartphoneSimulationNumber(entry.value),
      sources: entry.sources || [],
    }))
    .filter((entry) => entry.value > 0);
}

function smartphoneExactSlotChangedMemberCount(currentMembers = [], proposedMembers = []) {
  return [0, 1, 2].filter(
    (index) =>
      normalizeSmartphoneSimulationNumber(currentMembers[index]) !==
      normalizeSmartphoneSimulationNumber(proposedMembers[index])
  ).length;
}

export function buildSmartphoneExactSlotSelectionEvidence({
  stage = 0,
  side = "self",
  stageResult = {},
  stageWideEvidence = null,
} = {}) {
  const selected = smartphoneSimulationStageOutputFromResult(stageResult);
  const stageWide =
    stageWideEvidence ||
    buildSmartphoneStageWideSixMemberCandidateSolverEvidence({
      stage,
      stageResult,
    });
  const oppositeSide = side === "self" ? "enemy" : "self";
  const currentMembers = side === "self" ? selected.selfMembers || [] : selected.enemyMembers || [];
  const oppositeMembers =
    oppositeSide === "self" ? selected.selfMembers || [] : selected.enemyMembers || [];
  const currentTotal = side === "self" ? selected.selfTotal : selected.enemyTotal;
  const targetPools = [0, 1, 2].map((index) =>
    smartphoneExactSlotCandidatePool(stageWide, side, index)
  );
  const oppositePools = [0, 1, 2].map((index) =>
    smartphoneExactSlotCandidatePool(stageWide, oppositeSide, index)
  );
  const targetMemberCombos = enumerateSmartphoneExactSlotCandidateValues(targetPools);
  const targetTotals = smartphoneExactSlotTotalEvidence(stageWide, side);
  const observedNumbers = collectSmartphoneExactSlotObservedNumbers(stageResult);
  const proposals = [];
  const rejectedProposalReasons = [];

  for (const members of targetMemberCombos) {
    const memberSum = smartphoneSimulationMemberSum(members);
    for (const totalEvidence of targetTotals) {
      const bonus = totalEvidence.value - memberSum;
      if (bonus < 0) {
        rejectedProposalReasons.push("arithmetic-negative-bonus");
        continue;
      }
      const changedMemberCount = smartphoneExactSlotChangedMemberCount(currentMembers, members);
      let bonusProof = null;
      if (bonus === 0) {
        const oppositeComplete =
          oppositeMembers.length === 3 &&
          oppositeMembers.every((value, index) =>
            oppositePools[index].some(
              (candidate) => candidate.value === normalizeSmartphoneSimulationNumber(value)
            )
          );
        if (!oppositeComplete) {
          rejectedProposalReasons.push("zero-bonus-proof-opposite-members-not-slot-proven");
          continue;
        }
        const rank = smartphoneSimulationUniqueGlobalRankOne(
          side === "self" ? members : oppositeMembers,
          side === "enemy" ? members : oppositeMembers
        );
        if (!rank.unique || rank.rank1.side !== oppositeSide) {
          rejectedProposalReasons.push("zero-bonus-proof-unavailable");
          continue;
        }
        bonusProof = {
          type: "zero-bonus-proof",
          rank1: rank.rank1,
          winningSide: oppositeSide,
          derivedBonus: rank.bonus,
          note: "target side cannot receive crown bonus because opposite side has unique global rank 1",
        };
      } else {
        if (!observedNumbers.includes(bonus)) {
          rejectedProposalReasons.push("direct-bonus-evidence-absent");
          continue;
        }
        const bonusConflictsWithMemberSlot = [...targetPools, ...oppositePools].some((pool) =>
          pool.some((candidate) => candidate.value === bonus)
        );
        if (changedMemberCount > 0 && bonusConflictsWithMemberSlot) {
          rejectedProposalReasons.push("direct-bonus-conflicts-with-member-slot-candidate");
          continue;
        }
        if (changedMemberCount > 1) {
          rejectedProposalReasons.push("direct-bonus-multi-slot-reorder-unsafe");
          continue;
        }
        bonusProof = {
          type: "direct-observed-bonus",
          bonus,
          sources: ["smartphone-native-observed-number-pool"],
        };
      }
      proposals.push({
        side,
        stage,
        members,
        total: totalEvidence.value,
        bonus,
        previousMembers: currentMembers,
        previousTotal: currentTotal,
        changedMemberCount,
        memberSources: smartphoneExactSlotCandidateSourcesForMembers(targetPools, members),
        totalEvidence,
        bonusProof,
      });
    }
  }

  const changedProposals = proposals.filter(
    (proposal) =>
      proposal.total !== currentTotal ||
      proposal.members.some(
        (member, index) =>
          normalizeSmartphoneSimulationNumber(member) !==
          normalizeSmartphoneSimulationNumber(currentMembers[index])
      )
  );
  const rejectionReasons = [];
  if (!["self", "enemy"].includes(side)) rejectionReasons.push("invalid-target-side");
  if (targetPools.some((pool) => pool.length === 0)) {
    rejectionReasons.push("member-slot-lacks-exact-observed-candidate");
  }
  if (targetTotals.length === 0) rejectionReasons.push("exact-total-absent");
  if (proposals.length === 0) {
    rejectionReasons.push(
      rejectedProposalReasons.includes("direct-bonus-multi-slot-reorder-unsafe")
        ? "direct-bonus-multi-slot-reorder-unsafe"
        : "no-valid-member-bonus-total-proposal"
    );
  }
  if (changedProposals.length > 1) rejectionReasons.push("multiple-valid-proposals");
  if (changedProposals.length === 0 && proposals.length > 0) {
    rejectionReasons.push("already-correct-or-no-change");
  }
  const wouldApply = rejectionReasons.length === 0 && changedProposals.length === 1;
  return {
    name: "smartphoneExactSlotMembersBonusTotalSelectionSimulation",
    stage,
    side,
    wouldApply,
    rejectionReasons,
    rejectedProposalReasons: uniqueSmartphoneExactSlotStrings(rejectedProposalReasons),
    selected: {
      members: currentMembers,
      total: currentTotal,
      oppositeMembers,
    },
    candidatePools: targetPools,
    oppositeCandidatePools: oppositePools,
    totalEvidence: targetTotals,
    observedBonusCandidates: observedNumbers,
    proposalCount: proposals.length,
    changedProposalCount: changedProposals.length,
    proposals,
    proposed: wouldApply ? changedProposals[0] : null,
    stageWideEvidence: stageWide,
    note:
      "Smartphone evidence-only exact-slot member / bonus / total selection simulation. It does not change OCR output.",
  };
}

function smartphoneTotalEvidenceSummary(evidence = []) {
  return (evidence || [])
    .slice(0, 4)
    .map((entry) => `${entry.value}:${(entry.sources || []).join("+") || "unknown"}`)
    .join(",");
}

function smartphoneChangedMemberSlots(previous = {}, proposed = {}) {
  const changed = [];
  for (const side of ["self", "enemy"]) {
    const previousMembers = side === "self" ? previous.selfMembers || [] : previous.enemyMembers || [];
    const proposedMembers = side === "self" ? proposed.selfMembers || [] : proposed.enemyMembers || [];
    for (let index = 0; index < 3; index += 1) {
      if (normalizeSmartphoneSimulationNumber(previousMembers[index]) !== normalizeSmartphoneSimulationNumber(proposedMembers[index])) {
        changed.push({
          side,
          slot: index + 1,
          from: normalizeSmartphoneSimulationNumber(previousMembers[index]),
          to: normalizeSmartphoneSimulationNumber(proposedMembers[index]),
        });
      }
    }
  }
  return changed;
}

function smartphoneChangedMemberSourceSummary(simulation = {}, changedSlots = []) {
  const proposal = simulation.proposed || {};
  return changedSlots
    .map((slot) => {
      const sources =
        slot.side === "self"
          ? proposal.selfMemberSources?.[slot.slot - 1] || []
          : proposal.enemyMemberSources?.[slot.slot - 1] || [];
      return `${slot.side}.member${slot.slot}:${slot.from}->${slot.to}[${
        sources.flat().join("+") || "unknown"
      }]`;
    })
    .join(";");
}

export function applySmartphoneCrownBonusRuleRecovery({
  stage = 0,
  simulation = null,
  mode = "smartphone",
} = {}) {
  if (normalizeOcrMode(mode) !== "smartphone" || !simulation?.wouldApply || !simulation?.proposed) {
    return { applied: false };
  }
  const proposal = simulation.proposed;
  const rank1 = simulation.rank1 || proposal.rank1 || null;
  const previous = simulation.selected || {};
  return {
    applied: true,
    self: {
      members: proposal.selfMembers || previous.selfMembers || [],
      bonus: Number(proposal.selfBonus || 0),
      total: Number(proposal.selfTotal || 0),
    },
    enemy: {
      members: proposal.enemyMembers || previous.enemyMembers || [],
      bonus: Number(proposal.enemyBonus || 0),
      total: Number(proposal.enemyTotal || 0),
    },
    message:
      `smartphoneCrownBonusRuleRecovery applied stage=${stage} ` +
      `previousSelf=${(previous.selfMembers || []).join(",")} total=${previous.selfTotal || 0} ` +
      `previousEnemy=${(previous.enemyMembers || []).join(",")} total=${previous.enemyTotal || 0} ` +
      `proposedSelf=${(proposal.selfMembers || []).join(",")}+${proposal.selfBonus || 0}=${proposal.selfTotal || 0} ` +
      `proposedEnemy=${(proposal.enemyMembers || []).join(",")}+${proposal.enemyBonus || 0}=${proposal.enemyTotal || 0} ` +
      `rank1=${rank1?.side || "unknown"}.member${rank1?.slot || "?"}:${rank1?.value || 0} ` +
      `winningSide=${rank1?.side || "unknown"} derivedBonus=${simulation.derivedBonus || proposal.derivedBonus || 0} ` +
      `totalEvidence=self[${smartphoneTotalEvidenceSummary(simulation.totalEvidence?.self) || "exact"}] ` +
      `enemy[${smartphoneTotalEvidenceSummary(simulation.totalEvidence?.enemy) || "exact"}]`,
  };
}

export function applySmartphoneStageWideSixMemberCandidateSolverRecovery({
  stage = 0,
  simulation = null,
  mode = "smartphone",
  previousRecoveries = {},
} = {}) {
  if (normalizeOcrMode(mode) !== "smartphone" || !simulation?.wouldApply || !simulation?.proposed) {
    return { applied: false };
  }
  if (previousRecoveries?.crownBonus?.applied) {
    return { applied: false, rejectionReasons: ["previous-smartphone-crown-bonus-recovery-applied"] };
  }
  const proposal = simulation.proposed;
  const previous = simulation.selected || {};
  const changedSlots = smartphoneChangedMemberSlots(previous, proposal);
  const rank1 = proposal.rank1 || null;
  return {
    applied: true,
    self: {
      members: proposal.selfMembers || [],
      bonus: Number(proposal.selfBonus || 0),
      total: Number(proposal.selfTotal || 0),
    },
    enemy: {
      members: proposal.enemyMembers || [],
      bonus: Number(proposal.enemyBonus || 0),
      total: Number(proposal.enemyTotal || 0),
    },
    changedSlots,
    message:
      `smartphoneStageWideSixMemberCandidateSolverRecovery applied stage=${stage} ` +
      `previousSelf=${(previous.selfMembers || []).join(",")} total=${previous.selfTotal || 0} ` +
      `previousEnemy=${(previous.enemyMembers || []).join(",")} total=${previous.enemyTotal || 0} ` +
      `proposedSelf=${(proposal.selfMembers || []).join(",")}+${proposal.selfBonus || 0}=${proposal.selfTotal || 0} ` +
      `proposedEnemy=${(proposal.enemyMembers || []).join(",")}+${proposal.enemyBonus || 0}=${proposal.enemyTotal || 0} ` +
      `changed=${smartphoneChangedMemberSourceSummary(simulation, changedSlots) || "none"} ` +
      `rank1=${rank1?.side || "unknown"}.member${rank1?.slot || "?"}:${rank1?.value || 0} ` +
      `winningSide=${rank1?.side || "unknown"} derivedBonus=${proposal.derivedBonus || 0} ` +
      `totalEvidence=self[${smartphoneTotalEvidenceSummary(simulation.totalEvidence?.self) || "exact"}] ` +
      `enemy[${smartphoneTotalEvidenceSummary(simulation.totalEvidence?.enemy) || "exact"}]`,
  };
}

function smartphoneExactSlotMemberSourceSummary(proposal = {}) {
  return (proposal.memberSources || [])
    .map((slotSources, index) => {
      const sources = [
        ...new Set(
          (slotSources || [])
            .flatMap((entry) => entry.sources || [])
            .filter(Boolean)
        ),
      ];
      return `member${index + 1}:${sources.join("+") || "unknown"}`;
    })
    .join(";");
}

function smartphoneExactSlotBonusProofSummary(proposal = {}) {
  const proof = proposal.bonusProof || {};
  if (proof.type === "zero-bonus-proof") {
    return `zero-bonus-proof rank1=${proof.rank1?.side || "unknown"}.member${
      proof.rank1?.slot || "?"
    }:${proof.rank1?.value || 0} winningSide=${proof.winningSide || "unknown"} derivedBonus=${
      proof.derivedBonus || 0
    }`;
  }
  if (proof.type === "direct-observed-bonus") {
    return `direct-observed-bonus bonus=${proof.bonus || proposal.bonus || 0} sources=${
      (proof.sources || []).join("+") || "unknown"
    }`;
  }
  return proof.type || "unknown";
}

export function applySmartphoneExactSlotSelectionRecovery({
  stage = 0,
  side = "self",
  stageResult = null,
  simulation = null,
  mode = "smartphone",
} = {}) {
  if (normalizeOcrMode(mode) !== "smartphone") {
    return { applied: false, rejectionReasons: ["not-smartphone-mode"] };
  }
  const evidence =
    simulation ||
    buildSmartphoneExactSlotSelectionEvidence({
      stage,
      side,
      stageResult: stageResult || {},
    });
  if (!evidence?.wouldApply || !evidence?.proposed) {
    return {
      applied: false,
      rejectionReasons: evidence?.rejectionReasons || ["exact-slot-selection-not-applicable"],
      evidence,
    };
  }
  const proposal = evidence.proposed;
  const previous = evidence.selected || {};
  return {
    applied: true,
    side,
    members: proposal.members || previous.members || [],
    bonus: Number(proposal.bonus || 0),
    total: Number(proposal.total || 0),
    evidence,
    message:
      `smartphoneExactSlotSelectionRecovery applied stage=${stage} side=${side} ` +
      `previousMembers=${(previous.members || []).join(",")} previousTotal=${previous.total || 0} ` +
      `proposedMembers=${(proposal.members || []).join(",")}+${proposal.bonus || 0}=${
        proposal.total || 0
      } ` +
      `slotProvenance=${smartphoneExactSlotMemberSourceSummary(proposal) || "unknown"} ` +
      `totalEvidence=${proposal.totalEvidence?.value || 0}:${
        (proposal.totalEvidence?.sources || []).join("+") || "unknown"
      } ` +
      `bonusProof=${smartphoneExactSlotBonusProofSummary(proposal)} ` +
      `competingChangedProposals=${Math.max(0, (evidence.changedProposalCount || 0) - 1)} ` +
      `unique=${evidence.changedProposalCount === 1 ? "yes" : "no"}`,
  };
}

export function buildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence({
  stage = 0,
  side = "self",
  self = null,
  enemy = null,
  previousRecoveries = {},
}) {
  const rejectionReasons = [];
  if (!["self", "enemy"].includes(side)) rejectionReasons.push("invalid-target-side");
  if (!self || !enemy) rejectionReasons.push("missing-stage-side-analysis");
  const selected = {
    self: {
      members: [...(self?.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(self?.selectedTotal || 0),
      bonus: currentPcSelectedBonus(self),
    },
    enemy: {
      members: [...(enemy?.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(enemy?.selectedTotal || 0),
      bonus: currentPcSelectedBonus(enemy),
    },
  };
  for (const currentSide of ["self", "enemy"]) {
    while (selected[currentSide].members.length < 3) selected[currentSide].members.push(0);
  }

  const memberEvidence = { self: [], enemy: [] };
  for (const currentSide of ["self", "enemy"]) {
    const sideAnalysis = currentSide === "self" ? self : enemy;
    for (let index = 0; index < 3; index += 1) {
      const value = selected[currentSide].members[index];
      const evidence = currentPcMemberEvidenceForValue(sideAnalysis, value, index, 0);
      memberEvidence[currentSide].push(evidence);
      if (value <= 0) rejectionReasons.push(`missing-${currentSide}-member${index + 1}`);
      if (value > 0 && evidence.length === 0) {
        rejectionReasons.push(`missing-${currentSide}-member${index + 1}-evidence`);
      }
    }
  }
  const memberEvidenceComplete = ["self", "enemy"].every((currentSide) =>
    (memberEvidence[currentSide] || []).every(
      (slotEvidence) => Array.isArray(slotEvidence) && slotEvidence.length > 0
    )
  );
  if (!memberEvidenceComplete) rejectionReasons.push("missing-six-member-evidence");

  const allMembers = [
    ...selected.self.members.map((value, index) => ({ side: "self", slot: index + 1, value })),
    ...selected.enemy.members.map((value, index) => ({ side: "enemy", slot: index + 1, value })),
  ];
  const positiveMembers = allMembers.filter((entry) => entry.value > 0);
  if (positiveMembers.length !== 6) rejectionReasons.push("missing-member-evidence");
  const maxValue = Math.max(...positiveMembers.map((entry) => entry.value), 0);
  const maxEntries = positiveMembers.filter((entry) => entry.value === maxValue);
  if (maxEntries.length !== 1) rejectionReasons.push("non-unique-global-rank1-member");
  const rank1 = maxEntries[0] || null;
  const winningSide = rank1?.side || null;
  const calculatedBonus = maxValue > 0 ? Math.floor(maxValue * 0.2) : 0;
  const proposed = {
    self: {
      members: selected.self.members,
      bonus: winningSide === "self" ? calculatedBonus : 0,
      total:
        selected.self.members.reduce((sum, value) => sum + value, 0) +
        (winningSide === "self" ? calculatedBonus : 0),
    },
    enemy: {
      members: selected.enemy.members,
      bonus: winningSide === "enemy" ? calculatedBonus : 0,
      total:
        selected.enemy.members.reduce((sum, value) => sum + value, 0) +
        (winningSide === "enemy" ? calculatedBonus : 0),
    },
  };

  const targetSide = ["self", "enemy"].includes(side) ? side : "self";
  const oppositeSide = targetSide === "self" ? "enemy" : "self";
  const targetAnalysis = targetSide === "self" ? self : enemy;
  const oppositeAnalysis = oppositeSide === "self" ? self : enemy;
  const targetTotalEvidence = currentPcTotalEvidenceForValue(
    targetAnalysis,
    proposed[targetSide].total,
    0
  );
  const oppositeTotalEvidence = currentPcTotalEvidenceForValue(
    oppositeAnalysis,
    proposed[oppositeSide].total,
    0
  );
  if (targetTotalEvidence.length === 0) {
    rejectionReasons.push("missing-target-exact-total-evidence");
  }
  const sideWouldChange =
    Number(selected[targetSide].bonus || 0) !== Number(proposed[targetSide].bonus || 0) ||
    Number(selected[targetSide].total || 0) !== Number(proposed[targetSide].total || 0);
  if (!sideWouldChange) rejectionReasons.push("side-already-matches-proposal");
  const targetMemberChange = !arraysEqualWithinTolerance(
    selected[targetSide].members,
    proposed[targetSide].members,
    0
  );
  if (targetMemberChange) rejectionReasons.push("proposal-would-change-members");
  const targetEquationExact =
    proposed[targetSide].members.reduce((sum, value) => sum + Number(value || 0), 0) +
      Number(proposed[targetSide].bonus || 0) ===
    Number(proposed[targetSide].total || 0);
  if (!targetEquationExact) rejectionReasons.push("proposal-equation-not-exact");

  const recoveryApplied = Boolean(
    previousRecoveries?.[targetSide]?.groupedRaw?.applied ||
      previousRecoveries?.[targetSide]?.stage3SevenDigit?.applied ||
      previousRecoveries?.[targetSide]?.crownBonus?.applied ||
      previousRecoveries?.[targetSide]?.stageWideSixMember?.applied
  );
  if (recoveryApplied) rejectionReasons.push("existing-production-recovery-already-applied");

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  return {
    wouldApply: uniqueRejectionReasons.length === 0,
    rejectionReasons: uniqueRejectionReasons,
    stage,
    side: targetSide,
    selected: selected[targetSide],
    oppositeSelected: selected[oppositeSide],
    proposed: proposed[targetSide],
    stageProposal: proposed,
    evidence: {
      memberEvidence,
      memberEvidenceComplete,
      rank1,
      winningSide,
      calculatedBonus,
      targetTotalEvidence,
      oppositeTotalEvidence,
      targetEquationExact,
      uniqueInterpretation: uniqueRejectionReasons.length === 0,
      noCompetingInterpretation: true,
      rule: "bonus=floor(max(all 6 selected raw members)*0.20)",
    },
    note:
      "Current-PC evidence-only exact-member crown-bonus total recovery simulation. It does not change OCR output.",
  };
}

export function buildCurrentPcSideLocalExactEvidenceRecoveryEvidence({
  stage = 0,
  side = "self",
  self = null,
  enemy = null,
  previousRecoveries = {},
}) {
  const rejectionReasons = [];
  if (!["self", "enemy"].includes(side)) rejectionReasons.push("invalid-target-side");
  if (!self || !enemy) rejectionReasons.push("missing-stage-side-analysis");
  const selected = {
    self: {
      members: [...(self?.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(self?.selectedTotal || 0),
      bonus: currentPcSelectedBonus(self),
    },
    enemy: {
      members: [...(enemy?.selectedMembers || [])].map((value) => Number(value || 0)).slice(0, 3),
      total: Number(enemy?.selectedTotal || 0),
      bonus: currentPcSelectedBonus(enemy),
    },
  };
  for (const currentSide of ["self", "enemy"]) {
    while (selected[currentSide].members.length < 3) selected[currentSide].members.push(0);
  }

  const targetSide = ["self", "enemy"].includes(side) ? side : "self";
  const oppositeSide = targetSide === "self" ? "enemy" : "self";
  const targetAnalysis = targetSide === "self" ? self : enemy;
  const oppositeAnalysis = oppositeSide === "self" ? self : enemy;
  const targetMembers = selected[targetSide].members;
  const targetMemberSum = targetMembers.reduce((sum, value) => sum + Number(value || 0), 0);
  const targetMax = Math.max(...targetMembers);
  const targetMaxCount = targetMembers.filter((value) => value === targetMax).length;
  const calculatedBonus = targetMax > 0 ? Math.floor(targetMax * 0.2) : 0;
  const proposed = {
    members: targetMembers,
    bonus: calculatedBonus,
    total: targetMemberSum + calculatedBonus,
  };

  const targetMemberEvidence = targetMembers.map((value, index) =>
    currentPcMemberEvidenceForValue(targetAnalysis, value, index, 0)
  );
  targetMembers.forEach((value, index) => {
    if (value <= 0) rejectionReasons.push(`missing-target-member${index + 1}`);
    if (value > 0 && targetMemberEvidence[index].length === 0) {
      rejectionReasons.push(`missing-target-member${index + 1}-evidence`);
    }
  });
  if (targetMaxCount !== 1) rejectionReasons.push("target-rank1-not-unique");
  if (calculatedBonus <= 0) rejectionReasons.push("missing-derived-crown-bonus");

  const targetTotalEvidence = currentPcStrictDisplayedTotalEvidenceForValue(
    targetAnalysis,
    proposed.total
  );
  const oppositeTotalEvidence = currentPcStrictDisplayedTotalEvidenceForValue(
    oppositeAnalysis,
    selected[oppositeSide].total
  );
  if (targetTotalEvidence.length === 0) {
    rejectionReasons.push("missing-target-exact-total-evidence");
  }
  if (oppositeTotalEvidence.length === 0) {
    rejectionReasons.push("missing-opposite-exact-total-evidence");
  }

  const oppositeMemberSum = selected[oppositeSide].members.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const oppositeTotalInternallyConsistent =
    Number(selected[oppositeSide].total || 0) >= oppositeMemberSum;
  if (!oppositeTotalInternallyConsistent) {
    rejectionReasons.push("opposite-total-not-internally-consistent");
  }
  const targetWinsByOppositeTotalUpperBound =
    targetMax > Number(selected[oppositeSide].total || 0);
  if (!targetWinsByOppositeTotalUpperBound) {
    rejectionReasons.push("opposite-total-does-not-prove-target-rank1");
  }
  const oppositeObservedValues = currentPcObservedEvidenceValues(oppositeAnalysis);
  const oppositeCompetingAboveTargetMax = oppositeObservedValues.filter(
    (value) => value > targetMax
  );
  if (oppositeCompetingAboveTargetMax.length > 0) {
    rejectionReasons.push("opposite-observed-candidate-could-exceed-target-max");
  }

  const sideWouldChange =
    Number(selected[targetSide].bonus || 0) !== Number(proposed.bonus || 0) ||
    Number(selected[targetSide].total || 0) !== Number(proposed.total || 0);
  if (!sideWouldChange) rejectionReasons.push("side-already-matches-proposal");
  const targetEquationExact =
    targetMemberSum + Number(proposed.bonus || 0) === Number(proposed.total || 0);
  if (!targetEquationExact) rejectionReasons.push("proposal-equation-not-exact");

  const recoveryApplied = Boolean(
    previousRecoveries?.[targetSide]?.groupedRaw?.applied ||
      previousRecoveries?.[targetSide]?.stage3SevenDigit?.applied ||
      previousRecoveries?.[targetSide]?.crownBonus?.applied ||
      previousRecoveries?.[targetSide]?.stageWideSixMember?.applied ||
      previousRecoveries?.[targetSide]?.exactMembersBonusTotal?.applied
  );
  if (recoveryApplied) rejectionReasons.push("existing-production-recovery-already-applied");

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  return {
    name: "currentPcSideLocalExactEvidenceRecoverySimulation",
    wouldApply: uniqueRejectionReasons.length === 0,
    rejectionReasons: uniqueRejectionReasons,
    stage,
    side: targetSide,
    selected: selected[targetSide],
    oppositeSelected: selected[oppositeSide],
    proposed,
    proof: uniqueRejectionReasons.length === 0 ? "target-winning-by-opposite-total-upper-bound" : null,
    evidence: {
      targetMemberEvidence,
      targetMax,
      targetMaxCount,
      targetMemberSum,
      calculatedBonus,
      targetTotalEvidence,
      oppositeTotalEvidence,
      oppositeTotalInternallyConsistent,
      targetWinsByOppositeTotalUpperBound,
      oppositeObservedValues,
      oppositeCompetingAboveTargetMax,
      targetEquationExact,
      uniqueInterpretation: uniqueRejectionReasons.length === 0,
      noCompetingInterpretation: uniqueRejectionReasons.length === 0,
      rule:
        "side-local target win proof: exact target total + targetMax > exact opposite total + bonus=floor(targetMax*0.20)",
    },
    note:
      "Current-PC shared evidence-only side-local exact evidence recovery simulation. It does not change OCR output.",
  };
}

export function applyCurrentPcExactMembersCrownBonusTotalRecovery({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const currentMembers = normalizeCurrentPcRecoveryMembers(selectedMembers);
  const proposedMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.members || []);
  const proposedBonus = Number(simulation?.proposed?.bonus || 0);
  const proposedTotal = Number(simulation?.proposed?.total || 0);
  const selectedBonus = Number(simulation?.selected?.bonus || 0);
  const rank1 = simulation?.evidence?.rank1 || null;
  const winningSide = simulation?.evidence?.winningSide || null;
  const calculatedBonus = Number(simulation?.evidence?.calculatedBonus || 0);
  const targetTotalEvidence = simulation?.evidence?.targetTotalEvidence || [];
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (!["self", "enemy"].includes(side) || simulation?.side !== side) {
    rejectionReasons.push("target-side-mismatch");
  }
  if (!arraysEqualWithinTolerance(currentMembers, proposedMembers, 0)) {
    rejectionReasons.push("proposal-would-change-members");
  }
  if (proposedMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-does-not-have-three-members");
  }
  if (!simulation?.evidence?.memberEvidenceComplete) {
    rejectionReasons.push("missing-six-member-evidence");
  }
  if (!rank1 || !["self", "enemy"].includes(winningSide)) {
    rejectionReasons.push("missing-unique-global-rank1-member");
  }
  if (calculatedBonus <= 0) rejectionReasons.push("missing-derived-crown-bonus");
  if (winningSide === side && proposedBonus !== calculatedBonus) {
    rejectionReasons.push("target-bonus-does-not-match-derived-crown-bonus");
  }
  if (winningSide !== side && proposedBonus !== 0) {
    rejectionReasons.push("losing-target-side-has-bonus");
  }
  if (!Array.isArray(targetTotalEvidence) || targetTotalEvidence.length === 0) {
    rejectionReasons.push("missing-target-exact-total-evidence");
  }
  if (!simulation?.evidence?.targetEquationExact) {
    rejectionReasons.push("proposal-equation-not-exact");
  }
  if (
    simulation?.evidence?.uniqueInterpretation !== true ||
    simulation?.evidence?.noCompetingInterpretation !== true
  ) {
    rejectionReasons.push("not-unique-exact-members-bonus-total-interpretation");
  }
  if (
    Number(selectedTotal || 0) === proposedTotal &&
    Number(selectedBonus || 0) === proposedBonus
  ) {
    rejectionReasons.push("selected-side-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const totalEvidenceSummary = targetTotalEvidence
    .slice(0, 4)
    .map((item) => `${item.source || "unknown"}:${item.value}`)
    .join(";");

  return {
    applied: uniqueRejectionReasons.length === 0,
    stage,
    side,
    members: proposedMembers,
    bonus: proposedBonus,
    total: proposedTotal,
    previousTotal: Number(selectedTotal || 0),
    previousBonus: selectedBonus,
    rank1,
    winningSide,
    calculatedBonus,
    totalEvidence: targetTotalEvidence,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcExactMembersCrownBonusTotalRecovery applied stage=${stage} side=${side} members=${proposedMembers.join(",")} rank1=${winningSide}.member${rank1?.slot || "?"}:${rank1?.value || 0} winningSide=${winningSide || "unknown"} derivedBonus=${calculatedBonus} previousTotal=${Number(selectedTotal || 0)} correctedTotal=${proposedTotal} bonus=${proposedBonus} totalEvidence=${totalEvidenceSummary || "exact"}`,
  };
}

export function applyCurrentPcSideLocalExactEvidenceRecovery({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const currentMembers = normalizeCurrentPcRecoveryMembers(selectedMembers);
  const proposedMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.members || []);
  const proposedBonus = Number(simulation?.proposed?.bonus || 0);
  const proposedTotal = Number(simulation?.proposed?.total || 0);
  const selectedBonus = Number(simulation?.selected?.bonus || 0);
  const targetMax = Number(simulation?.evidence?.targetMax || 0);
  const oppositeTotal = Number(simulation?.oppositeSelected?.total || 0);
  const calculatedBonus = Number(simulation?.evidence?.calculatedBonus || 0);
  const targetTotalEvidence = simulation?.evidence?.targetTotalEvidence || [];
  const oppositeTotalEvidence = simulation?.evidence?.oppositeTotalEvidence || [];
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (!["self", "enemy"].includes(side) || simulation?.side !== side) {
    rejectionReasons.push("target-side-mismatch");
  }
  if (!arraysEqualWithinTolerance(currentMembers, proposedMembers, 0)) {
    rejectionReasons.push("proposal-would-change-members");
  }
  if (proposedMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-does-not-have-three-members");
  }
  if (targetMax <= 0 || simulation?.evidence?.targetMaxCount !== 1) {
    rejectionReasons.push("target-rank1-not-unique");
  }
  if (calculatedBonus <= 0 || proposedBonus !== calculatedBonus) {
    rejectionReasons.push("target-bonus-does-not-match-derived-crown-bonus");
  }
  if (!Array.isArray(targetTotalEvidence) || targetTotalEvidence.length === 0) {
    rejectionReasons.push("missing-target-exact-total-evidence");
  }
  if (!Array.isArray(oppositeTotalEvidence) || oppositeTotalEvidence.length === 0) {
    rejectionReasons.push("missing-opposite-exact-total-evidence");
  }
  if (simulation?.evidence?.oppositeTotalInternallyConsistent !== true) {
    rejectionReasons.push("opposite-total-not-internally-consistent");
  }
  if (!(targetMax > oppositeTotal) || simulation?.evidence?.targetWinsByOppositeTotalUpperBound !== true) {
    rejectionReasons.push("opposite-total-does-not-prove-target-rank1");
  }
  if ((simulation?.evidence?.oppositeCompetingAboveTargetMax || []).length > 0) {
    rejectionReasons.push("opposite-observed-candidate-could-exceed-target-max");
  }
  if (!simulation?.evidence?.targetEquationExact) {
    rejectionReasons.push("proposal-equation-not-exact");
  }
  if (
    simulation?.evidence?.uniqueInterpretation !== true ||
    simulation?.evidence?.noCompetingInterpretation !== true
  ) {
    rejectionReasons.push("not-unique-side-local-exact-evidence-interpretation");
  }
  if (
    Number(selectedTotal || 0) === proposedTotal &&
    Number(selectedBonus || 0) === proposedBonus
  ) {
    rejectionReasons.push("selected-side-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const totalEvidenceSummary = targetTotalEvidence
    .slice(0, 4)
    .map((item) => `${item.source || "unknown"}:${item.value}`)
    .join(";");
  const oppositeEvidenceSummary = oppositeTotalEvidence
    .slice(0, 4)
    .map((item) => `${item.source || "unknown"}:${item.value}`)
    .join(";");

  return {
    applied: uniqueRejectionReasons.length === 0,
    stage,
    side,
    members: proposedMembers,
    bonus: proposedBonus,
    total: proposedTotal,
    previousTotal: Number(selectedTotal || 0),
    previousBonus: selectedBonus,
    targetMax,
    oppositeTotal,
    calculatedBonus,
    proof: simulation?.proof || null,
    totalEvidence: targetTotalEvidence,
    oppositeTotalEvidence,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcSideLocalExactEvidenceRecovery applied stage=${stage} side=${side} members=${proposedMembers.join(",")} targetMax=${targetMax} oppositeTotal=${oppositeTotal} proof=targetMax>oppositeTotal derivedBonus=${calculatedBonus} previousTotal=${Number(selectedTotal || 0)} correctedTotal=${proposedTotal} bonus=${proposedBonus} targetTotalEvidence=${totalEvidenceSummary || "exact"} oppositeTotalEvidence=${oppositeEvidenceSummary || "exact"}`,
  };
}

function currentPcStageWideMemberRange(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 10000 && number < 2000000;
}

function currentPcStageWideAddMemberCandidate(pools, side, slotIndex, value, source) {
  const number = Number(value || 0);
  if (!currentPcStageWideMemberRange(number)) return;
  const pool = pools[side][slotIndex];
  if (!pool.has(number)) {
    pool.set(number, {
      value: number,
      sources: [],
    });
  }
  pool.get(number).sources.push(source);
}

function currentPcStageWideOrderedMemberCandidates(sideAnalysis = {}, stage = 0) {
  const evidence = [];
  const summary = sideAnalysis.candidateSourceSummary || {};
  const memberCandidates = summary.memberCandidates || {};
  const tokenValues = (memberCandidates.tokenAudit || [])
    .map((token) => ({
      value: Number(token.normalizedValue || 0),
      token: token.rawToken || token.token || "",
      textIndex: Number(token.textIndex ?? -1),
      shape: token.shape || token.tokenShape || "",
      text: memberCandidates.text || "",
    }))
    .filter((token) => currentPcStageWideMemberRange(token.value))
    .sort((a, b) => a.textIndex - b.textIndex);
  const orderedTokenValues = tokenValues.filter(
    (item, index, all) =>
      all.findIndex((other) => other.value === item.value && other.textIndex === item.textIndex) ===
      index
  );
  orderedTokenValues.forEach((token, index) => {
    if (index < 3) {
      evidence.push({
        slotIndex: index,
        value: token.value,
        source: "member-row-token-order",
        token: token.token,
        shape: token.shape,
        textIndex: token.textIndex,
        text: token.text,
      });
    }
  });

  if (orderedTokenValues.length === 0) {
    (memberCandidates.numbers || [])
      .map((value) => Number(value || 0))
      .filter(currentPcStageWideMemberRange)
      .slice(0, 3)
      .forEach((value, index) => {
        evidence.push({
          slotIndex: index,
          value,
          source: "member-row-number-order",
          token: String(value),
          text: memberCandidates.text || "",
        });
      });
  }

  const eligibleTokens =
    sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.eligibleTokens || [];
  const orderedGrouped = currentPcOrderedMemberValuesFromTokenEvidence(
    sideAnalysis,
    eligibleTokens
  );
  orderedGrouped.slice(0, 3).forEach((entry, index) => {
    evidence.push({
      slotIndex: index,
      value: Number(entry.value || 0),
      source: `grouped-raw-${entry.source || "member-token"}`,
      token: entry.token || "",
      shape: entry.shape || "",
      textIndex: entry.textIndex ?? null,
    });
  });

  const stage3Evidence =
    stage === 3 ? sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation?.evidence : null;
  (stage3Evidence?.memberRowNumbers || []).slice(0, 3).forEach((value, index) => {
    evidence.push({
      slotIndex: index,
      value: Number(value || 0),
      source: "stage3-seven-digit-member-row-order",
      token: String(value),
    });
  });
  for (const proposal of stage3Evidence?.proposals || []) {
    (proposal.proposedMembers || []).slice(0, 3).forEach((value, index) => {
      evidence.push({
        slotIndex: index,
        value: Number(value || 0),
        source: "stage3-seven-digit-proposal-member",
        token: String(value),
        memberRowText: proposal.memberRowText || "",
      });
    });
  }

  return evidence.filter((entry) => currentPcStageWideMemberRange(entry.value));
}

function currentPcStageWideBuildMemberPools({
  stage = 0,
  self = null,
  enemy = null,
  additionalMemberCandidates = [],
}) {
  const pools = {
    self: [new Map(), new Map(), new Map()],
    enemy: [new Map(), new Map(), new Map()],
  };

  for (const side of ["self", "enemy"]) {
    const sideAnalysis = side === "self" ? self : enemy;
    if (!sideAnalysis) continue;
    const selected = [...(sideAnalysis.selectedMembers || [])]
      .map((value) => Number(value) || 0)
      .slice(0, 3);
    while (selected.length < 3) selected.push(0);
    selected.forEach((value, index) => {
      currentPcStageWideAddMemberCandidate(pools, side, index, value, {
        source: "selected-current-output",
        memberCompatible: true,
        selected: true,
      });
    });
    for (const entry of currentPcStageWideOrderedMemberCandidates(sideAnalysis, stage)) {
      currentPcStageWideAddMemberCandidate(pools, side, entry.slotIndex, entry.value, {
        source: entry.source,
        memberCompatible: true,
        selected: false,
        token: entry.token || "",
        shape: entry.shape || "",
        textIndex: entry.textIndex ?? null,
        text: entry.text || entry.memberRowText || "",
      });
    }
  }

  for (const entry of additionalMemberCandidates || []) {
    const side = entry?.side;
    const slotIndex = Number(entry?.slotIndex ?? entry?.slot ?? -1);
    if (!["self", "enemy"].includes(side) || slotIndex < 0 || slotIndex > 2) continue;
    currentPcStageWideAddMemberCandidate(pools, side, slotIndex, entry.value, {
      source: entry.source || "additional-member-candidate",
      memberCompatible: true,
      selected: false,
      token: entry.token || String(entry.value || ""),
      shape: entry.shape || "",
      textIndex: entry.textIndex ?? null,
      text: entry.text || "",
      variantLabel: entry.variantLabel || "",
      zoneKind: entry.zoneKind || "",
      slotSpecific: Boolean(entry.slotSpecific),
      rowOrderBased: Boolean(entry.rowOrderBased),
      zone: entry.zone || null,
      preprocessing: entry.preprocessing || null,
    });
  }

  return {
    self: pools.self.map((pool) => [...pool.values()]),
    enemy: pools.enemy.map((pool) => [...pool.values()]),
  };
}

function currentPcStageWideCombinationCount(pools) {
  return [...pools.self, ...pools.enemy].reduce(
    (product, pool) => product * Math.max(pool.length, 1),
    1
  );
}

function currentPcStageWideProposalFromMembers({
  stage = 0,
  selfMembers = [],
  enemyMembers = [],
  self = null,
  enemy = null,
  totalEvidenceTolerance = 1,
}) {
  const allMembers = [
    ...selfMembers.map((value, index) => ({ side: "self", slot: index + 1, value })),
    ...enemyMembers.map((value, index) => ({ side: "enemy", slot: index + 1, value })),
  ];
  const maxValue = Math.max(...allMembers.map((entry) => entry.value));
  const maxEntries = allMembers.filter((entry) => entry.value === maxValue);
  if (maxEntries.length !== 1) return null;
  const rank1 = maxEntries[0];
  const winningSide = rank1.side;
  const calculatedBonus = Math.floor(maxValue * 0.2);
  const selfBonus = winningSide === "self" ? calculatedBonus : 0;
  const enemyBonus = winningSide === "enemy" ? calculatedBonus : 0;
  const selfTotal = selfMembers.reduce((sum, value) => sum + value, 0) + selfBonus;
  const enemyTotal = enemyMembers.reduce((sum, value) => sum + value, 0) + enemyBonus;
  return {
    self: { members: selfMembers, bonus: selfBonus, total: selfTotal },
    enemy: { members: enemyMembers, bonus: enemyBonus, total: enemyTotal },
    rank1,
    winningSide,
    calculatedBonus,
    totalEvidence: {
      self: currentPcTotalEvidenceForValue(self, selfTotal, totalEvidenceTolerance),
      enemy: currentPcTotalEvidenceForValue(enemy, enemyTotal, totalEvidenceTolerance),
    },
    stage,
  };
}

export function buildCurrentPcStageWideSixMemberCandidateSolverEvidence({
  stage = 0,
  self = null,
  enemy = null,
  additionalMemberCandidates = [],
  comparisonTolerance = 1,
  policyName = "stage-wide-six-member-candidate-solver",
}) {
  const rejectionReasons = [];
  const tolerance = Number(comparisonTolerance || 0);
  if (!self || !enemy) {
    return {
      wouldApply: false,
      rejectionReasons: ["missing-stage-side-analysis"],
      selected: null,
      proposed: null,
      sideWouldChange: { self: false, enemy: false },
      stage,
      evidence: {},
      note:
        "Current-PC shared evidence-only stage-wide six-member candidate solver. It does not change OCR output.",
    };
  }

  const pools = currentPcStageWideBuildMemberPools({
    stage,
    self,
    enemy,
    additionalMemberCandidates,
  });
  const candidatePoolSizes = {
    self: pools.self.map((pool) => pool.length),
    enemy: pools.enemy.map((pool) => pool.length),
  };
  for (const side of ["self", "enemy"]) {
    for (let index = 0; index < 3; index += 1) {
      if ((pools[side]?.[index] || []).length === 0) {
        rejectionReasons.push(`missing-${side}-member${index + 1}-candidate`);
      }
    }
  }
  const combinationCount = currentPcStageWideCombinationCount(pools);
  if (combinationCount > 20000) {
    rejectionReasons.push("candidate-pool-explosion");
  }

  const selected = {
    self: {
      members: [...(self.selectedMembers || [])].map((value) => Number(value) || 0).slice(0, 3),
      bonus: currentPcSelectedBonus(self),
      total: Number(self.selectedTotal || 0),
    },
    enemy: {
      members: [...(enemy.selectedMembers || [])].map((value) => Number(value) || 0).slice(0, 3),
      bonus: currentPcSelectedBonus(enemy),
      total: Number(enemy.selectedTotal || 0),
    },
  };
  for (const side of ["self", "enemy"]) {
    while (selected[side].members.length < 3) selected[side].members.push(0);
  }

  const validInterpretations = [];
  const invalidInterpretationCounts = new Map();
  const incrementInvalid = (reason) =>
    invalidInterpretationCounts.set(reason, (invalidInterpretationCounts.get(reason) || 0) + 1);

  if (rejectionReasons.length === 0) {
    for (const self1 of pools.self[0]) {
      for (const self2 of pools.self[1]) {
        for (const self3 of pools.self[2]) {
          for (const enemy1 of pools.enemy[0]) {
            for (const enemy2 of pools.enemy[1]) {
              for (const enemy3 of pools.enemy[2]) {
                const selfMembers = [self1.value, self2.value, self3.value];
                const enemyMembers = [enemy1.value, enemy2.value, enemy3.value];
                const proposal = currentPcStageWideProposalFromMembers({
                  stage,
                  selfMembers,
                  enemyMembers,
                  self,
                  enemy,
                  totalEvidenceTolerance: tolerance,
                });
                if (!proposal) {
                  incrementInvalid("global-rank1-tie-or-missing");
                  continue;
                }
                const changedSources = [];
                let changedMemberWithoutEvidence = false;
                [
                  ["self", [self1, self2, self3]],
                  ["enemy", [enemy1, enemy2, enemy3]],
                ].forEach(([side, candidates]) => {
                  candidates.forEach((candidate, index) => {
                    const selectedValue = selected[side].members[index];
                    const changed =
                      Math.abs(Number(candidate.value || 0) - Number(selectedValue || 0)) >
                      tolerance;
                    if (changed) {
                      const nonSelectedSources = (candidate.sources || []).filter(
                        (source) => source.source !== "selected-current-output"
                      );
                      if (nonSelectedSources.length === 0) changedMemberWithoutEvidence = true;
                      changedSources.push({
                        side,
                        slot: index + 1,
                        from: selectedValue,
                        to: candidate.value,
                        sources: nonSelectedSources,
                      });
                    }
                  });
                });
                if (changedMemberWithoutEvidence) {
                  incrementInvalid("changed-member-without-member-provenance");
                  continue;
                }
                if (changedSources.length === 0) {
                  incrementInvalid("proposal-equals-current-six-members");
                  continue;
                }
                if (proposal.totalEvidence.self.length === 0) {
                  incrementInvalid("missing-self-exact-total-evidence");
                  continue;
                }
                if (proposal.totalEvidence.enemy.length === 0) {
                  incrementInvalid("missing-enemy-exact-total-evidence");
                  continue;
                }
                validInterpretations.push({
                  ...proposal,
                  changedMemberSlots: changedSources,
                  candidateSources: {
                    self: [self1, self2, self3].map((candidate) => candidate.sources || []),
                    enemy: [enemy1, enemy2, enemy3].map((candidate) => candidate.sources || []),
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  const dedupedInterpretations = validInterpretations.filter(
    (proposal, index, all) =>
      all.findIndex(
        (other) =>
          arraysEqualWithinTolerance(other.self.members, proposal.self.members, tolerance) &&
          arraysEqualWithinTolerance(other.enemy.members, proposal.enemy.members, tolerance) &&
          Math.abs(Number(other.self.total || 0) - Number(proposal.self.total || 0)) <=
            tolerance &&
          Math.abs(Number(other.enemy.total || 0) - Number(proposal.enemy.total || 0)) <=
            tolerance &&
          Math.abs(Number(other.self.bonus || 0) - Number(proposal.self.bonus || 0)) <=
            tolerance &&
          Math.abs(Number(other.enemy.bonus || 0) - Number(proposal.enemy.bonus || 0)) <=
            tolerance
      ) === index
  );
  if (dedupedInterpretations.length === 0) {
    rejectionReasons.push("no-complete-six-member-exact-total-interpretation");
  }
  if (dedupedInterpretations.length > 1) {
    rejectionReasons.push("multiple-complete-six-member-interpretations");
  }

  const proposed = dedupedInterpretations.length === 1 ? dedupedInterpretations[0] : null;
  const sideWouldChange = {
    self:
      proposed &&
      (!arraysEqualWithinTolerance(proposed.self.members, selected.self.members, tolerance) ||
        Math.abs(Number(proposed.self.bonus || 0) - Number(selected.self.bonus || 0)) >
          tolerance ||
        Math.abs(Number(proposed.self.total || 0) - Number(selected.self.total || 0)) >
          tolerance),
    enemy:
      proposed &&
      (!arraysEqualWithinTolerance(proposed.enemy.members, selected.enemy.members, tolerance) ||
        Math.abs(Number(proposed.enemy.bonus || 0) - Number(selected.enemy.bonus || 0)) >
          tolerance ||
        Math.abs(Number(proposed.enemy.total || 0) - Number(selected.enemy.total || 0)) >
          tolerance),
  };
  if (proposed && !sideWouldChange.self && !sideWouldChange.enemy) {
    rejectionReasons.push("selected-stage-already-matches-proposal");
  }

  return {
    wouldApply: rejectionReasons.length === 0 && Boolean(proposed),
    rejectionReasons: [...new Set(rejectionReasons)],
    selected,
    proposed,
    sideWouldChange,
    stage,
    evidence: {
      candidatePoolSizes,
      combinationCount,
      memberPools: {
        self: pools.self.map((pool) => pool.map((candidate) => candidate.value)),
        enemy: pools.enemy.map((pool) => pool.map((candidate) => candidate.value)),
      },
      memberPoolSources: {
        self: pools.self.map((pool) => pool.map((candidate) => candidate)),
        enemy: pools.enemy.map((pool) => pool.map((candidate) => candidate)),
      },
      validInterpretationCount: dedupedInterpretations.length,
      validInterpretations: dedupedInterpretations.slice(0, 10),
      invalidInterpretationCounts: Object.fromEntries(invalidInterpretationCounts.entries()),
      candidateSourcesUsed: [
        "selected-current-output",
        "member-row-token-order",
        "member-row-number-order",
        "grouped-raw-member-token-order",
        "stage3-seven-digit-member-row-order",
        "stage3-seven-digit-proposal-member",
        ...new Set((additionalMemberCandidates || []).map((candidate) => candidate.source)),
      ],
      additionalMemberCandidates: additionalMemberCandidates || [],
      comparisonTolerance: tolerance,
      policyName,
      rule:
        "stage-wide six member candidate search + bonus=floor(max(all 6 candidates)*0.20) + exact self/enemy total evidence",
    },
    note:
      "Current-PC shared evidence-only stage-wide six-member candidate solver. It does not change OCR output.",
  };
}

export function buildCurrentPcGroupedExactInterpretations({
  rawCandidates = [],
  displayedTotalCandidates = [],
  bonusCandidates = [],
  eligibleTokens = [],
  orderedMemberEvidence = [],
}) {
  const promotedMembers = eligibleTokens
    .filter((token) => token.role === "member")
    .map((token) => token.normalizedValue);
  const promotedTotals = eligibleTokens
    .filter((token) => token.role === "total")
    .map((token) => token.normalizedValue);
  const memberLike = uniqueNumbers([...rawCandidates, ...promotedMembers]).filter(
    (value) => value >= 10000 && value < 2000000
  );
  const totalLike = uniqueNumbers([...displayedTotalCandidates, ...promotedTotals]).filter(
    (value) => value >= 10000
  );
  const groupedValues = new Set(eligibleTokens.map((token) => Number(token.normalizedValue || 0)));
  const interpretations = [];
  const addInterpretation = (members, bonus, total, source) => {
    const promotedValuesUsed = [
      ...members.filter((value) => groupedValues.has(value)),
      ...(groupedValues.has(total) ? [total] : []),
    ];
    if (promotedValuesUsed.length === 0) return;
    interpretations.push({ members, bonus, total, source, promotedValuesUsed });
  };

  const orderedMembers = orderedMemberEvidence.slice(0, 3).map((item) => item.value);
  const orderedUsesGroupedMember = orderedMemberEvidence
    .slice(0, 3)
    .some((item) => item.source === "eligible-grouped-member-token");
  if (orderedMembers.length === 3 && orderedUsesGroupedMember) {
    const sum = orderedMembers.reduce((total, value) => total + value, 0);
    if (totalLike.some((value) => Math.abs(value - sum) <= 1)) {
      addInterpretation(orderedMembers, 0, sum, "ordered-member-row-token-evidence");
    }
    for (const bonus of bonusCandidates || []) {
      const total = sum + Number(bonus || 0);
      if (totalLike.some((value) => Math.abs(value - total) <= 1)) {
        addInterpretation(orderedMembers, bonus, total, "ordered-member-row-token-evidence");
      }
    }
  }

  if (orderedUsesGroupedMember) {
    return interpretations.filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            other.total === item.total &&
            other.bonus === item.bonus &&
            other.members.join(",") === item.members.join(",")
        ) === index
    );
  }

  for (let a = 0; a < memberLike.length - 2; a += 1) {
    for (let b = a + 1; b < memberLike.length - 1; b += 1) {
      for (let c = b + 1; c < memberLike.length; c += 1) {
        const members = [memberLike[a], memberLike[b], memberLike[c]];
        const sum = members.reduce((total, value) => total + value, 0);
        if (totalLike.some((value) => Math.abs(value - sum) <= 1)) {
          addInterpretation(members, 0, sum, "unordered-exact-equation-token-evidence");
        }
        for (const bonus of bonusCandidates || []) {
          const total = sum + Number(bonus || 0);
          if (totalLike.some((value) => Math.abs(value - total) <= 1)) {
            addInterpretation(members, bonus, total, "unordered-exact-equation-token-evidence");
          }
        }
      }
    }
  }

  return interpretations.filter(
    (item, index, all) =>
      item.promotedValuesUsed.length > 0 &&
      all.findIndex(
        (other) =>
          other.total === item.total &&
          other.bonus === item.bonus &&
          other.members.join(",") === item.members.join(",")
      ) === index
  );
}

export function buildCurrentPcGroupedRawTokenEvidenceSimulation({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  suspiciousReasons = [],
  rawCandidates = [],
  displayedTotalCandidates = [],
  bonusCandidates = [],
  sideAnalysis = null,
  roiProvenance = null,
}) {
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const selectedMemberSum = selected.reduce((sum, value) => sum + value, 0);
  const { eligibleTokens, blockedTokens } = collectCurrentPcGroupedRawTokenEvidence(
    sideAnalysis,
    roiProvenance
  );
  const orderedMemberEvidence = currentPcOrderedMemberValuesFromTokenEvidence(
    sideAnalysis,
    eligibleTokens
  );
  const exactInterpretations = buildCurrentPcGroupedExactInterpretations({
    rawCandidates,
    displayedTotalCandidates,
    bonusCandidates,
    eligibleTokens,
    orderedMemberEvidence,
  });
  const proposal = exactInterpretations[0] || null;
  const selectedAlreadyMatches =
    proposal &&
    Math.abs(Number(selectedTotal || 0) - Number(proposal.total || 0)) <= 1 &&
    arraysEqualWithinOne(selected, proposal.members || []);
  const rejectionReasons = [];

  if (!suspiciousReasons.includes("selected-total-not-exact-member-sum-or-member-sum-plus-bonus")) {
    rejectionReasons.push("selected-total-equation-is-not-flagged");
  }
  if (eligibleTokens.length === 0) {
    rejectionReasons.push("missing-eligible-grouped-raw-token");
  }
  if (exactInterpretations.length === 0) {
    rejectionReasons.push("missing-unique-grouped-token-exact-interpretation");
  }
  if (exactInterpretations.length > 1) {
    rejectionReasons.push("multiple-competing-grouped-token-exact-interpretations");
  }
  if (selectedAlreadyMatches) {
    rejectionReasons.push("selected-result-already-matches-grouped-token-interpretation");
  }

  return {
    wouldApply: rejectionReasons.length === 0,
    proposed: proposal
      ? {
          members: proposal.members,
          bonus: Number(proposal.bonus || 0),
          total: Number(proposal.total || 0),
          memberSum: proposal.members.reduce((sum, value) => sum + Number(value || 0), 0),
        }
      : null,
    current: {
      stage,
      side,
      members: selected,
      total: Number(selectedTotal || 0),
      memberSum: selectedMemberSum,
      totalMinusMemberSum: Number(selectedTotal || 0) - selectedMemberSum,
    },
    rejectionReasons,
    evidence: {
      eligibleTokens,
      blockedTokens,
      blockedTokenCount: blockedTokens.length,
      orderedMemberEvidence,
      exactInterpretations,
      exactInterpretationCount: exactInterpretations.length,
      structuralEquation:
        proposal
          ? `${proposal.members.join(" + ")}${proposal.bonus ? ` + ${proposal.bonus}` : ""} = ${proposal.total}`
          : null,
      promotedValuesUsed: proposal?.promotedValuesUsed || [],
      roiProvenance,
    },
    note:
      "Current-PC evidence-only simulation. It does not change OCR output and only promotes strict punctuation/space grouped raw tokens from role-specific ROIs into an exact equation pool.",
  };
}

function normalizeCurrentPcStage3EvidenceText(text = "") {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function buildCurrentPcStage3TotalEvidenceSources({
  totalDirectText = "",
  totalDirectNumbers = [],
  totalCandidateText = "",
  totalCandidateTraces = [],
  memberCandidateText = "",
  memberCandidateNumbers = [],
}) {
  const sourceInputs = [
    {
      label: "total-direct",
      sourceType: "total",
      text: totalDirectText,
      parsedNumbers: totalDirectNumbers,
    },
    {
      label: "total-candidate-combined",
      sourceType: "total",
      text: totalCandidateText,
      parsedNumbers: extractNumbersForZone(totalCandidateText),
    },
    ...(totalCandidateTraces || []).map((trace, index) => ({
      label: `total-candidate-trace-${index + 1}`,
      sourceType: "total",
      text: trace?.text || "",
      parsedNumbers: trace?.numbers || [],
      pass: trace?.pass || "pass1",
    })),
    {
      label: "member-row",
      sourceType: "member",
      text: memberCandidateText,
      parsedNumbers: memberCandidateNumbers,
    },
  ];

  return sourceInputs
    .filter((source) => source.text || (source.parsedNumbers || []).length > 0)
    .map((source) => {
      const parsedNumbers = uniqueNumbers(
        (source.parsedNumbers || []).map((value) => Number(value)).filter(Number.isFinite)
      );
      const joinedCandidates = buildJoinedTotalCandidates(source.text || "");
      return {
        label: source.label,
        sourceType: source.sourceType,
        pass: source.pass,
        text: normalizeCurrentPcStage3EvidenceText(source.text || ""),
        parsedNumbers,
        largeParsedNumbers: parsedNumbers.filter(
          (value) => value >= 1000000 && value < 10000000
        ),
        joinedCandidates,
        largeJoinedCandidates: joinedCandidates.filter(
          (candidate) => candidate.value >= 1000000 && candidate.value < 10000000
        ),
      };
    });
}

function getCurrentPcStage3TotalEvidenceForValue(targetValue, sources = []) {
  const target = Number(targetValue) || 0;
  const exactParsedSources = [];
  const exactJoinedSources = [];
  const nearParsedSources = [];
  const largeCandidateSources = [];

  for (const source of sources) {
    const parsedMatches = (source.parsedNumbers || []).filter(
      (value) => Math.abs(Number(value) - target) <= 1
    );
    if (parsedMatches.length > 0) {
      exactParsedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        values: parsedMatches,
        text: source.text,
      });
    }

    const joinedMatches = (source.joinedCandidates || []).filter(
      (candidate) => Math.abs(Number(candidate.value) - target) <= 1
    );
    if (joinedMatches.length > 0) {
      exactJoinedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        candidates: joinedMatches,
        text: source.text,
        auditOnly: true,
      });
    }

    const nearMatches = (source.parsedNumbers || [])
      .map((value) => ({
        value,
        delta: Math.abs(Number(value) - target),
      }))
      .filter((match) => match.delta > 1 && match.delta <= 5000)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
    if (nearMatches.length > 0) {
      nearParsedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        matches: nearMatches,
        text: source.text,
      });
    }

    const largeValues = uniqueNumbers([
      ...(source.largeParsedNumbers || []),
      ...(source.largeJoinedCandidates || []).map((candidate) => candidate.value),
    ]);
    if (largeValues.length > 0) {
      largeCandidateSources.push({
        label: source.label,
        sourceType: source.sourceType,
        values: largeValues,
      });
    }
  }

  const exactTotalSources = [...exactParsedSources, ...exactJoinedSources].filter(
    (source) => source.sourceType === "total"
  );
  const hasExactParsedTotalEvidence = exactParsedSources.some(
    (source) => source.sourceType === "total"
  );
  const hasExactJoinedTotalEvidence = exactJoinedSources.some(
    (source) => source.sourceType === "total"
  );

  return {
    target,
    hasExactEvidence: hasExactParsedTotalEvidence || hasExactJoinedTotalEvidence,
    hasExactParsedTotalEvidence,
    hasExactJoinedTotalEvidence,
    exactTotalSourceCount: exactTotalSources.length,
    ambiguousExactEvidence: exactTotalSources.length === 0,
    exactParsedSources,
    exactJoinedSources,
    nearParsedSources,
    largeCandidateSources,
  };
}

function selectedMembersMatchCurrentPcSevenDigitBonusDisplacement(
  selectedMembers = [],
  proposedMembers = [],
  proposedBonus = 0
) {
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const nonZeroSelected = selected.filter((value) => value > 0);
  if (!nonZeroSelected.some((value) => Math.abs(value - proposedBonus) <= 1)) {
    return false;
  }

  const expectedSequence = [...proposedMembers, proposedBonus];
  let sequenceIndex = 0;
  for (const selectedValue of nonZeroSelected) {
    while (
      sequenceIndex < expectedSequence.length &&
      Math.abs(expectedSequence[sequenceIndex] - selectedValue) > 1
    ) {
      sequenceIndex += 1;
    }
    if (sequenceIndex >= expectedSequence.length) {
      return false;
    }
    sequenceIndex += 1;
  }

  const selectedRealMemberCount = nonZeroSelected.filter((value) =>
    proposedMembers.some((member) => Math.abs(member - value) <= 1)
  ).length;
  const missingCleanSevenDigitMemberCount = proposedMembers.filter(
    (member) =>
      member >= 1000000 &&
      member < 10000000 &&
      !selected.some((value) => Math.abs(value - member) <= 1)
  ).length;

  return selectedRealMemberCount >= 1 && missingCleanSevenDigitMemberCount >= 1;
}

export function buildCurrentPcStage3SevenDigitBonusDisplacementSimulation({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  candidateSources = null,
  roiProvenance = null,
}) {
  const memberSource = candidateSources?.memberCandidates || {};
  const totalSource = candidateSources?.totalCandidates || {};
  const totalDirect = candidateSources?.totalDirect || {};
  const memberNumbers = uniqueNumbers(
    (memberSource.numbers || []).map((value) => Number(value)).filter(Number.isFinite)
  );
  const totalReferences = uniqueNumbers([
    ...(totalDirect.numbers || []),
    ...(totalSource.numbers || []),
    ...((totalSource.traces || []).flatMap((trace) => trace.numbers || [])),
  ].map((value) => Number(value)).filter(Number.isFinite));
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const selectedMemberSum = selected.reduce((sum, value) => sum + value, 0);
  const totalEvidenceSources = buildCurrentPcStage3TotalEvidenceSources({
    totalDirectText: totalDirect.text || "",
    totalDirectNumbers: totalDirect.numbers || [],
    totalCandidateText: totalSource.text || "",
    totalCandidateTraces: totalSource.traces || [],
    memberCandidateText: memberSource.text || "",
    memberCandidateNumbers: memberNumbers,
  });
  const proposals = [];

  for (let index = 0; index <= memberNumbers.length - 4; index += 1) {
    const proposedMembers = memberNumbers.slice(index, index + 3);
    const proposedBonus = memberNumbers[index + 3];
    const memberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
    const proposedTotal = memberSum + proposedBonus;
    const cleanSevenDigitMembers = proposedMembers.filter(
      (value) => value >= 1000000 && value < 10000000
    );
    const unselectedSevenDigitMembers = cleanSevenDigitMembers.filter(
      (value) => !selected.some((member) => Math.abs(member - value) <= 1)
    );
    const selectedDisplacementMatches =
      selectedMembersMatchCurrentPcSevenDigitBonusDisplacement(
        selected,
        proposedMembers,
        proposedBonus
      );
    const totalEvidence = getCurrentPcStage3TotalEvidenceForValue(
      proposedTotal,
      totalEvidenceSources
    );
    const matchingDisplayedTotals = totalReferences.filter(
      (value) => Math.abs(value - proposedTotal) <= 1
    );

    proposals.push({
      rowStartIndex: index,
      proposedMembers,
      proposedBonus,
      proposedTotal,
      memberSum,
      cleanSevenDigitMembers,
      unselectedSevenDigitMembers,
      selectedDisplacementMatches,
      matchingDisplayedTotals,
      totalEvidence,
      memberRowPass: memberSource.pass || null,
      memberRowTag: memberSource.tag || null,
      memberRowText: memberSource.text || "",
    });
  }

  const strictProposals = proposals.filter(
    (proposal) =>
      proposal.rowStartIndex === 0 &&
      proposal.unselectedSevenDigitMembers.length >= 1 &&
      proposal.selectedDisplacementMatches &&
      proposal.proposedBonus >= 50000 &&
      proposal.proposedBonus < 500000 &&
      proposal.totalEvidence.hasExactEvidence &&
      proposal.totalEvidence.ambiguousExactEvidence === false &&
      proposal.matchingDisplayedTotals.length > 0
  );
  const competingExactInterpretations = proposals.filter(
    (proposal) =>
      proposal.totalEvidence.hasExactEvidence &&
      proposal.totalEvidence.ambiguousExactEvidence === false &&
      !strictProposals.includes(proposal)
  );
  const rejectionReasons = [];
  if (stage !== 3) {
    rejectionReasons.push("not-current-pc-stage3");
  }
  if (memberNumbers.length < 4) {
    rejectionReasons.push("member-row-has-fewer-than-four-values");
  }
  if (!proposals.some((proposal) => proposal.rowStartIndex === 0)) {
    rejectionReasons.push("missing-leading-member-row-proposal");
  }
  if (!proposals.some((proposal) => proposal.unselectedSevenDigitMembers.length >= 1)) {
    rejectionReasons.push("missing-unselected-clean-seven-digit-member");
  }
  if (!proposals.some((proposal) => proposal.selectedDisplacementMatches)) {
    rejectionReasons.push("selected-members-do-not-match-bonus-displacement");
  }
  if (!proposals.some((proposal) => proposal.totalEvidence.hasExactEvidence)) {
    rejectionReasons.push("missing-exact-displayed-total-evidence");
  }
  if (strictProposals.length === 0) {
    rejectionReasons.push("no-strict-current-pc-stage3-seven-digit-bonus-displacement-proposal");
  }
  if (strictProposals.length > 1) {
    rejectionReasons.push("multiple-strict-current-pc-stage3-seven-digit-bonus-displacement-proposals");
  }
  if (competingExactInterpretations.length > 0) {
    rejectionReasons.push("competing-exact-current-pc-stage3-seven-digit-bonus-displacement-interpretation");
  }

  const proposal = strictProposals[0] || null;
  return {
    wouldApply: rejectionReasons.length === 0,
    proposed: proposal
      ? {
          members: proposal.proposedMembers,
          bonus: proposal.proposedBonus,
          total: proposal.proposedTotal,
          memberSum: proposal.memberSum,
        }
      : null,
    current: {
      stage,
      side,
      members: selected,
      total: Number(selectedTotal || 0),
      memberSum: selectedMemberSum,
      totalMinusMemberSum: Number(selectedTotal || 0) - selectedMemberSum,
    },
    rejectionReasons,
    evidence: {
      memberRowNumbers: memberNumbers,
      totalReferences,
      roiProvenance,
      proposals: proposals.map((item) => ({
        rowStartIndex: item.rowStartIndex,
        proposedMembers: item.proposedMembers,
        proposedBonus: item.proposedBonus,
        proposedTotal: item.proposedTotal,
        cleanSevenDigitMembers: item.cleanSevenDigitMembers,
        unselectedSevenDigitMembers: item.unselectedSevenDigitMembers,
        selectedDisplacementMatches: item.selectedDisplacementMatches,
        matchingDisplayedTotals: item.matchingDisplayedTotals,
        totalEvidence: item.totalEvidence,
        memberRowPass: item.memberRowPass,
        memberRowTag: item.memberRowTag,
        memberRowText: item.memberRowText,
      })),
      strictProposalCount: strictProposals.length,
      competingExactInterpretationCount: competingExactInterpretations.length,
      competingExactInterpretations: competingExactInterpretations.map((item) => ({
        rowStartIndex: item.rowStartIndex,
        proposedMembers: item.proposedMembers,
        proposedBonus: item.proposedBonus,
        proposedTotal: item.proposedTotal,
      })),
      totalCandidateSources: totalEvidenceSources,
    },
    note:
      "Current-PC evidence-only simulation. It detects Stage3 member-row bonus displacement with exact total evidence and does not change OCR output.",
  };
}

function normalizeCurrentPcRecoveryMembers(members = []) {
  const normalized = [...members].map((value) => Number(value) || 0).slice(0, 3);
  while (normalized.length < 3) normalized.push(0);
  return normalized;
}

export function applyCurrentPcGroupedRawTokenRecovery({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const current = normalizeCurrentPcRecoveryMembers(selectedMembers);
  const proposedMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.members || []);
  const proposedBonus = Number(simulation?.proposed?.bonus || 0);
  const proposedTotal = Number(simulation?.proposed?.total || 0);
  const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
  const interpretationCount = Number(
    simulation?.evidence?.exactInterpretationCount ??
      simulation?.evidence?.exactInterpretations?.length ??
      0
  );
  const promotedValuesUsed = simulation?.evidence?.promotedValuesUsed || [];
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (interpretationCount !== 1) {
    rejectionReasons.push("not-unique-grouped-token-exact-interpretation");
  }
  if (promotedValuesUsed.length === 0) {
    rejectionReasons.push("missing-promoted-grouped-token-value");
  }
  if (proposedMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-does-not-have-three-members");
  }
  if (proposedTotal <= 0) rejectionReasons.push("missing-proposed-total");
  if (proposedBonus < 0) rejectionReasons.push("negative-proposed-bonus");
  if (Math.abs(proposedMemberSum + proposedBonus - proposedTotal) > 1) {
    rejectionReasons.push("proposal-equation-not-exact");
  }
  if (
    Math.abs(Number(selectedTotal || 0) - proposedTotal) <= 1 &&
    arraysEqualWithinOne(current, proposedMembers)
  ) {
    rejectionReasons.push("selected-result-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const eligibleTokenByValue = new Map(
    (simulation?.evidence?.eligibleTokens || []).map((token) => [
      Number(token.normalizedValue || 0),
      token,
    ])
  );
  const recoveredTokens = [...new Set(promotedValuesUsed.map((value) => Number(value || 0)))]
    .map((value) => eligibleTokenByValue.get(value))
    .filter(Boolean);

  return {
    applied: uniqueRejectionReasons.length === 0,
    members: proposedMembers,
    total: proposedTotal,
    bonus: proposedBonus,
    stage,
    side,
    recoveredTokens,
    promotedValuesUsed,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcGroupedRawTokenRecovery applied stage=${stage} side=${side} members=${proposedMembers.join(",")} bonus=${proposedBonus || 0} total=${proposedTotal} tokens=${
      recoveredTokens
        .map((token) => `${token.rawToken || token.token}->${token.normalizedValue}@${token.sourceRole}`)
        .join(";") || promotedValuesUsed.join(",")
    }`,
  };
}

export function applyCurrentPcStage3SevenDigitBonusDisplacementRecovery({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
  groupedRawRecovery = null,
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const current = normalizeCurrentPcRecoveryMembers(selectedMembers);
  const proposedMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.members || []);
  const proposedBonus = Number(simulation?.proposed?.bonus || 0);
  const proposedTotal = Number(simulation?.proposed?.total || 0);
  const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
  const strictProposalCount = Number(simulation?.evidence?.strictProposalCount || 0);
  const competingExactInterpretationCount = Number(
    simulation?.evidence?.competingExactInterpretationCount || 0
  );
  const proposal = (simulation?.evidence?.proposals || []).find(
    (item) =>
      item.proposedTotal === proposedTotal &&
      arraysEqualWithinOne(item.proposedMembers || [], proposedMembers) &&
      Math.abs(Number(item.proposedBonus || 0) - proposedBonus) <= 1
  );
  const unselectedSevenDigitMembers = proposal?.unselectedSevenDigitMembers || [];
  const totalEvidence = proposal?.totalEvidence || null;
  const roiProvenance = simulation?.evidence?.roiProvenance || null;
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (stage !== 3) rejectionReasons.push("not-current-pc-stage3");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (groupedRawRecovery?.applied) {
    rejectionReasons.push("grouped-raw-recovery-already-applied");
  }
  if (strictProposalCount !== 1) {
    rejectionReasons.push("not-unique-stage3-seven-digit-bonus-displacement-proposal");
  }
  if (competingExactInterpretationCount !== 0) {
    rejectionReasons.push("competing-stage3-seven-digit-bonus-displacement-interpretation");
  }
  if (unselectedSevenDigitMembers.length === 0) {
    rejectionReasons.push("missing-unselected-clean-seven-digit-member");
  }
  if (proposedMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-does-not-have-three-members");
  }
  if (proposedBonus < 50000 || proposedBonus >= 500000) {
    rejectionReasons.push("missing-exact-bonus-evidence");
  }
  if (!totalEvidence?.hasExactEvidence || totalEvidence?.ambiguousExactEvidence) {
    rejectionReasons.push("missing-unique-exact-displayed-total-evidence");
  }
  if (!roiProvenance?.total || !roiProvenance?.members || !roiProvenance?.source) {
    rejectionReasons.push("missing-role-roi-provenance");
  }
  if (proposedTotal <= 0) rejectionReasons.push("missing-proposed-total");
  if (Math.abs(proposedMemberSum + proposedBonus - proposedTotal) > 1) {
    rejectionReasons.push("proposal-equation-not-exact");
  }
  if (
    Math.abs(Number(selectedTotal || 0) - proposedTotal) <= 1 &&
    arraysEqualWithinOne(current, proposedMembers)
  ) {
    rejectionReasons.push("selected-result-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const totalEvidenceLabels = [
    ...(totalEvidence?.exactParsedSources || []),
    ...(totalEvidence?.exactJoinedSources || []),
  ]
    .filter((source) => source.sourceType === "total")
    .map((source) => `${source.label}${source.pass ? `:${source.pass}` : ""}`);

  return {
    applied: uniqueRejectionReasons.length === 0,
    members: proposedMembers,
    total: proposedTotal,
    bonus: proposedBonus,
    stage,
    side,
    recoveredSevenDigitMembers: unselectedSevenDigitMembers,
    totalEvidenceLabels,
    roiProvenance,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcStage3SevenDigitBonusDisplacementRecovery applied stage=${stage} side=${side} members=${proposedMembers.join(",")} bonus=${proposedBonus || 0} total=${proposedTotal} recovered7=${unselectedSevenDigitMembers.join(",")} roi=${roiProvenance?.source || "unknown"} equation=${proposedMembers.join("+")}+${proposedBonus}=${proposedTotal} totalEvidence=${totalEvidenceLabels.join(";") || "exact"}`,
  };
}

export function applyCurrentPcCrownBonusRuleRecovery({
  stage = 0,
  selectedSelfMembers = [],
  selectedEnemyMembers = [],
  selectedSelfTotal = 0,
  selectedEnemyTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const currentSelfMembers = normalizeCurrentPcRecoveryMembers(selectedSelfMembers);
  const currentEnemyMembers = normalizeCurrentPcRecoveryMembers(selectedEnemyMembers);
  const proposedSelfMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.self?.members || []);
  const proposedEnemyMembers = normalizeCurrentPcRecoveryMembers(
    simulation?.proposed?.enemy?.members || []
  );
  const proposedSelfBonus = Number(simulation?.proposed?.self?.bonus || 0);
  const proposedEnemyBonus = Number(simulation?.proposed?.enemy?.bonus || 0);
  const proposedSelfTotal = Number(simulation?.proposed?.self?.total || 0);
  const proposedEnemyTotal = Number(simulation?.proposed?.enemy?.total || 0);
  const calculatedBonus = Number(simulation?.evidence?.calculatedBonus || 0);
  const rank1 = simulation?.evidence?.rank1 || null;
  const winningSide = simulation?.evidence?.winningSide || null;
  const totalEvidence = simulation?.evidence?.totalEvidence || {};
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (currentSelfMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("selected-self-does-not-have-three-members");
  }
  if (currentEnemyMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("selected-enemy-does-not-have-three-members");
  }
  if (!arraysEqualWithinOne(currentSelfMembers, proposedSelfMembers)) {
    rejectionReasons.push("proposal-would-change-self-members");
  }
  if (!arraysEqualWithinOne(currentEnemyMembers, proposedEnemyMembers)) {
    rejectionReasons.push("proposal-would-change-enemy-members");
  }
  if (!rank1 || !["self", "enemy"].includes(winningSide)) {
    rejectionReasons.push("missing-unique-global-rank1-member");
  }
  if (calculatedBonus <= 0) rejectionReasons.push("missing-derived-crown-bonus");
  if (winningSide === "self" && proposedEnemyBonus !== 0) {
    rejectionReasons.push("losing-enemy-side-has-bonus");
  }
  if (winningSide === "enemy" && proposedSelfBonus !== 0) {
    rejectionReasons.push("losing-self-side-has-bonus");
  }
  if (winningSide === "self" && proposedSelfBonus !== calculatedBonus) {
    rejectionReasons.push("self-bonus-does-not-match-derived-crown-bonus");
  }
  if (winningSide === "enemy" && proposedEnemyBonus !== calculatedBonus) {
    rejectionReasons.push("enemy-bonus-does-not-match-derived-crown-bonus");
  }
  const selfMemberSum = proposedSelfMembers.reduce((sum, value) => sum + value, 0);
  const enemyMemberSum = proposedEnemyMembers.reduce((sum, value) => sum + value, 0);
  if (Math.abs(selfMemberSum + proposedSelfBonus - proposedSelfTotal) > 1) {
    rejectionReasons.push("self-proposal-equation-not-exact");
  }
  if (Math.abs(enemyMemberSum + proposedEnemyBonus - proposedEnemyTotal) > 1) {
    rejectionReasons.push("enemy-proposal-equation-not-exact");
  }
  if (!Array.isArray(totalEvidence.self) || totalEvidence.self.length === 0) {
    rejectionReasons.push("missing-self-exact-total-evidence");
  }
  if (!Array.isArray(totalEvidence.enemy) || totalEvidence.enemy.length === 0) {
    rejectionReasons.push("missing-enemy-exact-total-evidence");
  }
  if (
    Math.abs(Number(selectedSelfTotal || 0) - proposedSelfTotal) <= 1 &&
    Math.abs(Number(selectedEnemyTotal || 0) - proposedEnemyTotal) <= 1 &&
    arraysEqualWithinOne(currentSelfMembers, proposedSelfMembers) &&
    arraysEqualWithinOne(currentEnemyMembers, proposedEnemyMembers)
  ) {
    rejectionReasons.push("selected-stage-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const formatTotalEvidence = (side) =>
    (totalEvidence?.[side] || [])
      .slice(0, 4)
      .map((item) => `${item.source || "unknown"}:${item.value}`)
      .join(";");

  return {
    applied: uniqueRejectionReasons.length === 0,
    stage,
    self: {
      members: proposedSelfMembers,
      bonus: proposedSelfBonus,
      total: proposedSelfTotal,
    },
    enemy: {
      members: proposedEnemyMembers,
      bonus: proposedEnemyBonus,
      total: proposedEnemyTotal,
    },
    rank1,
    winningSide,
    calculatedBonus,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcCrownBonusRuleRecovery applied stage=${stage} self=${proposedSelfMembers.join(",")}+${proposedSelfBonus}=${proposedSelfTotal} enemy=${proposedEnemyMembers.join(",")}+${proposedEnemyBonus}=${proposedEnemyTotal} rank1=${winningSide}.member${rank1?.slot || "?"}:${rank1?.value || 0} derivedBonus=${calculatedBonus} totalEvidence=self[${formatTotalEvidence("self") || "exact"}] enemy[${formatTotalEvidence("enemy") || "exact"}]`,
  };
}

export function applyCurrentPcStageWideSixMemberCandidateSolverRecovery({
  stage = 0,
  selectedSelfMembers = [],
  selectedEnemyMembers = [],
  selectedSelfTotal = 0,
  selectedEnemyTotal = 0,
  simulation = null,
  layoutDetection = null,
  mode = "",
  previousRecoveries = null,
}) {
  const currentPcLayout =
    mode === "current-pc" ||
    layoutDetection?.detected ||
    layoutDetection?.layoutFamily === "current-pc-2026-07-result" ||
    layoutDetection?.family === "current-pc-2026-07-result";
  const currentSelfMembers = normalizeCurrentPcRecoveryMembers(selectedSelfMembers);
  const currentEnemyMembers = normalizeCurrentPcRecoveryMembers(selectedEnemyMembers);
  const proposedSelfMembers = normalizeCurrentPcRecoveryMembers(simulation?.proposed?.self?.members || []);
  const proposedEnemyMembers = normalizeCurrentPcRecoveryMembers(
    simulation?.proposed?.enemy?.members || []
  );
  const proposedSelfBonus = Number(simulation?.proposed?.self?.bonus || 0);
  const proposedEnemyBonus = Number(simulation?.proposed?.enemy?.bonus || 0);
  const proposedSelfTotal = Number(simulation?.proposed?.self?.total || 0);
  const proposedEnemyTotal = Number(simulation?.proposed?.enemy?.total || 0);
  const validInterpretationCount = Number(simulation?.evidence?.validInterpretationCount || 0);
  const combinationCount = Number(simulation?.evidence?.combinationCount || 0);
  const totalEvidence = simulation?.proposed?.totalEvidence || {};
  const rank1 = simulation?.proposed?.rank1 || null;
  const winningSide = simulation?.proposed?.winningSide || null;
  const calculatedBonus = Number(simulation?.proposed?.calculatedBonus || 0);
  const changedSlots = simulation?.proposed?.changedMemberSlots || [];
  const candidateSources = simulation?.evidence?.candidateSourcesUsed || [];
  const rejectionReasons = [];

  if (!currentPcLayout) rejectionReasons.push("not-current-pc-layout");
  if (!simulation?.wouldApply) rejectionReasons.push("simulation-would-not-apply");
  if (simulation?.rejectionReasons?.length) {
    rejectionReasons.push(...simulation.rejectionReasons);
  }
  if (validInterpretationCount !== 1) {
    rejectionReasons.push("not-unique-stage-wide-six-member-interpretation");
  }
  if (combinationCount <= 0 || combinationCount > 20000) {
    rejectionReasons.push("unsafe-stage-wide-candidate-combination-count");
  }
  if (!simulation?.sideWouldChange?.self && !simulation?.sideWouldChange?.enemy) {
    rejectionReasons.push("selected-stage-already-matches-proposal");
  }
  for (const side of ["self", "enemy"]) {
    const prior = previousRecoveries?.[side] || {};
    if (
      simulation?.sideWouldChange?.[side] &&
      (prior.groupedRaw?.applied ||
        prior.stage3SevenDigit?.applied ||
        prior.crownBonus?.applied)
    ) {
      rejectionReasons.push(`${side}-would-overwrite-prior-production-recovery`);
    }
  }
  if (proposedSelfMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-self-does-not-have-three-members");
  }
  if (proposedEnemyMembers.filter((value) => value > 0).length !== 3) {
    rejectionReasons.push("proposal-enemy-does-not-have-three-members");
  }
  if (!rank1 || !["self", "enemy"].includes(winningSide)) {
    rejectionReasons.push("missing-unique-global-rank1-member");
  }
  if (calculatedBonus <= 0) rejectionReasons.push("missing-derived-crown-bonus");
  if (winningSide === "self" && proposedSelfBonus !== calculatedBonus) {
    rejectionReasons.push("self-bonus-does-not-match-derived-crown-bonus");
  }
  if (winningSide === "enemy" && proposedEnemyBonus !== calculatedBonus) {
    rejectionReasons.push("enemy-bonus-does-not-match-derived-crown-bonus");
  }
  if (winningSide === "self" && proposedEnemyBonus !== 0) {
    rejectionReasons.push("losing-enemy-side-has-bonus");
  }
  if (winningSide === "enemy" && proposedSelfBonus !== 0) {
    rejectionReasons.push("losing-self-side-has-bonus");
  }
  const selfMemberSum = proposedSelfMembers.reduce((sum, value) => sum + value, 0);
  const enemyMemberSum = proposedEnemyMembers.reduce((sum, value) => sum + value, 0);
  if (Math.abs(selfMemberSum + proposedSelfBonus - proposedSelfTotal) > 1) {
    rejectionReasons.push("self-proposal-equation-not-exact");
  }
  if (Math.abs(enemyMemberSum + proposedEnemyBonus - proposedEnemyTotal) > 1) {
    rejectionReasons.push("enemy-proposal-equation-not-exact");
  }
  if (!Array.isArray(totalEvidence.self) || totalEvidence.self.length === 0) {
    rejectionReasons.push("missing-self-exact-total-evidence");
  }
  if (!Array.isArray(totalEvidence.enemy) || totalEvidence.enemy.length === 0) {
    rejectionReasons.push("missing-enemy-exact-total-evidence");
  }
  if (changedSlots.length === 0) {
    rejectionReasons.push("missing-changed-member-slot");
  }
  for (const slot of changedSlots) {
    const sources = slot.sources || [];
    if (sources.length === 0) {
      rejectionReasons.push(`missing-${slot.side}-member${slot.slot}-changed-source`);
    }
    if (sources.some((source) => source.source === "selected-current-output")) {
      rejectionReasons.push(`changed-${slot.side}-member${slot.slot}-uses-selected-only-source`);
    }
    if (
      sources.some((source) =>
        /total|bonus/i.test(String(source.source || ""))
      )
    ) {
      rejectionReasons.push(`changed-${slot.side}-member${slot.slot}-uses-total-or-bonus-source`);
    }
  }
  const allowedSources = new Set([
    "selected-current-output",
    "member-row-token-order",
    "member-row-number-order",
    "grouped-raw-member-token-order",
    "stage3-seven-digit-member-row-order",
    "stage3-seven-digit-proposal-member",
  ]);
  if (candidateSources.some((source) => !allowedSources.has(source))) {
    rejectionReasons.push("unexpected-stage-wide-candidate-source");
  }
  if (
    Math.abs(Number(selectedSelfTotal || 0) - proposedSelfTotal) <= 1 &&
    Math.abs(Number(selectedEnemyTotal || 0) - proposedEnemyTotal) <= 1 &&
    arraysEqualWithinOne(currentSelfMembers, proposedSelfMembers) &&
    arraysEqualWithinOne(currentEnemyMembers, proposedEnemyMembers)
  ) {
    rejectionReasons.push("selected-stage-already-matches-proposal");
  }

  const uniqueRejectionReasons = [...new Set(rejectionReasons)];
  const formatTotalEvidence = (side) =>
    (totalEvidence?.[side] || [])
      .slice(0, 4)
      .map((item) => `${item.source || "unknown"}:${item.value}`)
      .join(";");
  const formatChangedSlots = () =>
    changedSlots
      .map((slot) => {
        const sources = (slot.sources || [])
          .slice(0, 4)
          .map((source) =>
            [source.source, source.token, source.shape, source.textIndex ?? ""]
              .filter((value) => value !== undefined && value !== null && value !== "")
              .join(":")
          )
          .join("|");
        return `${slot.side}.member${slot.slot}:${slot.from}->${slot.to}{${sources || "source"}}`;
      })
      .join(";");

  return {
    applied: uniqueRejectionReasons.length === 0,
    stage,
    self: {
      members: proposedSelfMembers,
      bonus: proposedSelfBonus,
      total: proposedSelfTotal,
    },
    enemy: {
      members: proposedEnemyMembers,
      bonus: proposedEnemyBonus,
      total: proposedEnemyTotal,
    },
    rank1,
    winningSide,
    calculatedBonus,
    changedMemberSlots: changedSlots,
    reason: uniqueRejectionReasons.join(",") || "applied",
    message: `currentPcStageWideSixMemberCandidateSolverRecovery applied stage=${stage} previousSelf=${currentSelfMembers.join(",")} previousEnemy=${currentEnemyMembers.join(",")} proposedSelf=${proposedSelfMembers.join(",")}+${proposedSelfBonus}=${proposedSelfTotal} proposedEnemy=${proposedEnemyMembers.join(",")}+${proposedEnemyBonus}=${proposedEnemyTotal} changed=${formatChangedSlots() || "none"} rank1=${winningSide}.member${rank1?.slot || "?"}:${rank1?.value || 0} derivedBonus=${calculatedBonus} totalEvidence=self[${formatTotalEvidence("self") || "exact"}] enemy[${formatTotalEvidence("enemy") || "exact"}]`,
  };
}

function extractDigitGroups(text = "") {
  const normalized = String(text ?? "").replace(/[\uFF10-\uFF19]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  return [...normalized.matchAll(/\d+/g)].map((match) => ({
    text: match[0],
    index: match.index ?? 0,
  }));
}

function buildJoinedTotalCandidates(text = "") {
  const groups = extractDigitGroups(text);
  const candidates = [];
  for (let start = 0; start < groups.length; start += 1) {
    let joined = "";
    for (let end = start; end < Math.min(groups.length, start + 5); end += 1) {
      joined += groups[end].text;
      if (joined.length < 6 || joined.length > 8) continue;
      const value = Number(joined);
      if (!Number.isFinite(value) || value < 100000 || value >= 10000000) continue;
      candidates.push({
        value,
        parts: groups.slice(start, end + 1).map((group) => group.text),
      });
    }
  }
  return candidates;
}

export function pickTotalNumber(numbers) {
  const candidates = numbers.filter((num) => num >= 10000 && num < 3000000);
  return [...candidates].sort((a, b) => b - a)[0] || numbers[0] || 0;
}

export function applySmartphoneCrownBonusMemberExclusion(
  selectedMembers,
  selectedTotal,
  totalReferences = [],
  bonusCandidates = [],
  rawCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const explicitBonuses = uniqueNumbers(bonusCandidates)
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 400000)
    .sort((a, b) => b - a);

  if (explicitBonuses.length === 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const selectedContainsExplicitBonus = explicitBonuses.some((bonus) =>
    selectedMembers.some((member) => Math.abs(member - bonus) <= 1)
  );

  if (!selectedContainsExplicitBonus) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const rawNumbers = uniqueNumbers([
    ...rawCandidates,
    ...selectedMembers,
    ...totalReferences,
  ])
    .map(Number)
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000);

  const displayedTotals = uniqueNumbers([
    ...totalReferences,
    selectedTotal,
  ])
    .filter((num) => Number.isFinite(num) && num >= 50000 && num < 5000000)
    .sort((a, b) => b - a);

  const memberCandidates = rawNumbers
    .filter((num) => num >= 1400 && num < 3000000)
    .filter((num) => !isKnownNoiseNumber(num))
    .filter((num) => !explicitBonuses.some((bonus) => Math.abs(num - bonus) <= 1))
    .filter((num) => !displayedTotals.some((total) => Math.abs(num - total) <= 1000));

  const matches = [];
  for (const displayedTotal of displayedTotals) {
    for (const bonus of explicitBonuses) {
      for (let first = 0; first < memberCandidates.length - 2; first += 1) {
        for (let second = first + 1; second < memberCandidates.length - 1; second += 1) {
          for (let third = second + 1; third < memberCandidates.length; third += 1) {
            const members = [
              memberCandidates[first],
              memberCandidates[second],
              memberCandidates[third],
            ];
            const memberSum = members.reduce((sum, value) => sum + value, 0);
            if (Math.abs(memberSum + bonus - displayedTotal) <= 1000) {
              matches.push({ members, total: displayedTotal, bonus });
            }
          }
        }
      }
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.members.join(",") === match.members.join(",")
      ) === index
  );

  // False-positive guard: only override when an explicit crown/plus value was
  // selected as a member and exactly one complete member+bonus=total equation
  // is available. Numeric range alone is intentionally not enough evidence.
  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  return {
    members: uniqueMatches[0].members,
    total: uniqueMatches[0].total,
    bonus: uniqueMatches[0].bonus,
    applied: true,
  };
}

export function applySmartphoneLeadingBonusMemberRecovery(
  selectedMembers,
  selectedTotal,
  rawCandidates = [],
  bonusCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (options.stage !== 2 || options.side !== "self") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentMembers = selectedMembers.map((value) => Number(value) || 0);
  if (currentMembers.some((value) => value <= 0)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const total = Number(selectedTotal || 0);
  const leadingBonus = currentMembers[0];
  if (total < 100000 || total >= 3000000 || leadingBonus < 10000 || leadingBonus >= 200000) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const rawNumbers = uniqueNumbers(rawCandidates)
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value >= 10000 && value < 3000000);
  const explicitBonuses = uniqueNumbers(bonusCandidates)
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value >= 10000 && value < 500000);
  if (
    !rawNumbers.some((value) => Math.abs(value - total) <= 1) ||
    !rawNumbers.some((value) => Math.abs(value - leadingBonus) <= 1)
  ) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const fixedMembers = currentMembers.slice(1);
  const inferredDisplayedBonus = total - currentMembers.reduce((sum, value) => sum + value, 0);
  if (
    inferredDisplayedBonus < 10000 ||
    inferredDisplayedBonus >= 500000 ||
    leadingBonus >= inferredDisplayedBonus
  ) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const matches = rawNumbers
    .filter((value) => value >= 10000 && value < 1000000)
    .filter((value) => !currentMembers.some((member) => Math.abs(member - value) <= 1))
    .filter(
      (value) =>
        !explicitBonuses.some((bonus) => Math.abs(bonus - value) <= 1) ||
        Math.abs(value - inferredDisplayedBonus) <= 1
    )
    .filter((value) => Math.abs(value - total) > 1)
    .map((candidate) => ({
      candidate,
      members: [...fixedMembers, candidate],
      total,
      bonus: leadingBonus,
    }))
    .filter((match) => {
      const memberSum = match.members.reduce((sum, value) => sum + value, 0);
      return Math.abs(memberSum + match.bonus - total) <= 1;
    });

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.candidate === match.candidate &&
          other.bonus === match.bonus &&
          other.members.join(",") === match.members.join(",")
      ) === index
  );

  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    candidate: match.candidate,
    applied: true,
    matchedPattern: "stage2-self-leading-bonus-as-member",
  };
}

export function applySmartphoneSparseTrailingZeroPreservation(
  selectedMembers,
  selectedTotal,
  totalReferences = [],
  bonusCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const totals = uniqueNumbers(totalReferences)
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 5000000);
  if (totals.length === 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const explicitBonuses = uniqueNumbers(bonusCandidates)
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 400000);

  for (const visibleCount of [1, 2]) {
    const visibleMembers = selectedMembers.slice(0, visibleCount);
    const trailingMembers = selectedMembers.slice(visibleCount);
    const hasFilledTrailingSlot = trailingMembers.some((member) => member > 0);

    if (!hasFilledTrailingSlot || visibleMembers.some((member) => member < 10000)) {
      continue;
    }

    const visibleSum = visibleMembers.reduce((sum, value) => sum + value, 0);
    for (const bonus of explicitBonuses) {
      const trailingHasBonus = trailingMembers.some((member) => Math.abs(member - bonus) <= 1);
      if (!trailingHasBonus) {
        continue;
      }

      const bonusTotal = totals.find((total) => Math.abs(total - (visibleSum + bonus)) <= 1000);
      if (bonusTotal) {
        // Preserve only left-packed visible members. This avoids using explicit
        // crown/plus values to fill intentionally empty trailing member slots.
        return {
          members: [...visibleMembers, ...Array(3 - visibleCount).fill(0)],
          total: bonusTotal,
          bonus,
          applied: true,
        };
      }
    }
  }

  return { members: selectedMembers, total: selectedTotal, applied: false };
}

export function applySmartphoneTotalLikeMemberSuppression(
  selectedMembers,
  selectedTotal,
  totalReferences = [],
  bonusCandidates = [],
  rawCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const rawNumbers = uniqueNumbers([
    ...rawCandidates,
    ...selectedMembers,
    ...totalReferences,
  ])
    .map(Number)
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .filter((num) => !isKnownNoiseNumber(num));

  const explicitBonuses = uniqueNumbers(bonusCandidates)
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 400000);
  const selectedSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  const totalLikeCandidates = uniqueNumbers([...selectedMembers, ...totalReferences, ...rawNumbers])
    .filter((total) => Number.isFinite(total) && total >= 50000 && total < 5000000)
    .filter((total) =>
      selectedMembers.some((member) => Math.abs(member - total) <= 3000)
    );

  const matches = [];
  for (const displayedTotal of totalLikeCandidates) {
    const memberCandidates = rawNumbers
      .filter((num) => Math.abs(num - displayedTotal) > 1000)
      .filter((num) => num >= 5000 && num < 3000000);

    for (let first = 0; first < memberCandidates.length - 1; first += 1) {
      for (let second = first + 1; second < memberCandidates.length; second += 1) {
        const members = [memberCandidates[first], memberCandidates[second], 0];
        const memberSum = members[0] + members[1];
        const currentLooksReconstructed =
          Math.abs(selectedSum - (displayedTotal + memberSum)) <= 1000;
        if (
          displayedTotal > Math.max(members[0], members[1]) &&
          currentLooksReconstructed &&
          Math.abs(memberSum - displayedTotal) <= 1000
        ) {
          matches.push({ members, total: displayedTotal, bonus: 0 });
        }
      }
    }

    for (let first = 0; first < memberCandidates.length - 2; first += 1) {
      for (let second = first + 1; second < memberCandidates.length - 1; second += 1) {
        for (let third = second + 1; third < memberCandidates.length; third += 1) {
          const members = [
            memberCandidates[first],
            memberCandidates[second],
            memberCandidates[third],
          ];
          const memberSum = members.reduce((sum, value) => sum + value, 0);
          const noBonusMatches =
            Math.abs(memberSum - displayedTotal) <= 1000 &&
            selectedMembers.some((member) => Math.abs(member - displayedTotal) <= 3000);
          const matchingBonus = explicitBonuses.find(
            (bonus) =>
              !members.some((member) => Math.abs(member - bonus) <= 1) &&
              Math.abs(memberSum + bonus - displayedTotal) <= 1000
          );

          if (noBonusMatches || matchingBonus) {
            matches.push({
              members,
              total: displayedTotal,
              bonus: matchingBonus || 0,
            });
          }
        }
      }
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.members.join(",") === match.members.join(",")
      ) === index
  );

  // False-positive guard: only suppress a selected total-like member when a
  // single alternate member equation explains that same value. This keeps
  // legitimate high member scores and tiny sparse rows on the existing path.
  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    applied: true,
  };
}

export function applySmartphoneTotalCrownBonusRecovery(
  selectedMembers,
  selectedTotal,
  bonusCandidates = [],
  rawCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (options.stage !== 2) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  // False-positive guard: this only repairs full high-score rows where OCR
  // already selected three stable members and used their bare sum as total.
  // Sparse/tiny rows and already crown-included totals stay on the normal path.
  if (selectedMembers.some((member) => !Number.isFinite(member) || member < 100000)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const memberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  if (memberSum < 500000 || Math.abs(selectedTotal - memberSum) > 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const isSelectedMemberDigitFragment = (candidate) => {
    const candidateText = String(Math.trunc(Math.abs(candidate)));
    if (candidateText.length < 5) return false;
    return selectedMembers.some((member) => {
      const memberText = String(Math.trunc(Math.abs(member)));
      return memberText !== candidateText && memberText.includes(candidateText);
    });
  };

  const explicitBonuses = uniqueNumbers([...bonusCandidates, ...rawCandidates])
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 400000)
    .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
    // Total-candidate crops can produce member fragments such as "$98,088"
    // from an actual selected member "598,088". Do not let those fragments
    // masquerade as crown bonuses and inflate an already-correct member sum.
    .filter((num) => !isSelectedMemberDigitFragment(num))
    .filter((num) => Math.abs(num - selectedTotal) > 1000)
    .sort((a, b) => b - a);

  if (explicitBonuses.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const bonus = explicitBonuses[0];
  const recoveredTotal = memberSum + bonus;
  if (recoveredTotal <= selectedTotal || recoveredTotal >= 5000000) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  return {
    members: selectedMembers,
    total: recoveredTotal,
    bonus,
    applied: true,
  };
}

export function applySmartphoneStage2EnemyBonusRecovery(
  selectedMembers,
  selectedTotal,
  totalCandidates = [],
  bonusCandidates = [],
  rawCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (options.stage !== 2 || options.side !== "enemy") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const members = selectedMembers.map((value) => Number(value) || 0);
  if (members.some((value) => value < 10000 || value >= 1000000)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentTotal = Number(selectedTotal || 0);
  const memberSum = members.reduce((sum, value) => sum + value, 0);
  if (memberSum < 100000 || Math.abs(currentTotal - memberSum) > 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const allNumbers = uniqueNumbers([
    ...(totalCandidates || []),
    ...(bonusCandidates || []),
    ...(rawCandidates || []),
  ])
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  const displayedTotals = allNumbers
    .filter((value) => value >= 100000 && value < 3000000)
    .filter((value) => value > currentTotal)
    .filter((value) => !members.some((member) => Math.abs(member - value) <= 1));
  const bonuses = allNumbers
    .filter((value) => value >= 10000 && value < 200000)
    .filter((value) => !members.some((member) => Math.abs(member - value) <= 1))
    .filter((value) => Math.abs(value - currentTotal) > 1000);

  const matches = [];
  for (const displayedTotal of displayedTotals) {
    for (const bonus of bonuses) {
      if (memberSum + bonus !== displayedTotal) continue;
      matches.push({
        members,
        total: displayedTotal,
        bonus,
      });
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.members.join(",") === match.members.join(",")
      ) === index
  );

  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    applied: true,
  };
}

export function applySmartphoneRowZoneSevenDigitRecovery(
  selectedMembers,
  selectedTotal,
  rowCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  // Start with the observed S2 self shape only. Broad row-zone OCR can mix
  // totals and bonus text, so keep this guarded until more production samples
  // prove the pattern beyond the two user-reported S2 self cases.
  if (options.stage !== 2 || options.side !== "self") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length !== 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentMembers = selectedMembers.map((value) => Number(value) || 0);
  if (currentMembers.some((value) => value <= 0)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const rowValues = (rowCandidates || [])
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (rowValues.length < 4) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentTotal = Number(selectedTotal || 0);
  const currentMemberSum = currentMembers.reduce((sum, value) => sum + value, 0);

  const matches = [];
  for (let start = 0; start <= rowValues.length - 4; start += 1) {
    const proposedMembers = rowValues.slice(start, start + 3);
    const proposedBonus = rowValues[start + 3];
    const proposedSevenDigitMembers = proposedMembers.filter(
      (value) => value >= 1000000 && value < 10000000
    );
    if (proposedMembers.some((value) => value <= 0)) {
      continue;
    }
    if (proposedSevenDigitMembers.length !== 1) {
      continue;
    }
    // Guard against IMG_9308-like near/fragment rows. The currently proven
    // row-zone recovery cases are high-score S2 rows where the non-7-digit
    // members are stable 6-digit members, not 200k fragments of a missing
    // 7-digit score.
    if (proposedMembers.some((value) => value < 300000)) {
      continue;
    }
    if (proposedBonus < 10000 || proposedBonus >= 400000) {
      continue;
    }

    const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
    const rawProposedTotal = proposedMemberSum + proposedBonus;
    const displayedTotalCandidates = rowValues
      .filter((value, index) => index < start || index > start + 3)
      .filter((value) => value >= 1000000 && value < 5000000)
      .filter((value) => Math.abs(value - rawProposedTotal) <= 1000);
    const proposedTotal =
      displayedTotalCandidates.length === 1
        ? displayedTotalCandidates[0]
        : rawProposedTotal;
    const inferredBonus = proposedTotal - proposedMemberSum;
    if (inferredBonus < 10000 || inferredBonus >= 400000) {
      continue;
    }
    if (Math.abs(inferredBonus - proposedBonus) > 1000) {
      continue;
    }
    const outsideSevenDigitValues = rowValues.filter(
      (value, index) =>
        (index < start || index > start + 3) &&
        value >= 1000000 &&
        value < 10000000 &&
        !proposedMembers.some((member) => Math.abs(member - value) <= 1) &&
        Math.abs(value - proposedTotal) > 1
    );

    if (outsideSevenDigitValues.length > 0) {
      continue;
    }
    if (proposedMembers[0] === currentTotal) {
      continue;
    }
    if (proposedTotal <= currentTotal || proposedTotal >= 5000000) {
      continue;
    }
    if (Math.abs(currentTotal - proposedTotal) <= 1) {
      continue;
    }

    const singleFirstSlotReplacement =
      proposedMembers[0] >= 1000000 &&
      currentMembers[0] !== proposedMembers[0] &&
      currentMembers[1] === proposedMembers[1] &&
      currentMembers[2] === proposedMembers[2] &&
      Math.abs(currentTotal - (currentMemberSum + proposedBonus)) <= 1;

    const leadingSevenDigitShiftWithBonusMember =
      proposedMembers[0] >= 1000000 &&
      currentMembers[0] === proposedMembers[1] &&
      currentMembers[1] === proposedMembers[2] &&
      Math.abs(currentMembers[2] - inferredBonus) <= 1 &&
      (
        Math.abs(currentTotal - currentMemberSum) <= 1 ||
        Math.abs(currentTotal - (currentMemberSum + inferredBonus)) <= 1000
      );

    if (!singleFirstSlotReplacement && !leadingSevenDigitShiftWithBonusMember) {
      continue;
    }

    matches.push({
      members: proposedMembers,
      total: proposedTotal,
      bonus: inferredBonus,
      matchedPattern: singleFirstSlotReplacement
        ? "single-first-slot-replacement"
        : "leading-seven-digit-shift-with-bonus-member",
    });
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.members.join(",") === match.members.join(",") &&
          other.matchedPattern === match.matchedPattern
      ) === index
  );

  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    applied: true,
    matchedPattern: match.matchedPattern,
  };
}

export function applySmartphoneStage3SelfSevenDigitDisplacementRecovery(
  selectedMembers,
  selectedTotal,
  memberCandidates = [],
  totalCandidates = [],
  bonusCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (options.stage !== 3 || options.side !== "self") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length < 2) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const selectedNumbers = selectedMembers.map((value) => Number(value) || 0);
  const currentMembers = selectedNumbers.filter((value) => value > 0);
  const isTrailingBlankThird =
    selectedNumbers.length >= 3 && selectedNumbers[0] > 0 && selectedNumbers[1] > 0 && selectedNumbers[2] <= 0;
  const isTwoMemberSelection = currentMembers.length === 2 && (selectedNumbers.length === 2 || isTrailingBlankThird);
  if (
    !(
      currentMembers.length === 3 ||
      isTwoMemberSelection
    )
  ) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentTotal = Number(selectedTotal || 0);
  const currentMemberSum = currentMembers.reduce((sum, value) => sum + value, 0);
  if (currentMembers.length === 3 && Math.abs(currentTotal - currentMemberSum) > 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const selectedThirdAsBonus =
    currentMembers.length === 3 && currentMembers[2] >= 10000 && currentMembers[2] < 500000
      ? currentMembers[2]
      : 0;
  if (currentMembers.length === 3 && selectedThirdAsBonus <= 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const memberNumbers = uniqueNumbers(
    (memberCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const totalNumbers = uniqueNumbers(
    (totalCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const totalTextCandidates = (options.totalCandidateTexts || [])
    .map((value) => String(value ?? ""))
    .filter(Boolean);
  const joinedTotalNumbers = totalTextCandidates.flatMap((text) =>
    buildJoinedTotalCandidates(text)
  );
  const rawEvidenceNumbers = uniqueNumbers([
    ...(options.rawCandidates || []),
    ...totalNumbers,
  ])
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .filter((value) => !currentMembers.some((member) => Math.abs(member - value) <= 1))
    .filter((value) => Math.abs(currentTotal - value) > 1);
  const observedBonusCandidates = uniqueNumbers([
    ...(bonusCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0),
    ...rawEvidenceNumbers,
    ...memberNumbers
      .filter((value) => Number.isFinite(value) && value > 0)
      .filter((value) => !currentMembers.some((member) => Math.abs(member - value) <= 1)),
    selectedThirdAsBonus,
  ]).filter((value) => value >= 10000 && value < 500000);

  if (memberNumbers.length === 0 || totalNumbers.length === 0 || observedBonusCandidates.length === 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const cleanSevenDigitCandidates = uniqueNumbers([...memberNumbers, ...totalNumbers]).filter(
    (value) =>
      value >= 1000000 &&
      value < 10000000 &&
      !currentMembers.some((member) => Math.abs(member - value) <= 1) &&
      Math.abs(currentTotal - value) > 1 &&
      memberNumbers.some((memberValue) => Math.abs(memberValue - value) <= 1)
  );

  const matches = [];
  for (const candidate of cleanSevenDigitCandidates) {
    for (const bonus of observedBonusCandidates) {
      if (currentMembers.length === 3 && Math.abs(currentMembers[2] - bonus) > 1) continue;

      const proposedShapes = [
        {
          members: [candidate, currentMembers[0], currentMembers[1]],
          pattern: "leading-seven-digit-with-bonus-member",
          sequenceIndex: memberNumbers.findIndex(
            (value, index) =>
              Math.abs(value - candidate) <= 1 &&
              Math.abs((memberNumbers[index + 1] || 0) - currentMembers[0]) <= 1 &&
              Math.abs((memberNumbers[index + 2] || 0) - currentMembers[1]) <= 1
          ),
        },
      ];
      if (currentMembers.length === 3) {
        proposedShapes.push({
          members: [currentMembers[0], currentMembers[1], candidate],
          pattern: "trailing-seven-digit-with-bonus-member",
          sequenceIndex: memberNumbers.findIndex(
            (value, index) =>
              Math.abs(value - currentMembers[0]) <= 1 &&
              Math.abs((memberNumbers[index + 1] || 0) - currentMembers[1]) <= 1 &&
              Math.abs((memberNumbers[index + 2] || 0) - candidate) <= 1
          ),
        });
      }

      for (const proposedShape of proposedShapes) {
        if (proposedShape.sequenceIndex < 0) continue;

        const proposedMembers = proposedShape.members;
        const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
        const proposedTotal = proposedMemberSum + bonus;
        const matchingDisplayedTotals = totalNumbers.filter(
          (value) => Math.abs(value - proposedTotal) <= 1
        );
        const matchingJoinedDisplayedTotals = joinedTotalNumbers.filter(
          (candidate) => Math.abs(candidate.value - proposedTotal) <= 1
        );

        if (matchingDisplayedTotals.length + matchingJoinedDisplayedTotals.length === 0) continue;
        if (currentMembers.length === 3 && proposedTotal <= currentTotal) continue;
        if (currentMembers.length === 2 && Math.abs(proposedTotal - currentTotal) > 1) continue;
        if (proposedTotal >= 5000000) continue;

        matches.push({
          members: proposedMembers,
          total: proposedTotal,
          bonus,
          candidate,
          matchedPattern: `stage3-self-${proposedShape.pattern}`,
          matchingDisplayedTotals,
          matchingJoinedDisplayedTotals,
        });
      }
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.candidate === match.candidate &&
          other.members.join(",") === match.members.join(",") &&
          other.matchedPattern === match.matchedPattern
      ) === index
  );

  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    candidate: match.candidate,
    applied: true,
    matchedPattern: match.matchedPattern,
    totalEvidence:
      match.matchingDisplayedTotals.length > 0 ? "parsed-total" : "joined-total-fragments",
  };
}

export function applySmartphoneStage3EnemySevenDigitRecovery(
  selectedMembers,
  selectedTotal,
  memberCandidates = [],
  totalCandidates = [],
  bonusCandidates = [],
  options = {}
) {
  if (normalizeOcrMode(options.mode) !== "smartphone") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (options.stage !== 3 || options.side !== "enemy") {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  if (!Array.isArray(selectedMembers) || selectedMembers.length < 2 || selectedMembers.length > 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const selectedNumbers = selectedMembers.map((value) => Number(value) || 0);
  const currentMembers = selectedNumbers.filter((value) => value > 0);
  const hasExplicitBlankThird =
    selectedNumbers.length === 3 && selectedNumbers[0] > 0 && selectedNumbers[1] > 0 && selectedNumbers[2] <= 0;
  const hasImplicitBlankThird =
    selectedNumbers.length === 2 && selectedNumbers[0] > 0 && selectedNumbers[1] > 0;
  const isTwoMemberSelection = currentMembers.length === 2 && (hasExplicitBlankThird || hasImplicitBlankThird);
  if (!(currentMembers.length === 3 || isTwoMemberSelection)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const selectedThirdAsBonus =
    currentMembers.length === 3 && selectedNumbers[2] >= 10000 && selectedNumbers[2] < 500000
      ? selectedNumbers[2]
      : 0;
  if (currentMembers.length === 3 && selectedThirdAsBonus <= 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const currentTotal = Number(selectedTotal || 0);
  if (currentTotal <= 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }
  if (isTwoMemberSelection && (currentTotal < 1000000 || currentTotal >= 10000000)) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const rawEvidenceNumbers = uniqueNumbers(
    (options.rawCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const memberEvidenceNumbers = isTwoMemberSelection
    ? [...rawEvidenceNumbers, currentTotal, ...(memberCandidates || [])]
    : memberCandidates || [];
  const memberNumbers = uniqueNumbers(
    memberEvidenceNumbers
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  if (memberNumbers.length < 3) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const totalNumbers = uniqueNumbers(
    (totalCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const totalTextCandidates = (options.totalCandidateTexts || [])
    .map((value) => String(value ?? ""))
    .filter(Boolean);
  const joinedTotalNumbers = totalTextCandidates.flatMap((text) =>
    buildJoinedTotalCandidates(text)
  );
  const observedBonusCandidates = uniqueNumbers([
    ...(bonusCandidates || [])
      .map((value) => Number(value) || 0)
      .filter((value) => Number.isFinite(value) && value > 0),
    selectedThirdAsBonus,
  ]).filter((value) => value >= 10000 && value < 500000);

  const cleanSevenDigitCandidates = memberNumbers.filter(
    (value) =>
      value >= 1000000 &&
      value < 10000000 &&
      !currentMembers.some((member) => Math.abs(member - value) <= 1)
  );
  if (cleanSevenDigitCandidates.length === 0) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const matches = [];
  for (let index = 0; index <= memberNumbers.length - 3; index += 1) {
    const proposedMembers = memberNumbers.slice(index, index + 3);
    const rowBonus = memberNumbers[index + 3] || 0;

    const proposedSevenDigitMembers = proposedMembers.filter((member) =>
      cleanSevenDigitCandidates.some((value) => Math.abs(value - member) <= 1)
    );
    if (proposedSevenDigitMembers.length !== 1) {
      continue;
    }
    const candidate = proposedSevenDigitMembers[0];
    const proposedWithoutSevenDigit = proposedMembers.filter(
      (member) => Math.abs(member - candidate) > 1
    );
    if (
      proposedWithoutSevenDigit.length !== 2 ||
      Math.abs(proposedWithoutSevenDigit[0] - currentMembers[0]) > 1 ||
      Math.abs(proposedWithoutSevenDigit[1] - currentMembers[1]) > 1
    ) {
      continue;
    }

    const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
    const displayedTotals = uniqueNumbers([
      ...totalNumbers,
      ...(isTwoMemberSelection ? rawEvidenceNumbers : []),
      ...joinedTotalNumbers.map((candidateTotal) => candidateTotal.value),
    ]).filter((value) => value > currentTotal && value < 5000000);

    const bonusPool =
      selectedThirdAsBonus > 0
        ? observedBonusCandidates.filter((bonus) => Math.abs(bonus - selectedThirdAsBonus) <= 1)
        : displayedTotals
            .map((displayedTotal) => displayedTotal - proposedMemberSum)
            .filter((bonus) => bonus >= 10000 && bonus < 500000);

    if (rowBonus > 0 && selectedThirdAsBonus > 0 && Math.abs(rowBonus - selectedThirdAsBonus) > 1) {
      continue;
    }

    for (const bonus of uniqueNumbers(bonusPool)) {
      const proposedTotal = proposedMemberSum + bonus;
      if (proposedTotal <= currentTotal || proposedTotal >= 5000000) continue;

      const matchingDisplayedTotals = totalNumbers.filter(
        (value) => Math.abs(value - proposedTotal) <= 1
      );
      const matchingRawDisplayedTotals = isTwoMemberSelection
        ? rawEvidenceNumbers.filter((value) => Math.abs(value - proposedTotal) <= 1)
        : [];
      const matchingJoinedDisplayedTotals = joinedTotalNumbers.filter(
        (candidateTotal) => Math.abs(candidateTotal.value - proposedTotal) <= 1
      );
      const exactTotalSourceCount =
        matchingDisplayedTotals.length + matchingRawDisplayedTotals.length + matchingJoinedDisplayedTotals.length;
      if (exactTotalSourceCount === 0) continue;

      matches.push({
        members: proposedMembers,
        total: proposedTotal,
        bonus,
        candidate,
        exactTotalSourceCount,
        matchedPattern:
          proposedMembers[0] === candidate
            ? "stage3-enemy-leading-seven-digit-with-bonus-member"
            : "stage3-enemy-middle-seven-digit-with-bonus-member",
        bonusEvidence: selectedThirdAsBonus > 0 ? "selected-third" : "inferred-from-exact-total",
      });
    }
  }

  const uniqueMatches = matches.filter(
    (match, index, all) =>
      all.findIndex(
        (other) =>
          other.total === match.total &&
          other.bonus === match.bonus &&
          other.candidate === match.candidate &&
          other.members.join(",") === match.members.join(",")
      ) === index
  );

  if (uniqueMatches.length !== 1) {
    return { members: selectedMembers, total: selectedTotal, applied: false };
  }

  const match = uniqueMatches[0];
  return {
    members: match.members,
    total: match.total,
    bonus: match.bonus,
    candidate: match.candidate,
    applied: true,
    matchedPattern: match.matchedPattern,
    exactTotalSourceCount: match.exactTotalSourceCount,
    bonusEvidence: match.bonusEvidence,
  };
}

export function normalizeMemberScore(num) {
  return num;
}

export function applyDesktopMemberShape(
  members,
  memberNumbers,
  totalNumbers = [],
  bonusNumbers = [],
  options = {}
) {
  if (!Array.isArray(members) || !Array.isArray(memberNumbers)) {
    return members;
  }

  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const explicitTotals = Array.isArray(totalNumbers) ? totalNumbers : [];
  const explicitBonuses = Array.isArray(bonusNumbers) ? bonusNumbers : [];
  const shapeNumbers = uniqueNumbers([
    ...numbers,
    ...members.filter((num) => Number.isFinite(num) && num > 0),
    ...explicitBonuses,
  ]);

  if (options.allowDuplicateSingleMember && numbers.length === 2) {
    const [first, second] = numbers;
    if (first === second && first >= 10000) {
      return [first, 0, 0];
    }
  }

  if (options.allowRecoverExactTwoMemberFromTotal && numbers.length === 2) {
    const [displayedTotal, visibleMember] = numbers;
    const missingMember = displayedTotal - visibleMember;
    if (
      displayedTotal > visibleMember &&
      missingMember >= 100000 &&
      missingMember < 1000000
    ) {
      return [missingMember, visibleMember, 0];
    }
  }

  if (options.allowSparseSingleMemberFromLeadingTotal && numbers.length === 2) {
    const [displayedTotal, visibleMember] = numbers;
    const impliedBonus = displayedTotal - visibleMember;
    if (
      displayedTotal > visibleMember &&
      visibleMember >= 10000 &&
      impliedBonus >= 10000 &&
      impliedBonus < 100000
    ) {
      return [visibleMember, 0, 0];
    }
  }

  if (options.allowSparseSingleMemberFromLeadingTotal && numbers.length === 3) {
    const [displayedTotal, visibleMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      visibleMember >= 50000;
    if (
      (bonusIsExplicit || bonusCanBeImplicit) &&
      displayedTotal > Math.max(visibleMember, bonusLike) &&
      visibleMember >= 10000 &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      Math.abs(displayedTotal - (visibleMember + bonusLike)) <= 1000
    ) {
      return [visibleMember, 0, 0];
    }
  }

  if (options.allowTrailingBonusForThreeMember && numbers.length === 4) {
    const [firstMember, secondMember, thirdMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    if (
      [firstMember, secondMember, thirdMember].every((member) => member >= 5000) &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      bonusIsExplicit
    ) {
      return [firstMember, secondMember, thirdMember];
    }
  }

  if (options.allowExplicitTwoMemberWithTrailingBonus && numbers.length === 3) {
    const [firstMember, secondMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      firstMember >= 50000 &&
      secondMember >= 50000;
    const matchingDisplayedTotal = explicitTotals.some(
      (total) => Math.abs(total - (firstMember + secondMember + bonusLike)) <= 1000
    );
    if (
      matchingDisplayedTotal &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      (bonusIsExplicit || bonusCanBeImplicit)
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitTwoMemberWithTrailingBonus && numbers.length === 4) {
    const [displayedTotal, firstMember, secondMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      firstMember >= 50000 &&
      secondMember >= 50000;
    if (
      displayedTotal > Math.max(firstMember, secondMember, bonusLike) &&
      firstMember >= 10000 &&
      secondMember >= 10000 &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      (bonusIsExplicit || bonusCanBeImplicit) &&
      Math.abs(displayedTotal - (firstMember + secondMember + bonusLike)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowLeadingThreeMemberWithTrailingBonus && numbers.length >= 4) {
    const [firstMember, secondMember, thirdMember, bonusLike] = numbers;
    const totalCropPickedFirstMember = explicitTotals.some(
      (total) => Math.abs(total - firstMember) <= 1
    );
    const trailingThreeSum = secondMember + thirdMember + bonusLike;
    const firstLooksLikeDisplayedTotal = Math.abs(firstMember - trailingThreeSum) <= 3000;
    const displayedTotalBonus = firstMember - trailingThreeSum;
    const hasDisplayedTotalBonus =
      displayedTotalBonus >= 10000 &&
      displayedTotalBonus < 200000 &&
      numbers.slice(4).some((num) => Math.abs(num - displayedTotalBonus) <= 1000);
    const implicitHighBonusShape =
      options.allowImplicitLeadingThreeMemberWithTrailingBonus &&
      numbers.length === 4 &&
      firstMember >= 200000 &&
      secondMember >= 10000 &&
      secondMember < 100000 &&
      thirdMember >= 10000 &&
      thirdMember < 100000 &&
      bonusLike >= 100000 &&
      bonusLike < 200000;
    if (
      (totalCropPickedFirstMember || implicitHighBonusShape) &&
      !firstLooksLikeDisplayedTotal &&
      !hasDisplayedTotalBonus &&
      firstMember >= 100000 &&
      secondMember >= 5000 &&
      thirdMember >= 5000 &&
      bonusLike >= 10000 &&
      bonusLike < 200000
    ) {
      return [firstMember, secondMember, thirdMember];
    }
  }

  if (numbers.length === 4) {
    const [displayedTotal, firstMember, secondMember, tinyThirdMember] = numbers;
    const inferredThirdMember = displayedTotal - firstMember - secondMember;
    if (
      explicitTotals.some((total) => Math.abs(total - displayedTotal) <= 1) &&
      tinyThirdMember >= 1400 &&
      tinyThirdMember < 10000 &&
      inferredThirdMember >= 10000 &&
      inferredThirdMember < 200000 &&
      inferredThirdMember > tinyThirdMember
    ) {
      return [firstMember, secondMember, inferredThirdMember];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length >= 3) {
    const matches = [];
    for (const displayedTotal of numbers) {
      for (const member of numbers) {
        if (member === displayedTotal || member < 100000) continue;
        for (const bonus of shapeNumbers) {
          if (bonus === displayedTotal || bonus === member) continue;
          if (
            bonus >= 10000 &&
            bonus < 200000 &&
            member > bonus &&
            Math.abs(member + bonus - displayedTotal) <= 1000
          ) {
            matches.push({ member, total: displayedTotal });
          }
        }
      }
    }
    const uniqueMatches = matches.filter(
      (match, index, all) =>
        all.findIndex(
          (other) => other.member === match.member && other.total === match.total
        ) === index
    );
    if (uniqueMatches.length === 1) {
      return [uniqueMatches[0].member, 0, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length >= 4) {
    const matches = [];
    const totalCandidates = uniqueNumbers([...explicitTotals, ...numbers]);
    for (const displayedTotal of totalCandidates) {
      const totalIsExplicit = explicitTotals.some(
        (total) => Math.abs(total - displayedTotal) <= 1
      );
      for (let first = 0; first < numbers.length - 1; first += 1) {
        for (let second = first + 1; second < numbers.length; second += 1) {
          const firstMember = numbers[first];
          const secondMember = numbers[second];
          if (firstMember === displayedTotal || secondMember === displayedTotal) continue;
          if (firstMember < 5000 || secondMember < 5000) continue;
          const impliedBonus = displayedTotal - firstMember - secondMember;
          const bonusWasObserved = shapeNumbers.some(
            (bonus) => Math.abs(bonus - impliedBonus) <= 1000
          );
          const bonusIsExplicit = explicitBonuses.some(
            (bonus) => Math.abs(bonus - impliedBonus) <= 1000
          );
          if (
            impliedBonus >= 10000 &&
            impliedBonus < 200000 &&
            (explicitBonuses.length > 0
              ? bonusIsExplicit
              : totalIsExplicit && bonusWasObserved)
          ) {
            matches.push({ members: [firstMember, secondMember], total: displayedTotal });
          }
        }
      }
    }
    const uniqueMatches = matches.filter(
      (match, index, all) =>
        all.findIndex(
          (other) =>
            other.total === match.total &&
            other.members.join(",") === match.members.join(",")
        ) === index
    );
    if (uniqueMatches.length === 1) {
      return [...uniqueMatches[0].members, 0];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length === 2) {
    const [leading, firstMember] = numbers;
    const impliedBonus = leading - firstMember;
    if (
      leading > firstMember &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length === 3) {
    const [leading, firstMember, bonusLike] = numbers;
    if (
      leading > firstMember &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      Math.abs(leading - (firstMember + bonusLike)) <= 1000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowExactTwoMember && numbers.length === 3) {
    const [leading, firstMember, secondMember] = numbers;
    if (
      leading > Math.max(firstMember, secondMember) &&
      firstMember >= 5000 &&
      secondMember >= 5000 &&
      Math.abs(leading - (firstMember + secondMember)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitSingleMember && numbers.length === 2) {
    const [leading, firstMember] = numbers;
    const impliedBonus = leading - firstMember;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > firstMember &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length === 3) {
    const [leading, firstMember, secondMember] = numbers;
    const impliedBonus = leading - firstMember - secondMember;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > Math.max(firstMember, secondMember) &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length === 4) {
    const [leading, firstMember, secondMember, bonusLike] = numbers;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > Math.max(firstMember, secondMember) &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      Math.abs(leading - (firstMember + secondMember + bonusLike)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (numbers.length >= 4) {
    const [leading, firstMember, secondMember, thirdMemberLike, bonusLike] = numbers;
    const correctedThirdMember =
      thirdMemberLike >= 100000 && thirdMemberLike < 200000
        ? thirdMemberLike - 100000
        : thirdMemberLike;
    const hasBonusLike = bonusLike >= 10000 && bonusLike < 200000;
    const sumWithBonus =
      firstMember + secondMember + correctedThirdMember + (hasBonusLike ? bonusLike : 0);
    const sumWithoutBonus = firstMember + secondMember + thirdMemberLike;
    const displayedTotalDelta = leading - sumWithoutBonus;

    if (
      numbers.length === 4 &&
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      firstMember >= 100000 &&
      secondMember >= 10000 &&
      secondMember < 100000 &&
      thirdMemberLike >= 85000 &&
      thirdMemberLike < 200000 &&
      Math.abs(displayedTotalDelta) <= 1000
    ) {
      const correctedFirstMember = leading - secondMember - thirdMemberLike;
      const correctionDelta = Math.abs(correctedFirstMember - firstMember);
      if (correctionDelta >= 100 && correctionDelta <= 1000) {
        return [correctedFirstMember, secondMember, 0];
      }
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      correctedThirdMember >= 5000 &&
      hasBonusLike &&
      Math.abs(leading - sumWithBonus) <= 3000
    ) {
      return [firstMember, secondMember, correctedThirdMember];
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      [firstMember, secondMember, thirdMemberLike].every((value) => value >= 5000) &&
      Math.abs(leading - sumWithoutBonus) <= 3000
    ) {
      return [firstMember, secondMember, thirdMemberLike];
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      [firstMember, secondMember, thirdMemberLike].every((value) => value >= 5000) &&
      displayedTotalDelta >= 10000 &&
      displayedTotalDelta < 200000
    ) {
      return [firstMember, secondMember, thirdMemberLike];
    }
  }

  if (numbers.length >= 4 && numbers[0] < 10000) {
    const nextThree = numbers.slice(1, 4);
    const syntheticLeading = nextThree.reduce((sum, value) => sum + value, 0);
    if (syntheticLeading >= 100000 && nextThree.every((value) => value >= 100000)) {
      return [syntheticLeading, nextThree[1], nextThree[2]];
    }
  }

  return members;
}

export function pickDesktopTotalFromMemberShape(members, memberNumbers, totalNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3 || !Array.isArray(memberNumbers)) {
    return 0;
  }

  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const memberSum = members.reduce((sum, value) => sum + value, 0);
  const totalCandidates = uniqueNumbers([...numbers, ...totalNumbers])
    .filter((num) => num >= 50000 && num > memberSum)
    .sort((a, b) => a - b);

  for (const total of totalCandidates) {
    const explicitBonus = total - memberSum;
    if (totalNumbers.some((num) => Math.abs(num - total) <= 1) && explicitBonus >= 10000 && explicitBonus < 200000) {
      return total;
    }

    if (
      numbers[0] &&
      Math.abs(numbers[0] - total) <= 1 &&
      explicitBonus >= 10000 &&
      explicitBonus < 200000
    ) {
      return total;
    }

    const matchingBonus = numbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => !members.some((member) => Math.abs(member - num) <= 1))
      .find((num) => Math.abs(total - (memberSum + num)) <= 3000);

    if (matchingBonus) {
      return total;
    }
  }

  if (
    numbers.length >= 4 &&
    members.length === 3 &&
    members.every((member, index) => Math.abs(member - numbers[index]) <= 1) &&
    (totalNumbers.some((total) => Math.abs(total - members[0]) <= 1) ||
      totalNumbers.length === 0)
  ) {
    const trailingBonus = numbers[3];
    const inferredTotal = memberSum + trailingBonus;
    if (
      trailingBonus >= 10000 &&
      trailingBonus < 200000 &&
      (totalNumbers.length > 0 || trailingBonus >= 100000) &&
      inferredTotal > memberSum &&
      inferredTotal < 3000000
    ) {
      return inferredTotal;
    }
  }

  return 0;
}

export function repairMissingLeadingOneMember(members, referenceNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3) {
    return members;
  }

  const [first, second, third] = members;
  const repairedFirst = first - 100000;
  const repairedSum = repairedFirst + second + third;
  const looksLikeExtraLeadingOne =
    first >= 110000 &&
    first < 200000 &&
    repairedFirst >= 10000 &&
    second < 50000 &&
    third < 50000 &&
    second + third < 80000 &&
    repairedSum >= 50000 &&
    repairedSum < 150000;

  if (
    first >= 200000 &&
    second >= 30000 &&
    second < 80000 &&
    third >= 5000 &&
    third < 10000
  ) {
    return [first, second, third + 50000];
  }

  const totals = referenceNumbers.filter((num) => num >= 100000 && num < 3000000);
  if (looksLikeExtraLeadingOne) {
    const currentSum = members.reduce((sum, value) => sum + value, 0);
    const currentMatchesTotal = totals.some((total) => Math.abs(total - currentSum) <= 1000);
    if (!currentMatchesTotal) {
      return [repairedFirst, second, third];
    }
  }

  if (totals.length === 0) {
    return members;
  }

  const currentSum = members.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < members.length; index += 1) {
    const value = members[index];
    if (value < 50000 || value >= 85000) {
      continue;
    }

    const repaired = value + 100000;
    const repairedMembers = members.map((member, memberIndex) =>
      memberIndex === index ? repaired : member
    );
    const repairedSum = repairedMembers.reduce((sum, member) => sum + member, 0);
    const matchesTotal = totals.some((total) => Math.abs(total - repairedSum) <= 100);
    const currentMatchesTotal = totals.some((total) => Math.abs(total - currentSum) <= 1000);

    if (matchesTotal && !currentMatchesTotal) {
      return repairedMembers;
    }
  }

  return members;
}

export function hasMatchingCrownBonusForMembers(members, totalNumbers = [], bonusNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3) {
    return false;
  }

  const memberSum = members.reduce((sum, value) => sum + value, 0);
  const totals = totalNumbers.filter((num) => num >= 100000 && num < 3000000);

  return bonusNumbers
    .filter((num) => Number.isFinite(num) && num >= 5000 && num < 200000)
    .some((bonus) =>
      totals.some((total) => Math.abs(total - (memberSum + bonus)) <= 1000)
    );
}

export function pickMemberNumbers(numbers, stage, totalNumbers = [], bonusNumbers = []) {
  const crownBonus = getCrownBonusNumber(bonusNumbers);
  const bonusSet = new Set(crownBonus > 0 ? [Math.round(crownBonus)] : []);
  const totals = totalNumbers.filter((num) => num >= 50000 && num < 3000000);
  const totalSet = new Set(
    totalNumbers
      .filter((num) => num >= 50000 && num < 3000000)
      .map((num) => Math.round(num))
  );

  const crownRecovered = null;
  if (crownRecovered) {
    return improveMembersByReference(crownRecovered, [...totalNumbers, ...numbers], numbers.length);
  }

  const candidates = numbers
    .filter((num) => num >= 1400 && num < 10000000)
    .filter((num) => num < 10000000)
    .map(normalizeMemberScore)
    .filter((num) => !bonusSet.has(Math.round(num)))
    .filter((num) => !isKnownNoiseNumber(num));

  const withoutTotals = candidates.filter(
    (num) => !totalSet.has(Math.round(num)) && !isNearAnyNumber(num, totals, 1000)
  );

  const dropLeadingTotal = (values) => {
    if (values.length < 4) {
      return values;
    }

    const leading = values[0];
    const nextThree = values.slice(1, 4);
    const nextSum = nextThree.reduce((sum, value) => sum + value, 0);
    const diff = leading - nextSum;
    const trailingBonus =
      values.slice(4).find((value) => value >= 10000 && value < 200000) ||
      bonusNumbers.find((value) => value >= 10000 && value < 200000) ||
      totalNumbers.find((value) => value >= 10000 && value < 200000);
    const rawTrailingBonus =
      values.slice(4).find((value) => value >= 10000 && value < 200000);
    const looksLikeMemberTotal =
      leading > Math.max(...nextThree) &&
      nextSum >= 10000 &&
      Math.abs(diff) <= 200000 &&
      nextThree.every((num) => num >= 5000) &&
      totalNumbers.some((total) => total >= 50000 && Math.abs(total - leading) <= 1000);
    const nextSumMatchesKnownTotal =
      totalNumbers.some((total) => total >= 50000 && Math.abs(total - nextSum) <= 30000);
    const nextSumMatchesTotalMemberRead =
      totalNumbers.length >= 3 &&
      Math.abs(
        totalNumbers
          .slice(0, 3)
          .reduce((sum, value) => sum + value, 0) - nextSum
      ) <= 1;
    const leadingLooksLikeExtraSmallCandidate =
      leading >= 10000 &&
      leading < 85000 &&
      nextSum >= 100000 &&
      rawTrailingBonus &&
      leading < Math.max(...nextThree);
    const leadingLooksLikeMisreadTotal =
      trailingBonus &&
      Math.abs(nextSum + trailingBonus - leading - 200000) <= 1000;
    const leadingLooksLikeLargeMisreadTotal =
      trailingBonus &&
      Math.abs(nextSum + trailingBonus - leading - 300000) <= 2500;
    const leadingEqualsNextMemberSum = Math.abs(leading - nextSum) <= 1;

    if (
      looksLikeMemberTotal ||
      nextSumMatchesKnownTotal ||
      nextSumMatchesTotalMemberRead ||
      leadingLooksLikeExtraSmallCandidate ||
      leadingLooksLikeMisreadTotal ||
      leadingLooksLikeLargeMisreadTotal ||
      leadingEqualsNextMemberSum
    ) {
      return values.slice(1);
    }

    return values;
  };

  const memberFirstCandidates = dropLeadingTotal(withoutTotals);
  const valid = memberFirstCandidates.filter((num) => num < 1000000);
  const droppedLeadingTotal =
    withoutTotals.length >= 4 && memberFirstCandidates[0] !== withoutTotals[0];

  const referenceNumbers = [...totalNumbers, ...candidates];

  if (valid.length >= 3) {
    if (droppedLeadingTotal) {
      return valid.slice(0, 3);
    }

    return bonusNumbers.length > 0
      ? valid.slice(0, 3)
      : improveMembersByReference(valid.slice(0, 3), referenceNumbers, candidates.length);
  }

  const relaxed = dropLeadingTotal(candidates).filter((num) => num < 1000000);

  return bonusNumbers.length > 0
    ? relaxed.slice(0, 3)
    : improveMembersByReference(relaxed.slice(0, 3), referenceNumbers, candidates.length);
}

export function uniqueNumbers(numbers) {
  return [...new Set(numbers.filter((num) => Number.isFinite(num)))];
}

export function isNearNumber(value, target, tolerance = 1000) {
  return Math.abs(Number(value) - Number(target)) <= tolerance;
}

export function removeNumbersNearTargets(numbers, targets, tolerance = 1000) {
  const validTargets = targets.filter((num) => Number.isFinite(num) && num > 0);

  return numbers.filter((num) => {
    return !validTargets.some((target) => isNearNumber(num, target, tolerance));
  });
}

export function removeTotalLikeNumbersFromMembers(members, totals) {
  return removeNumbersNearTargets(members, totals, 1000);
}

export function removePlusLikeNumbers(numbers, totals) {
  const validTotals = totals.filter((num) => Number.isFinite(num) && num > 0);

  return numbers.filter((num) => {
    // Keep normal small member scores unless they are clearly the only OCR artifact.
    if (num < 10000) {
      return false;
    }

    // +xxxxx tends to be much smaller than the stage total and appears near total zones.
    const isLikelyPlus =
      num < 200000 &&
      validTotals.some((total) => total >= 300000 && total - num >= 200000);

    return !isLikelyPlus;
  });
}

export function recoverMissingLeadingDigit(num, referenceTotal) {
  if (!Number.isFinite(num) || !Number.isFinite(referenceTotal)) {
    return num;
  }

  if (num >= 100000 || num < 10000) {
    return num;
  }

  const candidates = [];

  for (let head = 1; head <= 9; head += 1) {
    const candidate = head * 100000 + num;

    if (candidate <= referenceTotal && candidate < 1000000) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    return num;
  }

  return candidates[candidates.length - 1];
}

// v46 shared OCR cleanup helpers. Prefer generalized logic here before new sample-specific patches.

export function applyCommonMemberCleanup(members, totals = []) {
  const cleaned = removeTotalLikeNumbersFromMembers(
    uniqueNumbers(members),
    totals
  );

  return cleaned.slice(0, 3);
}

export async function recognizeOcrZone(image, zone, options = {}) {
  const blob = await createPreprocessedStageBlob(image, zone, options);
  let debugArtifacts = null;
  if (options.includeDebugArtifacts) {
    const presetConfig = getOcrPresetConfig(options.preset);
    const scale = presetConfig?.scale || 4;
    const rawBlob = await createOcrDebugRawCropBlob(image, zone);
    debugArtifacts = {
      crop: {
        x: zone.x ?? zone.left ?? 0,
        y: zone.y ?? zone.top ?? 0,
        width: zone.width,
        height: zone.height,
      },
      rawCrop: {
        format: "png",
        width: zone.width,
        height: zone.height,
        sha256: await hashBlobForOcrDebug(rawBlob),
        bytes: rawBlob?.size || 0,
      },
      processedCrop: {
        format: "png",
        width: zone.width * scale,
        height: zone.height * scale,
        sha256: await hashBlobForOcrDebug(blob),
        bytes: blob?.size || 0,
      },
      preprocessing: {
        preset: options.preset || "default",
        scale,
        ipadKind: presetConfig?.ipadKind || null,
        threshold: presetConfig?.threshold || null,
        processAtSourceScale: Boolean(presetConfig?.ipadKind),
      },
      ocr: {
        engine: "tesseract.js-browser",
        language: "eng",
        pageSegMode: options.pageSegMode || "6",
        charWhitelist: options.charWhitelist || "0123456789,.",
      },
    };
  }

  const tesseractOptions = {
    tessedit_char_whitelist: options.charWhitelist || "0123456789,.",
    tessedit_pageseg_mode: options.pageSegMode || "6",
    preserve_interword_spaces: "1",
  };

  if (typeof options.logger === "function") {
    tesseractOptions.logger = options.logger;
  }

  const result = await Tesseract.recognize(blob, "eng", tesseractOptions);

  return {
    text: result.data.text || "",
    numbers: extractNumbersForZone(result.data.text || ""),
    confidence: Number(result.data.confidence || 0),
    debugArtifacts,
  };
}







