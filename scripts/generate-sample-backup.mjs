import fs from "node:fs";
import path from "node:path";
import { idolDb } from "../app/idols.js";

const outputPath = path.join(
  "sample-data",
  "gakumas_backup_complete_sample_16days_80matches.json"
);

const stages = [1, 2, 3];
const members = [1, 2, 3];
const stageTypes = {
  1: "センス",
  2: "ロジック",
  3: "アノマリー",
};

const slotNames = stages.flatMap((stage) =>
  members.map((member) => `自分 ステージ${stage} メンバー${member}`)
);

const idolById = new Map(idolDb.map((idol) => [idol.id, idol]));

function idol(id) {
  const found = idolById.get(id);
  if (!found) {
    throw new Error(`unknown idol id: ${id}`);
  }
  return {
    id: found.id,
    idol_db_id: found.idol_db_id || found.id,
    name: found.name,
    displayName: found.displayName || found.name,
    short: found.short || found.name,
    character: found.character || "",
    title: found.title || "",
    variant: found.title || found.short || "",
    plan: found.plan,
    rarity: found.rarity || "",
    image: found.image,
  };
}

const idols = {
  garakutaHiro: idol("篠澤_広_ガラクタロード"),

  senseSaki: idol("花海_咲季_Fighting_My_Way"),
  senseTemari: idol("月村_手毬_Luna_say_maybe"),
  senseMao: idol("有村_麻央_Fluorite"),
  senseKotone: idol("藤田_ことね_Yellow_Big_Bang"),
  senseLilja: idol("葛城_リーリヤ_冠菊"),
  senseMisuzu: idol("秦谷_美鈴_Star_mine"),
  senseRinami: idol("姫崎_莉波_clumsy_trick"),

  logicKotone: idol("藤田_ことね_世界一可愛い私"),
  logicLilja: idol("葛城_リーリヤ_白線"),
  logicChina: idol("倉本_千奈_Wonder_Scale"),
  logicHiro: idol("篠澤_広_光景"),
  logicSena: idol("十王_星南_ハッピーミルフィーユ"),
  logicSaki: idol("花海_咲季_Boom_Boom_Pow"),

  anomalyMao: idol("有村_麻央_Campus_mode"),
  anomalyMaoSnow: idol("有村_麻央_雪解けに"),
  anomalyLilja: idol("葛城_リーリヤ_極光"),
  anomalyHiro: idol("篠澤_広_ハッピーミルフィーユ"),
  anomalyRinami: idol("姫崎_莉波_Campus_mode"),
  anomalyUme: idol("花海_佑芽_Campus_mode"),
};

const formations = {
  front: {
    1: [idols.senseSaki, idols.senseTemari, idols.senseMao],
    2: [idols.logicKotone, idols.logicLilja, idols.logicChina],
    3: [idols.anomalyMao, idols.anomalyLilja, idols.anomalyRinami],
  },
  back: {
    1: [idols.garakutaHiro, idols.senseKotone, idols.senseMisuzu],
    2: [idols.logicHiro, idols.logicSena, idols.logicChina],
    3: [idols.anomalyMaoSnow, idols.anomalyHiro, idols.anomalyUme],
  },
};

const enemyFormations = {
  front: {
    1: [idols.senseLilja, idols.senseKotone, idols.senseRinami],
    2: [idols.logicSaki, idols.logicSena, idols.logicHiro],
    3: [idols.anomalyHiro, idols.anomalyMaoSnow, idols.anomalyUme],
  },
  back: {
    1: [idols.senseSaki, idols.senseMao, idols.senseTemari],
    2: [idols.logicKotone, idols.logicLilja, idols.logicSaki],
    3: [idols.anomalyLilja, idols.anomalyMao, idols.anomalyRinami],
  },
};

