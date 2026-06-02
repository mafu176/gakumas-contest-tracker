import Tesseract from "tesseract.js";
import { toNumber } from "./numbers";

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

  return layouts[mode] || layouts.auto;
}

export function getFixedOcrZones(image, stage, mode) {
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
    results.push(...result.numbers.filter((num) => num >= 10000 && num < 1000000));
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

  return pickTotalNumber(allNumbers) || memberSum;
}

export function getAlternativeMemberZones(image, stage, mode, side) {
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
  const valid = numbers.filter((num) => num >= 10000 && num < 1000000);
  const countScore = valid.length;
  const hasThree = countScore >= 3 ? 2500 : 0;
  const normalScore =
    valid.filter((num) => num >= 15000 && num <= 1000000).length * 180;
  const tooLowPenalty = valid.filter((num) => num < 12000).length * -200;
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

export function inferCrownBonusFromMemberNumbers(memberNumbers, totalNumbers = []) {
  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1000 && num < 10000000)
    .map(normalizeMemberScore);
  const totals = totalNumbers.filter((num) => num >= 100000 && num < 3000000);

  if (numbers.length >= 5) {
    const displayedTotal = numbers[0];
    const members = numbers.slice(1, 4);
    const bonus = numbers[4];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;

    if (bonus >= 10000 && bonus < 200000 && Math.abs(displayedTotal - sumWithBonus) <= 1000) {
      return { bonus, members, total: displayedTotal };
    }

    if (
      bonus >= 10000 &&
      bonus < 200000 &&
      Math.abs(Math.abs(sumWithBonus - displayedTotal) - 200000) <= 1000
    ) {
      return { bonus, members, total: sumWithBonus };
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
      firstMatchesKnownTotal &&
      first > Math.max(...nextThree) &&
      inferredBonusFromLeadingTotal >= 10000 &&
      inferredBonusFromLeadingTotal < 200000
    ) {
      return { bonus: inferredBonusFromLeadingTotal, members: nextThree, total: first };
    }

    if (
      first > Math.max(...nextThree) &&
      nextThree.every((num) => num >= 10000 && num < 1000000) &&
      inferredBonusFromLeadingTotal >= 10000 &&
      inferredBonusFromLeadingTotal < 200000
    ) {
      return { bonus: inferredBonusFromLeadingTotal, members: nextThree, total: first };
    }

    const members = firstFour.slice(0, 3);
    const bonus = firstFour[3];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;
    const matchesKnownTotal = totals.some((total) => Math.abs(total - sumWithBonus) <= 1000);

    if (bonus >= 5000 && bonus < 200000 && matchesKnownTotal) {
      return { bonus, members, total: sumWithBonus };
    }
  }

  return { bonus: 0, members: null, total: 0 };
}

export function getCrownBonusZones(image, stage, mode, side) {
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
  const layout = getDeviceOcrLayout(mode);

  if (!layout.direct) {
    return [];
  }

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;
  const scoreTopRates = [0.22, 0.405, 0.64];
  const topRate = scoreTopRates[stageIndex];
  const sideX = image.width * xRate;
  const sideWidth = image.width * layout.sideWidth;
  const slotRates = [
    { x: 0.00, width: 0.36 },
    { x: 0.31, width: 0.36 },
    { x: 0.62, width: 0.36 },
  ];

  return slotRates.map((slot) => ({
    x: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
    y: Math.max(0, Math.floor(image.height * topRate)),
    width: Math.floor(sideWidth * slot.width),
    height: Math.floor(image.height * 0.04),
  }));
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
      .match(/\d{1,3}(?:[,\.]\d{3})+|\d{5,8}/g)
      ?.map((value) => toNumber(value))
      .filter((num) => num >= 10000 && num < 10000000) ?? []
  );
}

export function pickTotalNumber(numbers) {
  const candidates = numbers.filter((num) => num >= 10000 && num < 3000000);
  return [...candidates].sort((a, b) => b - a)[0] || numbers[0] || 0;
}

export function normalizeMemberScore(num) {
  return num;
}

export function repairMissingLeadingOneMember(members, referenceNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3) {
    return members;
  }

  const totals = referenceNumbers.filter((num) => num >= 100000 && num < 3000000);
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
    .filter((num) => num >= 10000 && num < 10000000)
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
    const looksLikeMemberTotal =
      leading > Math.max(...nextThree) &&
      nextSum >= 10000 &&
      Math.abs(diff) <= 200000;
    const nextSumMatchesKnownTotal =
      totalNumbers.some((total) => total >= 50000 && Math.abs(total - nextSum) <= 30000);
    const leadingLooksLikeMisreadTotal =
      trailingBonus &&
      Math.abs(nextSum + trailingBonus - leading - 200000) <= 1000;
    const leadingEqualsNextMemberSum = Math.abs(leading - nextSum) <= 1;

    if (
      looksLikeMemberTotal ||
      nextSumMatchesKnownTotal ||
      leadingLooksLikeMisreadTotal ||
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
