import { stages, members } from "./constants";
import { toNumber } from "./numbers";
import { getIdolDisplayName, getIdolImage, getIdolKey, makeStableIdolKey } from "./idols";

export function makeInitialStageDetails() {
  const details = {};

  stages.forEach((stage) => {
    members.forEach((member) => {
      details[`s${stage}_my${member}_score`] = "";
      details[`s${stage}_my${member}_rank`] = "";
      details[`s${stage}_my${member}_idol`] = "";

      details[`s${stage}_enemy${member}_score`] = "";
      details[`s${stage}_enemy${member}_rank`] = "";
      details[`s${stage}_enemy${member}_idol`] = "";
    });

    details[`s${stage}_my_bonus`] = "";
    details[`s${stage}_enemy_bonus`] = "";
  });

  return details;
}

export function getSelectedMyIdol(stage, member, slotValues) {
  return slotValues[`自分 ステージ${stage} メンバー${member}`];
}

export function getSelectedEnemyIdol(stage, member, slotValues) {
  return slotValues[`相手 ステージ${stage} メンバー${member}`];
}

export function flattenSlotValues(slotValues) {
  const flat = {};

  stages.forEach((stage) => {
    members.forEach((member) => {
      const myIdol = getSelectedMyIdol(stage, member, slotValues);
      const enemyIdol = getSelectedEnemyIdol(stage, member, slotValues);

      flat[`s${stage}_my${member}_idol`] = getIdolDisplayName(myIdol);
      flat[`s${stage}_my${member}_idol_name`] = myIdol?.name || "";
      flat[`s${stage}_my${member}_idol_variant`] =
        myIdol?.variant ||
        myIdol?.costume ||
        myIdol?.cardName ||
        myIdol?.title ||
        myIdol?.style ||
        "";
      flat[`s${stage}_my${member}_idol_id`] = getIdolKey(myIdol);
      flat[`s${stage}_my${member}_idol_image`] = getIdolImage(myIdol);

      flat[`s${stage}_enemy${member}_idol`] =
        getIdolDisplayName(enemyIdol) || "登録なし";
      flat[`s${stage}_enemy${member}_idol_name`] = enemyIdol?.name || "";
      flat[`s${stage}_enemy${member}_idol_variant`] =
        enemyIdol?.variant ||
        enemyIdol?.costume ||
        enemyIdol?.cardName ||
        enemyIdol?.title ||
        enemyIdol?.style ||
        "";
      flat[`s${stage}_enemy${member}_idol_id`] = getIdolKey(enemyIdol);
      flat[`s${stage}_enemy${member}_idol_image`] = getIdolImage(enemyIdol);
    });
  });

  return flat;
}