const myScoreBase = {
  front: {
    1: [152000, 126000, 101000],
    2: [178000, 139000, 116000],
    3: [202000, 162000, 242000],
  },
  back: {
    1: [213000, 153000, 132000],
    2: [184000, 164000, 126000],
    3: [221000, 176000, 318000],
  },
};

const enemyScoreBase = {
  front: {
    1: [138000, 112000, 93000],
    2: [166000, 128000, 118000],
    3: [188000, 154000, 226000],
  },
  back: {
    1: [146000, 119000, 97000],
    2: [171000, 132000, 121000],
    3: [194000, 158000, 235000],
  },
};

const myRankBase = {
  front: {
    1: [1, 2, 4],
    2: [2, 1, 4],
    3: [2, 3, 1],
  },
  back: {
    1: [3, 1, 2],
    2: [2, 1, 3],
    3: [2, 3, 1],
  },
};

const enemyRankBase = {
  front: {
    1: [3, 4, 5],
    2: [3, 2, 4],
    3: [3, 4, 2],
  },
  back: {
    1: [2, 4, 5],
    2: [3, 2, 4],
    3: [3, 4, 2],
  },
};

const positions = ["上殴り", "中殴り", "下殴り"];

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function idolFields(prefix, idolData) {
  return {
    [`${prefix}_idol`]: idolData.name,
    [`${prefix}_idol_name`]: idolData.name,
    [`${prefix}_idol_variant`]: idolData.variant || idolData.title || "",
    [`${prefix}_idol_id`]: idolData.id,
    [`${prefix}_idol_db_id`]: idolData.idol_db_id || idolData.id,
    [`${prefix}_idol_image`]: idolData.image,
  };
}

function scoreFor(base, dayIndex, matchIndex, stage, member, sideOffset = 0) {
  const wave =
    ((dayIndex * 17 + matchIndex * 11 + stage * 7 + member * 5 + sideOffset) %
      29) *
    1120;
  return base + wave + dayIndex * 680 + matchIndex * 520;
}

function rankFor(base, dayIndex, matchIndex, stage, member) {
  const shift = (dayIndex + matchIndex + stage + member) % 6 === 0 ? 1 : 0;
  return Math.max(1, Math.min(6, base + shift));
}

function pointFor(position, win, stageWins) {
  const winPoints = {
    上殴り: [185, 205],
    中殴り: [132, 150],
    下殴り: [82, 96],
  };
  const losePoints = {
    上殴り: [52, 68],
    中殴り: [36, 48],
    下殴り: [24, 34],
  };
  const [low, high] = win ? winPoints[position] : losePoints[position];
  return win ? high - (3 - stageWins) * 8 : low + stageWins * 7;
}

function templateSlots(formation) {
  const slots = {};

  stages.forEach((stage) => {
    members.forEach((member) => {
      slots[`自分 ステージ${stage} メンバー${member}`] =
        formation[stage][member - 1].name;
    });
  });

  return slots;
}

function validateSamePlanFormation(formation, label) {
  stages.forEach((stage) => {
    const expectedPlan = stageTypes[stage];
    if (!Array.isArray(formation[stage]) || formation[stage].length !== 3) {
      throw new Error(`${label} stage ${stage} must contain exactly 3 idols`);
    }

    const duplicateIds = formation[stage]
      .map((idolData) => idolData.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new Error(
        `${label} stage ${stage} has duplicate idols: ${duplicateIds.join(", ")}`
      );
    }

    const invalid = formation[stage].filter(
      (idolData) => idolData.plan !== expectedPlan
    );
    if (invalid.length > 0) {
      throw new Error(
        `${label} stage ${stage} contains non-${expectedPlan} idols: ${invalid
          .map((idolData) => `${idolData.name}(${idolData.plan})`)
          .join(", ")}`
      );
    }

    formation[stage].forEach((idolData) => {
      if (idolData.id === idols.garakutaHiro.id && stageTypes[stage] !== "センス") {
        throw new Error("Garakuta Road Hiro must only be placed in a sense stage");
      }
    });
  });
}

