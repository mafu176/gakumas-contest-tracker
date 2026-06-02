import fs from "node:fs";
import path from "node:path";
import { idolDb } from "../app/idols.js";
import { migrateBackupData } from "../app/lib/backup.js";

const outputPath = path.join(
  "sample-data",
  "gakumas_backup_demo_1season_7000pt.json"
);

const stages = [1, 2, 3];
const members = [1, 2, 3];
const stageTypes = {
  1: "センス",
  2: "ロジック",
  3: "アノマリー",
};
const slotKeys = stages.flatMap((stage) =>
  members.map((member) => `自分 ステージ${stage} メンバー${member}`)
);
const idolById = new Map(idolDb.map((idol) => [idol.id, idol]));

function requireIdol(id) {
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
    image: found.image || "",
  };
}

const idols = {
  garakutaHiro: requireIdol("篠澤_広_ガラクタロード"),

  senseSaki: requireIdol("花海_咲季_Fighting_My_Way"),
  senseTemari: requireIdol("月村_手毬_Luna_say_maybe"),
  senseMao: requireIdol("有村_麻央_Fluorite"),
  senseKotone: requireIdol("藤田_ことね_Yellow_Big_Bang"),
  senseLilja: requireIdol("葛城_リーリヤ_冠菊"),
  senseMisuzu: requireIdol("秦谷_美鈴_Star_mine"),
  senseRinami: requireIdol("姫崎_莉波_clumsy_trick"),
  senseSena: requireIdol("十王_星南_Campus_mode"),

  logicKotone: requireIdol("藤田_ことね_世界一可愛い私"),
  logicLilja: requireIdol("葛城_リーリヤ_白線"),
  logicChina: requireIdol("倉本_千奈_Wonder_Scale"),
  logicHiro: requireIdol("篠澤_広_光景"),
  logicSena: requireIdol("十王_星南_ハッピーミルフィーユ"),
  logicSaki: requireIdol("花海_咲季_Boom_Boom_Pow"),
  logicUme: requireIdol("花海_佑芽_Star_mine"),

  anomalyMao: requireIdol("有村_麻央_Campus_mode"),
  anomalyMaoSnow: requireIdol("有村_麻央_雪解けに"),
  anomalyLilja: requireIdol("葛城_リーリヤ_極光"),
  anomalyHiro: requireIdol("篠澤_広_ハッピーミルフィーユ"),
  anomalyRinami: requireIdol("姫崎_莉波_Campus_mode"),
  anomalyUme: requireIdol("花海_佑芽_Campus_mode"),
  anomalySena: requireIdol("十王_星南_Star_mine"),
  anomalyMisuzu: requireIdol("秦谷_美鈴_ツキノカメ"),
  anomalySumika: requireIdol("紫雲_清夏_カクシタワタシ"),
};

const myFormations = {
  front: {
    1: [idols.senseSaki, idols.senseTemari, idols.senseMao],
    2: [idols.logicKotone, idols.logicLilja, idols.logicChina],
    3: [idols.anomalyMao, idols.anomalyLilja, idols.anomalyRinami],
  },
  back: {
    1: [idols.garakutaHiro, idols.senseKotone, idols.senseMisuzu],
    2: [idols.logicHiro, idols.logicSena, idols.logicUme],
    3: [idols.anomalyMaoSnow, idols.anomalySena, idols.anomalyMisuzu],
  },
};

const enemyFormations = {
  front: {
    1: [idols.senseLilja, idols.senseKotone, idols.senseRinami],
    2: [idols.logicSaki, idols.logicSena, idols.logicHiro],
    3: [idols.anomalyHiro, idols.anomalyMaoSnow, idols.anomalyUme],
  },
  back: {
    1: [idols.senseSena, idols.senseMao, idols.senseTemari],
    2: [idols.logicKotone, idols.logicLilja, idols.logicSaki],
    3: [idols.anomalySumika, idols.anomalyLilja, idols.anomalyRinami],
  },
};

const myScoreBase = {
  front: {
    1: [124000, 103000, 88000],
    2: [148000, 112000, 94000],
    3: [171000, 132000, 236000],
  },
  back: {
    1: [191000, 127000, 104000],
    2: [163000, 142000, 111000],
    3: [182000, 151000, 304000],
  },
};

