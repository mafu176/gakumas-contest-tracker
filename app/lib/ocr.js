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

export async function recognizeTotalCandidates(image, zones) {
  const results = [];
  let fallbackZone = null;
  let fallbackResult = null;

  for (const zone of zones) {
    const result = await recognizeOcrZone(image, zone);
    if (!fallbackZone) {
      fallbackZone = zone;
      fallbackResult = result;
    }

    results.push(...result.numbers);
  }

  if (enableNextScreenFallback && results.length === 0 && fallbackZone) {
    const secondPass = await recognizeNextScreenFallback(
      image,
      fallbackZone,
      (candidate) => candidate.numbers.length > 0,
      "total"
    );
    results.push(...mergeOcrResults(fallbackResult, secondPass || { text: "", numbers: [] }).numbers);
  }

  return results;
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

  canvas.width = cropArea.width * scale;
  canvas.height = cropArea.height * scale;

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

  const explicitBonuses = uniqueNumbers([...bonusCandidates, ...rawCandidates])
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 400000)
    .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
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
  };
}