export function buildStageStats(records, sortMode, minCount) {
  const result = { 1: {}, 2: {}, 3: {} };
  const minimumCount = Math.max(0, toNumber(minCount) || 0);

  records.forEach((record) => {
    stages.forEach((stage) => {
      members.forEach((member) => {
        const idolName = record[`s${stage}_my${member}_idol`];
        if (!idolName) return;

        if (!result[stage][idolName]) {
          result[stage][idolName] = {
            idolName,
            stage,
            count: 0,
            winCount: 0,
            loseCount: 0,
            totalBaseScore: 0,
            totalCombined: 0,
            totalTeamScore: 0,
            totalStageWins: 0,
            scoreCount: 0,
            totalRank: 0,
            rankCount: 0,
            firstCount: 0,
            rankDistribution: {1:0,2:0,3:0,4:0},
          };
        }

        const stat = result[stage][idolName];

        const baseScore = toNumber(record[`s${stage}_my${member}_score`]);
        const bonus = toNumber(record[`s${stage}_my_bonus`]);
        const combined = baseScore + bonus;
        const rank = toNumber(record[`s${stage}_my${member}_rank`]);

        const teamScore = stages.reduce((sum, targetStage) => {
          const baseTotal = toNumber(record[`s${targetStage}_my_base_total`]);
          const plus = toNumber(record[`s${targetStage}_my_bonus`]);
          return sum + baseTotal + plus;
        }, 0);

        const stageWins = stages.reduce((sum, targetStage) => {
          const myTotal =
            toNumber(record[`s${targetStage}_my_base_total`]) +
            toNumber(record[`s${targetStage}_my_bonus`]);

          const enemyTotal =
            toNumber(record[`s${targetStage}_enemy_base_total`]) +
            toNumber(record[`s${targetStage}_enemy_bonus`]);

          return sum + (myTotal > enemyTotal ? 1 : 0);
        }, 0);

        stat.count += 1;

        if (record.result === "勝ち") stat.winCount += 1;
        if (record.result === "負け") stat.loseCount += 1;

        if (baseScore > 0) {
          stat.totalBaseScore += baseScore;
          stat.totalCombined += combined;
          stat.totalTeamScore += teamScore;
          stat.totalStageWins += stageWins;
          stat.scoreCount += 1;
        }

        if (rank > 0) {
          stat.rankDistribution[rank] = (stat.rankDistribution[rank] || 0)+1;
          stat.totalRank += rank;
          stat.rankCount += 1;
          if (rank === 1) stat.firstCount += 1;
        }
      });
    });
  });

  const formatted = {};

  stages.forEach((stage) => {
    formatted[stage] = Object.values(result[stage])
      .filter((stat) => stat.count >= minimumCount)
      .map((stat) => ({
        ...stat,
        averageBaseScore: stat.scoreCount
          ? Math.round(stat.totalBaseScore / stat.scoreCount)
          : 0,
        averageCombined: stat.scoreCount
          ? Math.round(stat.totalCombined / stat.scoreCount)
          : 0,
        averageTeamScore: stat.scoreCount
          ? Math.round(stat.totalTeamScore / stat.scoreCount)
          : 0,
        averageStageWins: stat.scoreCount
          ? (stat.totalStageWins / stat.scoreCount).toFixed(2)
          : "0.00",
        adoptionWinRate: stat.count
          ? Math.round((stat.winCount / stat.count) * 100)
          : 0,
        averageRankValue: stat.rankCount ? stat.totalRank / stat.rankCount : 999,
        averageRank: stat.rankCount
          ? (stat.totalRank / stat.rankCount).toFixed(2)
          : "-",
        firstRate: stat.rankCount
          ? Math.round((stat.firstCount / stat.rankCount) * 100)
          : 0,

        top2Rate: stat.rankCount
          ? Math.round(
              (((stat.rankDistribution[1] || 0) +
                (stat.rankDistribution[2] || 0)) /
                stat.rankCount) *
                100
            )
          : 0,

        lowRate: stat.rankCount
          ? Math.round(
              (((stat.rankDistribution[3] || 0) +
                (stat.rankDistribution[4] || 0)) /
                stat.rankCount) *
                100
            )
          : 0,

        stability:
          stat.rankCount && stat.totalRank > 0
            ? Math.max(
                0,
                Math.round(
                  100 -
                    ((stat.totalRank /
                      stat.rankCount -
                      1) *
                      35)
                )
              )
            : 0,
      }));

    const maxAverageBaseScore = formatted[stage].length
      ? Math.max(...formatted[stage].map((stat) => stat.averageBaseScore))
      : 0;

    const minAverageRankValue = formatted[stage].some(
      (stat) => stat.averageRankValue !== 999
    )
      ? Math.min(
          ...formatted[stage]
            .filter((stat) => stat.averageRankValue !== 999)
            .map((stat) => stat.averageRankValue)
        )
      : 999;

    formatted[stage] = formatted[stage].map((stat) => ({
      ...stat,
      isTopAverageBaseScore:
        stat.averageBaseScore > 0 &&
        stat.averageBaseScore === maxAverageBaseScore,
      isTopAverageRank:
        stat.averageRankValue !== 999 &&
        stat.averageRankValue === minAverageRankValue,
    }));

    formatted[stage].sort((a, b) => {
      if (sortMode === "averageRank") return a.averageRankValue - b.averageRankValue;
      if (sortMode === "firstRate") return b.firstRate - a.firstRate;
      if (sortMode === "top2Rate") return b.top2Rate - a.top2Rate;
      if (sortMode === "lowRate") return a.lowRate - b.lowRate;
      if (sortMode === "stability") return b.stability - a.stability;
      if (sortMode === "count") return b.count - a.count;
      if (sortMode === "winRate") return b.adoptionWinRate - a.adoptionWinRate;
      if (sortMode === "averageBaseScore") return b.averageBaseScore - a.averageBaseScore;
      return b.averageCombined - a.averageCombined;
    });
  });

  return formatted;
}

export function buildStageResults(stageDetails) {
  return stages.map((stage) => {
    const myBaseTotal = members.reduce(
      (sum, member) =>
        sum + toNumber(stageDetails[`s${stage}_my${member}_score`]),
      0
    );

    const enemyBaseTotal = members.reduce(
      (sum, member) =>
        sum + toNumber(stageDetails[`s${stage}_enemy${member}_score`]),
      0
    );

    const myBonus = toNumber(stageDetails[`s${stage}_my_bonus`]);
    const enemyBonus = toNumber(stageDetails[`s${stage}_enemy_bonus`]);

    const myTotal = myBaseTotal + myBonus;
    const enemyTotal = enemyBaseTotal + enemyBonus;

    let result = "-";

    if (myTotal > 0 || enemyTotal > 0) {
      if (myTotal > enemyTotal) result = "勝ち";
      else if (myTotal < enemyTotal) result = "負け";
      else result = "引き分け";
    }

    return {
      stage,
      myBaseTotal,
      enemyBaseTotal,
      myBonus,
      enemyBonus,
      myTotal,
      enemyTotal,
      result,
      diff: myTotal - enemyTotal,
    };
  });
}

export function buildRecordStageResults(record) {
  return stages.map((stage) => {
    const myBaseTotal = toNumber(record[`s${stage}_my_base_total`]);
    const enemyBaseTotal = toNumber(record[`s${stage}_enemy_base_total`]);
    const myBonus = toNumber(record[`s${stage}_my_bonus`]);
    const enemyBonus = toNumber(record[`s${stage}_enemy_bonus`]);

    const myTotal = myBaseTotal + myBonus;
    const enemyTotal = enemyBaseTotal + enemyBonus;

    let result = "-";

    if (myTotal > 0 || enemyTotal > 0) {
      if (myTotal > enemyTotal) result = "勝ち";
      else if (myTotal < enemyTotal) result = "負け";
      else result = "引き分け";
    }

    return {
      stage,
      myBaseTotal,
      enemyBaseTotal,
      myBonus,
      enemyBonus,
      myTotal,
      enemyTotal,
      result,
      diff: myTotal - enemyTotal,
    };
  });
}

export function buildAutoMatchResult(stageResults) {
  const decidedStages = stageResults.filter((item) => item.result !== "-");

  if (decidedStages.length === 0) return "-";

  const winCount = decidedStages.filter((item) => item.result === "勝ち").length;
  const loseCount = decidedStages.filter((item) => item.result === "負け").length;

  if (winCount > loseCount) return "勝ち";
  if (loseCount > winCount) return "負け";
  return "引き分け";
}