const enemyScoreBase = {
  front: {
    1: [118000, 96000, 82000],
    2: [136000, 109000, 98000],
    3: [158000, 128000, 214000],
  },
  back: {
    1: [127000, 102000, 86000],
    2: [142000, 112000, 103000],
    3: [167000, 134000, 228000],
  },
};

const myRankBase = {
  front: {
    1: [3, 1, 2],
    2: [3, 1, 2],
    3: [3, 1, 2],
  },
  back: {
    1: [3, 1, 2],
    2: [3, 1, 2],
    3: [3, 1, 2],
  },
};

const enemyRankBase = {
  front: {
    1: [4, 2, 3],
    2: [4, 2, 3],
    3: [4, 2, 3],
  },
  back: {
    1: [3, 4, 2],
    2: [3, 4, 2],
    3: [3, 4, 2],
  },
};

const positions = ["上殴り", "中殴り", "下殴り"];

function idolFields(prefix, idolData) {
  return {
    [`${prefix}_idol`]: idolData.name,
    [`${prefix}_idol_name`]: idolData.name,
    [`${prefix}_idol_variant`]: idolData.variant || "",
    [`${prefix}_idol_id`]: idolData.id,
    [`${prefix}_idol_db_id`]: idolData.idol_db_id || idolData.id,
    [`${prefix}_idol_image`]: idolData.image,
  };
}

function scoreFor(base, dayIndex, matchIndex, stage, member, sideOffset = 0) {
  const wave =
    ((dayIndex * 19 + matchIndex * 13 + stage * 11 + member * 7 + sideOffset) %
      31) *
    740;
  return base + wave + dayIndex * 410 + matchIndex * 260;
}

function rankFor(base, dayIndex, matchIndex, stage, member) {
  const drift = (dayIndex + matchIndex + stage + member) % 9 === 0 ? 1 : 0;
  return Math.max(1, Math.min(4, base + drift));
}

function plannedStageWins(matchNumber) {
  if (matchNumber % 4 === 0) {
    return matchNumber % 8 === 0
      ? { 1: false, 2: false, 3: true }
      : { 1: false, 2: true, 3: false };
  }

  if (matchNumber % 10 === 0) return { 1: true, 2: true, 3: true };
  if (matchNumber % 3 === 0) return { 1: true, 2: false, 3: true };
  return { 1: true, 2: true, 3: false };
}

function pointFor(position, matchWin, stageWinCount, matchIndex) {
  const winBase = {
    上殴り: 126,
    中殴り: 104,
    下殴り: 82,
  };
  const loseBase = {
    上殴り: 52,
    中殴り: 38,
    下殴り: 28,
  };
  const base = matchWin ? winBase[position] : loseBase[position];
  const variance = (matchIndex % 5) - 2;
  return base + stageWinCount * 4 + variance;
}

function templateSlots(formation) {
  return Object.fromEntries(
    stages.flatMap((stage) =>
      members.map((member) => [
        `自分 ステージ${stage} メンバー${member}`,
        formation[stage][member - 1].name,
      ])
    )
  );
}

function makeTemplate(id, name, formation, createdAt) {
  return {
    id,
    name,
    slots: templateSlots(formation),
    createdAt,
  };
}