Object.entries(formations).forEach(([key, formation]) =>
  validateSamePlanFormation(formation, `self ${key}`)
);
Object.entries(enemyFormations).forEach(([key, formation]) =>
  validateSamePlanFormation(formation, `enemy ${key}`)
);

const season = {
  id: "S_SAMPLE_COMPLETE_202605",
  name: "サンプルS：16日80戦 共有表示確認",
  startDate: "2026-05-01",
  endDate: "2026-05-16",
  finalPoint: "0",
  finalRank: "128",
  stageTypes,
  memo: "公開前確認用のサンプルデータです。前半と後半で編成が変わります。",
  createdAt: "2026-05-01T00:00:00.000Z",
};

const formationTemplates = [
  {
    id: "F_SAMPLE_COMPLETE_FRONT",
    name: "サンプル前半編成 1-8日",
    slots: templateSlots(formations.front),
    createdAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "F_SAMPLE_COMPLETE_BACK_GARAKUTA_HIRO",
    name: "サンプル後半編成 ガラクタロード広採用",
    slots: templateSlots(formations.back),
    createdAt: "2026-05-09T00:00:00.000Z",
  },
];

const records = [];
const startDate = new Date("2026-05-01T00:00:00.000Z");

for (let dayIndex = 0; dayIndex < 16; dayIndex += 1) {
  const formationKey = dayIndex < 8 ? "front" : "back";
  const formation = formations[formationKey];
  const enemyFormation = enemyFormations[formationKey];

  for (let matchIndex = 0; matchIndex < 5; matchIndex += 1) {
    const matchNumber = dayIndex * 5 + matchIndex + 1;
    const date = addDays(startDate, dayIndex);
    date.setUTCHours(matchIndex * 2, (matchIndex * 7) % 60, 0, 0);

    const position = positions[(dayIndex + matchIndex) % positions.length];
    const toughLossMatch = matchNumber % 6 === 0 || matchNumber % 17 === 0;
    const record = {
      id: `M_SAMPLE_COMPLETE_${String(matchNumber).padStart(3, "0")}`,
      date: date.toISOString(),
      opponent: `サンプル対戦相手${String(matchNumber).padStart(2, "0")}`,
      position,
      result: "勝ち",
      point: "",
    };

    let stageWins = 0;

    stages.forEach((stage) => {
      let myBaseTotal = 0;
      let enemyBaseTotal = 0;

      members.forEach((member) => {
        const myIdol = formation[stage][member - 1];
        const enemyIdol = enemyFormation[stage][member - 1];
        const myScore = scoreFor(
          myScoreBase[formationKey][stage][member - 1],
          dayIndex,
          matchIndex,
          stage,
          member
        );
        const enemyPressure = toughLossMatch && stage <= 2 ? 85000 : 0;
        const enemyScore = scoreFor(
          enemyScoreBase[formationKey][stage][member - 1],
          dayIndex,
          matchIndex,
          stage,
          member,
          13
        ) + enemyPressure;

        myBaseTotal += myScore;
        enemyBaseTotal += enemyScore;

        Object.assign(record, idolFields(`s${stage}_my${member}`, myIdol));
        Object.assign(record, idolFields(`s${stage}_enemy${member}`, enemyIdol));

        record[`s${stage}_my${member}_score`] = myScore;
        record[`s${stage}_enemy${member}_score`] = enemyScore;
        record[`s${stage}_my${member}_rank`] = rankFor(
          myRankBase[formationKey][stage][member - 1],
          dayIndex,
          matchIndex,
          stage,
          member
        );
        record[`s${stage}_enemy${member}_rank`] = rankFor(
          enemyRankBase[formationKey][stage][member - 1],
          dayIndex,
          matchIndex,
          stage,
          member
        );
      });

      const myBonus =
        stage === 3
          ? 36000 + dayIndex * 1160 + matchIndex * 640
          : stage === 2
            ? 14000 + dayIndex * 620
            : (dayIndex + matchIndex) % 5 === 0
              ? 9000
              : 0;
      const enemyBonus =
        (dayIndex + matchIndex + stage) % 4 === 0 ? 11000 + stage * 1400 : 0;

      record[`s${stage}_my_base_total`] = myBaseTotal;
      record[`s${stage}_enemy_base_total`] = enemyBaseTotal;
      record[`s${stage}_my_bonus`] = myBonus;
      record[`s${stage}_enemy_bonus`] = enemyBonus;

      if (myBaseTotal + myBonus > enemyBaseTotal + enemyBonus) {
        stageWins += 1;
      }
    });

    const win = stageWins >= 2;
    record.result = win ? "勝ち" : "負け";
    record.point = String(pointFor(position, win, stageWins));

    records.push(record);
  }
}