function makeRecord(globalIndex, dayIndex, matchInDay) {
  const matchNumber = globalIndex + 1;
  const phase = dayIndex < 8 ? "front" : "back";
  const myFormation = myFormations[phase];
  const enemyFormation = enemyFormations[phase];
  const stageWinMap = plannedStageWins(matchNumber);
  const stageWinCount = stages.filter((stage) => stageWinMap[stage]).length;
  const matchWin = stageWinCount >= 2;
  const position = positions[globalIndex % positions.length];
  const day = String(dayIndex + 1).padStart(2, "0");
  const hour = 12 + Math.floor(matchInDay / 2);
  const minute = 9 + matchInDay * 8;
  const record = {
    id: `DEMO7000_MATCH_${String(matchNumber).padStart(3, "0")}`,
    date: `2026-05-${day}T${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}:00+09:00`,
    opponent: `デモ対戦相手${String(matchNumber).padStart(2, "0")}`,
    position,
    result: matchWin ? "勝ち" : "負け",
    point: String(pointFor(position, matchWin, stageWinCount, globalIndex)),
    memo:
      matchNumber === 41
        ? "後半編成へ切り替え。ガラクタロード広をStage1に採用。"
        : "",
  };

  stages.forEach((stage) => {
    const myScores = members.map((member) =>
      scoreFor(
        myScoreBase[phase][stage][member - 1],
        dayIndex,
        matchInDay,
        stage,
        member
      )
    );
    const enemyScores = members.map((member) =>
      scoreFor(
        enemyScoreBase[phase][stage][member - 1],
        dayIndex,
        matchInDay,
        stage,
        member,
        17
      )
    );
    const myBonus = stageWinMap[stage] ? 8200 + ((globalIndex + stage) % 6) * 930 : 0;
    const enemyBonus = stageWinMap[stage] ? 0 : 7600 + ((globalIndex + stage) % 5) * 880;
    const myBaseTotal = myScores.reduce((sum, score) => sum + score, 0);
    const enemyBaseTotal = enemyScores.reduce((sum, score) => sum + score, 0);

    if (stageWinMap[stage] && myBaseTotal + myBonus <= enemyBaseTotal + enemyBonus) {
      myScores[0] += enemyBaseTotal + enemyBonus - (myBaseTotal + myBonus) + 22000;
    }
    if (!stageWinMap[stage] && enemyBaseTotal + enemyBonus <= myBaseTotal + myBonus) {
      enemyScores[0] += myBaseTotal + myBonus - (enemyBaseTotal + enemyBonus) + 22000;
    }

    const fixedMyBaseTotal = myScores.reduce((sum, score) => sum + score, 0);
    const fixedEnemyBaseTotal = enemyScores.reduce((sum, score) => sum + score, 0);

    members.forEach((member) => {
      const myIdol = myFormation[stage][member - 1];
      const enemyIdol = enemyFormation[stage][member - 1];
      Object.assign(record, idolFields(`s${stage}_my${member}`, myIdol));
      Object.assign(record, idolFields(`s${stage}_enemy${member}`, enemyIdol));
      record[`s${stage}_my${member}_score`] = String(myScores[member - 1]);
      record[`s${stage}_enemy${member}_score`] = String(enemyScores[member - 1]);
      record[`s${stage}_my${member}_rank`] = String(
        rankFor(myRankBase[phase][stage][member - 1], dayIndex, matchInDay, stage, member)
      );
      record[`s${stage}_enemy${member}_rank`] = String(
        rankFor(enemyRankBase[phase][stage][member - 1], dayIndex, matchInDay, stage, member)
      );
    });

    record[`s${stage}_my_base_total`] = String(fixedMyBaseTotal);
    record[`s${stage}_enemy_base_total`] = String(fixedEnemyBaseTotal);
    record[`s${stage}_my_bonus`] = String(myBonus);
    record[`s${stage}_enemy_bonus`] = String(enemyBonus);
  });

  return record;
}