const totalPointGain = records.reduce(
  (sum, record) => sum + Number(record.point || 0),
  0
);
season.finalPoint = String(totalPointGain);

const analysisPresets = [
  {
    id: "A_SAMPLE_COMPLETE_DEFAULT",
    name: "サンプル分析：全期間",
    analysisSort: "averageCombined",
    analysisPosition: "全体",
    analysisDays: "",
    analysisMinCount: "",
    graphDays: "16",
    graphPosition: "全体",
    metaDays: "",
    metaPosition: "全体",
    metaMinCount: "",
    createdAt: "2026-05-16T23:00:00.000Z",
  },
  {
    id: "A_SAMPLE_COMPLETE_RECENT",
    name: "サンプル分析：後半8日",
    analysisSort: "averageBaseScore",
    analysisPosition: "全体",
    analysisDays: "8",
    analysisMinCount: "3",
    graphDays: "8",
    graphPosition: "全体",
    metaDays: "8",
    metaPosition: "全体",
    metaMinCount: "3",
    createdAt: "2026-05-16T23:05:00.000Z",
  },
];

const backup = {
  version: 2,
  exportedAt: "2026-05-31T00:00:00.000Z",
  records,
  seasons: [season],
  seasonPresets: [season],
  formationTemplates,
  customIdols: [idols.garakutaHiro],
  idolChecklistText: "サンプル用チェックリスト\n- OCR確認\n- 共有画像確認\n- 分析確認",
  analysisPresets,
  shareStatsEnabled: false,
  shareStatsConsentAsked: true,
  sharePlayerName: "サンプルP",
  displayName: "サンプルP",
  shareCardLayout: "vertical",
  favoriteIdols: [
    idols.garakutaHiro.id,
    idols.logicLilja.id,
    idols.anomalyMaoSnow.id,
    idols.senseMisuzu.id,
  ],
  recentIdols: [
    idols.senseSaki.id,
    idols.logicHiro.id,
    idols.anomalyUme.id,
    idols.garakutaHiro.id,
  ],
  theme: "soft",
};

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${label} duplicate ids: ${duplicates.join(", ")}`);
  }
}

function validateRecordStage(record, stage, side) {
  const stageIdols = members.map((member) => {
    const idolId = record[`s${stage}_${side}${member}_idol_id`];
    const idolData = idolById.get(idolId);
    if (!idolData) {
      throw new Error(`${record.id} stage ${stage} ${side}${member} has unknown idol`);
    }
    if (!Number.isFinite(Number(record[`s${stage}_${side}${member}_score`]))) {
      throw new Error(`${record.id} stage ${stage} ${side}${member} missing score`);
    }
    if (!Number.isFinite(Number(record[`s${stage}_${side}${member}_rank`]))) {
      throw new Error(`${record.id} stage ${stage} ${side}${member} missing rank`);
    }
    return idolData;
  });

  const duplicateIds = stageIdols
    .map((idolData) => idolData.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `${record.id} stage ${stage} ${side} has duplicate idols: ${duplicateIds.join(", ")}`
    );
  }

  if (stageIdols.some((idolData) => idolData.plan !== stageTypes[stage])) {
    throw new Error(`${record.id} stage ${stage} ${side} has inconsistent plans`);
  }

  stageIdols.forEach((idolData) => {
    if (idolData.id === idols.garakutaHiro.id && stageTypes[stage] !== "センス") {
      throw new Error(`${record.id} places Garakuta Road Hiro outside sense stage`);
    }
  });
}

function validateBackup(data) {
  assertUniqueIds(data.records, "records");
  assertUniqueIds(data.seasonPresets, "seasonPresets");
  assertUniqueIds(data.formationTemplates, "formationTemplates");
  assertUniqueIds(data.analysisPresets, "analysisPresets");
  assertUniqueIds(data.customIdols, "customIdols");

  if (data.records.length !== 80) {
    throw new Error(`expected 80 total matches, got ${data.records.length}`);
  }

  const sampleSeason = data.seasonPresets[0];
  const seasonStart = Date.parse(`${sampleSeason.startDate}T00:00:00+09:00`);
  const seasonEnd = Date.parse(`${sampleSeason.endDate}T23:59:59+09:00`);
  const seasonRecords = data.records.filter((record) => {
    const time = Date.parse(record.date);
    return Number.isFinite(time) && time >= seasonStart && time <= seasonEnd;
  });

  if (seasonRecords.length !== 80) {
    throw new Error(`season/share aggregation would count ${seasonRecords.length} records`);
  }

  const pointSum = data.records.reduce(
    (sum, record) => sum + Number(record.point || 0),
    0
  );
  if (String(pointSum) !== String(sampleSeason.finalPoint)) {
    throw new Error(
      `season finalPoint mismatch: point sum ${pointSum}, finalPoint ${sampleSeason.finalPoint}`
    );
  }

  data.formationTemplates.forEach((template) => {
    slotNames.forEach((slot) => {
      if (!template.slots?.[slot]) {
        throw new Error(`${template.id} missing slot: ${slot}`);
      }
    });
  });

  data.records.forEach((record) => {
    if (!["勝ち", "負け"].includes(record.result)) {
      throw new Error(`${record.id} has invalid result`);
    }
    if (!Number.isFinite(Number(record.point)) || Number(record.point) <= 0) {
      throw new Error(`${record.id} has unrealistic point value`);
    }

    let stageWins = 0;
    stages.forEach((stage) => {
      validateRecordStage(record, stage, "my");
      validateRecordStage(record, stage, "enemy");

      const myBaseTotal = members.reduce(
        (sum, member) => sum + Number(record[`s${stage}_my${member}_score`] || 0),
        0
      );
      const enemyBaseTotal = members.reduce(
        (sum, member) => sum + Number(record[`s${stage}_enemy${member}_score`] || 0),
        0
      );
      if (myBaseTotal !== record[`s${stage}_my_base_total`]) {
        throw new Error(`${record.id} stage ${stage} self total mismatch`);
      }
      if (enemyBaseTotal !== record[`s${stage}_enemy_base_total`]) {
        throw new Error(`${record.id} stage ${stage} enemy total mismatch`);
      }
      if (
        myBaseTotal + Number(record[`s${stage}_my_bonus`] || 0) >
        enemyBaseTotal + Number(record[`s${stage}_enemy_bonus`] || 0)
      ) {
        stageWins += 1;
      }
    });

    const expectedResult = stageWins >= 2 ? "勝ち" : "負け";
    if (record.result !== expectedResult) {
      throw new Error(`${record.id} result contradicts stage results`);
    }
  });
}

validateBackup(backup);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

console.log(`created ${outputPath}`);
console.log(`records: ${records.length}`);
console.log(`seasons: ${backup.seasonPresets.length}`);
console.log(`formationTemplates: ${formationTemplates.length}`);
console.log(`finalPoint: ${season.finalPoint}`);