function normalizePointTotal(records, targetTotal) {
  const currentTotal = records.reduce((sum, record) => sum + Number(record.point), 0);
  let diff = targetTotal - currentTotal;
  for (let index = records.length - 1; index >= 0 && diff !== 0; index -= 1) {
    const record = records[index];
    const current = Number(record.point);
    const step = diff > 0 ? Math.min(diff, 12) : Math.max(diff, -12);
    const next = current + step;
    if (next >= 20 && next <= 160) {
      record.point = String(next);
      diff -= step;
    }
  }
  if (diff !== 0) {
    throw new Error(`could not normalize points, remaining diff: ${diff}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id).filter(Boolean);
  assert(ids.length === items.length, `${label} has missing ids`);
  assert(new Set(ids).size === ids.length, `${label} has duplicate ids`);
}

function validateFormation(formation, label) {
  stages.forEach((stage) => {
    const ids = formation[stage].map((idolData) => idolData.id);
    assert(formation[stage].length === 3, `${label} stage ${stage} must have 3 idols`);
    assert(new Set(ids).size === 3, `${label} stage ${stage} has duplicate idols`);
    formation[stage].forEach((idolData) => {
      assert(
        idolData.plan === stageTypes[stage],
        `${label} stage ${stage} contains ${idolData.name} (${idolData.plan})`
      );
      if (idolData.id === idols.garakutaHiro.id) {
        assert(stage === 1, "Garakuta Road Hiro must appear only in Stage 1");
      }
    });
  });
}

function validateBackup(data) {
  assert(data.records.length === 80, "records must be 80");
  assert(data.seasons.length === 1, "seasons must be exactly 1");
  assert(data.seasonPresets.length === 1, "seasonPresets must be exactly 1");
  assertUniqueIds(data.records, "records");
  assertUniqueIds(data.seasons, "seasons");
  assertUniqueIds(data.formationTemplates, "formationTemplates");
  assertUniqueIds(data.analysisPresets, "analysisPresets");

  Object.entries(myFormations).forEach(([phase, formation]) =>
    validateFormation(formation, `self ${phase}`)
  );
  Object.entries(enemyFormations).forEach(([phase, formation]) =>
    validateFormation(formation, `enemy ${phase}`)
  );

  data.formationTemplates.forEach((template) => {
    assert(template.slots && typeof template.slots === "object", `${template.id} slots missing`);
    slotKeys.forEach((slot) => assert(template.slots[slot], `${template.id} missing ${slot}`));
  });

  const season = data.seasons[0];
  const start = new Date(`${season.startDate}T00:00:00`).getTime();
  const end = new Date(`${season.endDate}T23:59:59`).getTime();
  const seasonRecords = data.records.filter((record) => {
    const time = new Date(record.date).getTime();
    return time >= start && time <= end;
  });
  assert(seasonRecords.length === 80, "season/share aggregation count must be 80");

  const pointSum = data.records.reduce((sum, record) => sum + Number(record.point), 0);
  assert(pointSum === Number(season.finalPoint), "season.finalPoint must equal record point sum");
  assert(pointSum >= 6800 && pointSum <= 7200, "finalPoint must be 6800-7200");

  data.records.forEach((record) => {
    const stageWins = stages.map((stage) => {
      const myIds = members.map((member) => record[`s${stage}_my${member}_idol_id`]);
      const enemyIds = members.map((member) => record[`s${stage}_enemy${member}_idol_id`]);
      assert(new Set(myIds).size === 3, `${record.id} stage ${stage} duplicate self idols`);
      assert(new Set(enemyIds).size === 3, `${record.id} stage ${stage} duplicate enemy idols`);

      myIds.forEach((id) => {
        const idolData = idolById.get(id);
        assert(idolData, `${record.id} unknown self idol ${id}`);
        assert(idolData.plan === stageTypes[stage], `${record.id} self plan mismatch ${id}`);
        if (id === idols.garakutaHiro.id) {
          assert(stage === 1, `${record.id} Garakuta Road Hiro outside Stage 1`);
        }
      });
      enemyIds.forEach((id) => {
        const idolData = idolById.get(id);
        assert(idolData, `${record.id} unknown enemy idol ${id}`);
        assert(idolData.plan === stageTypes[stage], `${record.id} enemy plan mismatch ${id}`);
      });

      const myScoreTotal = members.reduce(
        (sum, member) => sum + Number(record[`s${stage}_my${member}_score`]),
        0
      );
      const enemyScoreTotal = members.reduce(
        (sum, member) => sum + Number(record[`s${stage}_enemy${member}_score`]),
        0
      );
      assert(
        myScoreTotal === Number(record[`s${stage}_my_base_total`]),
        `${record.id} stage ${stage} self base total mismatch`
      );
      assert(
        enemyScoreTotal === Number(record[`s${stage}_enemy_base_total`]),
        `${record.id} stage ${stage} enemy base total mismatch`
      );
      const myTotal = myScoreTotal + Number(record[`s${stage}_my_bonus`]);
      const enemyTotal = enemyScoreTotal + Number(record[`s${stage}_enemy_bonus`]);
      assert(myTotal !== enemyTotal, `${record.id} stage ${stage} must not draw`);
      return myTotal > enemyTotal;
    });
    const winCount = stageWins.filter(Boolean).length;
    assert(winCount !== 1.5, `${record.id} invalid stage wins`);
    assert(
      record.result === (winCount >= 2 ? "勝ち" : "負け"),
      `${record.id} result does not match best-of-3`
    );
  });

  const migrated = migrateBackupData(data);
  assert(migrated.records.length === 80, "migration records mismatch");
  assert(migrated.seasonPresets.length === 1, "migration seasons mismatch");
  assert(migrated.theme === "soft", "migration theme mismatch");
}

const records = [];
for (let dayIndex = 0; dayIndex < 16; dayIndex += 1) {
  for (let matchInDay = 0; matchInDay < 5; matchInDay += 1) {
    records.push(makeRecord(dayIndex * 5 + matchInDay, dayIndex, matchInDay));
  }
}
normalizePointTotal(records, 7000);

const season = {
  id: "DEMO7000_SEASON_202605",
  name: "デモS：16日80戦 7000pt確認",
  startDate: "2026-05-01",
  endDate: "2026-05-16",
  finalPoint: String(records.reduce((sum, record) => sum + Number(record.point), 0)),
  finalRank: "742",
  stageTypes,
  memo:
    "公開デモ確認用の1シーズンサンプルです。前半と後半で編成を切り替え、後半はガラクタロード広をStage1に採用しています。",
  createdAt: "2026-05-01T12:00:00+09:00",
};

const formationTemplates = [
  makeTemplate(
    "DEMO7000_TEMPLATE_FRONT",
    "デモ前半編成",
    myFormations.front,
    "2026-05-01T12:00:00+09:00"
  ),
  makeTemplate(
    "DEMO7000_TEMPLATE_BACK_GARAKUTA",
    "デモ後半編成 ガラクタロード広採用",
    myFormations.back,
    "2026-05-09T12:00:00+09:00"
  ),
];

const analysisPresets = [
  {
    id: "DEMO7000_ANALYSIS_ALL",
    name: "デモ：全期間分析",
    sortMode: "averageCombined",
    stageFilter: "all",
    positionFilter: "全体",
    analysisDays: "16",
    minCount: "",
    metaDays: "16",
    metaMinCount: "",
    metaTopCount: "",
    graphDays: "16",
    graphPosition: "全体",
    createdAt: "2026-05-16T21:00:00+09:00",
  },
  {
    id: "DEMO7000_ANALYSIS_BACK_HALF",
    name: "デモ：後半編成確認",
    sortMode: "averageBaseScore",
    stageFilter: "all",
    positionFilter: "全体",
    analysisDays: "8",
    minCount: "3",
    metaDays: "8",
    metaMinCount: "3",
    metaTopCount: "10",
    graphDays: "8",
    graphPosition: "全体",
    createdAt: "2026-05-16T21:05:00+09:00",
  },
];

const customIdols = [
  {
    ...idols.garakutaHiro,
    name: "ガラクタロード 篠澤広",
    displayName: "ガラクタロード 篠澤広",
    image: "/idols/99.png",
  },
];

const data = {
  version: 2,
  exportedAt: "2026-05-16T21:30:00+09:00",
  records,
  seasons: [season],
  seasonPresets: [season],
  formationTemplates,
  analysisPresets,
  customIdols,
  idolChecklistText:
    "デモ用チェックリスト\n- シーズンサマリー確認\n- 分析TOP表示確認\n- 共有画像確認\n- バックアップ復元確認",
  shareStatsEnabled: false,
  shareStatsConsentAsked: true,
  sharePlayerName: "デモプロデューサー",
  displayName: "デモプロデューサー",
  shareCardLayout: "vertical",
  favoriteIdols: [
    idols.garakutaHiro.id,
    idols.senseKotone.id,
    idols.logicHiro.id,
    idols.anomalySena.id,
  ],
  recentIdols: [
    idols.garakutaHiro.id,
    idols.senseMisuzu.id,
    idols.logicUme.id,
    idols.anomalyMisuzu.id,
    idols.anomalyMaoSnow.id,
  ],
  theme: "soft",
};

validateBackup(data);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const wins = records.filter((record) => record.result === "勝ち").length;
const losses = records.filter((record) => record.result === "負け").length;
console.log(`created: ${outputPath}`);
console.log(`records: ${records.length}`);
console.log(`season finalPoint: ${season.finalPoint}`);
console.log(`wins/losses: ${wins}/${losses}`);
console.log("validation: passed");
