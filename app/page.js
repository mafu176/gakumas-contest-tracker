"use client";

import { useEffect, useMemo, useState } from "react";
import Tesseract from "tesseract.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { idolDb } from "./idols";

const API_URL =
  "https://script.google.com/macros/s/AKfycbw8ZzyxQZlo30bMRRsjXkvnd0VweAaPVfiFIVIWLnkBFTqOME_OJgaS3L7obbfNmaHl/exec";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const stages = [1, 2, 3];
const members = [1, 2, 3];

const mySlots = stages.flatMap((stage) =>
  members.map((member) => `自分 ステージ${stage} メンバー${member}`)
);

const enemySlots = stages.flatMap((stage) =>
  members.map((member) => `相手 ステージ${stage} メンバー${member}`)
);

const slotGroups = [
  { title: "自分編成", slots: mySlots },
  { title: "相手編成", slots: enemySlots },
];

function planClass(plan) {
  if (plan === "センス") return "bg-rose-100 text-rose-700";
  if (plan === "ロジック") return "bg-sky-100 text-sky-700";
  if (plan === "アノマリー") return "bg-violet-100 text-violet-700";
  return "bg-zinc-100 text-zinc-700";
}

function resultClass(result) {
  if (result === "勝ち") return "bg-emerald-100 text-emerald-700";
  if (result === "負け") return "bg-rose-100 text-rose-700";
  if (result === "引き分け") return "bg-zinc-100 text-zinc-700";
  return "bg-zinc-100 text-zinc-500";
}

function toNumber(value) {
  const normalized = String(value ?? "")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .replace(/[^\d.-]/g, "");

  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}

function extractScoresFromOcr(text, stage) {
  const rawNumbers =
    String(text ?? "")
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
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

function saveRecordToSheets(record) {
  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(record),
  }).then((res) => res.json());
}

function makeInitialStageDetails() {
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

function getSelectedMyIdol(stage, member, slotValues) {
  return slotValues[`自分 ステージ${stage} メンバー${member}`];
}

function getSelectedEnemyIdol(stage, member, slotValues) {
  return slotValues[`相手 ステージ${stage} メンバー${member}`];
}

function findIdolByName(name) {
  return idolDb.find((idol) => idol.name === name) || null;
}

function flattenSlotValues(slotValues) {
  const flat = {};

  stages.forEach((stage) => {
    members.forEach((member) => {
      const myIdol = getSelectedMyIdol(stage, member, slotValues);
      const enemyIdol = getSelectedEnemyIdol(stage, member, slotValues);

      flat[`s${stage}_my${member}_idol`] = myIdol?.name || "";
      flat[`s${stage}_enemy${member}_idol`] = enemyIdol?.name || "登録なし";
    });
  });

  return flat;
}

function buildStageStats(records, sortMode, minCount) {
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

function buildStageResults(stageDetails) {
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

function buildRecordStageResults(record) {
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

function buildAutoMatchResult(stageResults) {
  const decidedStages = stageResults.filter((item) => item.result !== "-");

  if (decidedStages.length === 0) return "-";

  const winCount = decidedStages.filter((item) => item.result === "勝ち").length;
  const loseCount = decidedStages.filter((item) => item.result === "負け").length;

  if (winCount > loseCount) return "勝ち";
  if (loseCount > winCount) return "負け";
  return "引き分け";
}

export default function Home() {
  const [selectedSlot, setSelectedSlot] = useState("自分 ステージ1 メンバー1");
  const [slotValues, setSlotValues] = useState({});
  const [stageDetails, setStageDetails] = useState(makeInitialStageDetails());
  const [records, setRecords] = useState([]);
  const [opponent, setOpponent] = useState("");
  const [position, setPosition] = useState("上");
  const [point, setPoint] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveWarnings, setSaveWarnings] = useState([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formationName, setFormationName] = useState("");
  const [formationTemplates, setFormationTemplates] = useState([]);

  const [analysisSort, setAnalysisSort] = useState("averageCombined");
  const [analysisPosition, setAnalysisPosition] = useState("全体");
  const [analysisDays, setAnalysisDays] = useState("17");
  const [analysisMinCount, setAnalysisMinCount] = useState("");
  const [selectedIdolDetail, setSelectedIdolDetail] = useState(null);

  const [analysisPresetName, setAnalysisPresetName] = useState("");
  const [analysisPresets, setAnalysisPresets] = useState([]);

  const [backupStatus, setBackupStatus] = useState("");

  const [showGuide, setShowGuide] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const [graphDays, setGraphDays] = useState("17");
  const [graphPosition, setGraphPosition] = useState("全体");

  const [metaDays, setMetaDays] = useState("17");
  const [metaPosition, setMetaPosition] = useState("全体");
  const [metaMinCount, setMetaMinCount] = useState("");

  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [parsedOcrScores, setParsedOcrScores] = useState(null);

  useEffect(() => {
    const savedRecords = localStorage.getItem("gakumasContestRecords");
    if (savedRecords) setRecords(JSON.parse(savedRecords));

    const savedTemplates = localStorage.getItem("gakumasFormationTemplates");
    if (savedTemplates) setFormationTemplates(JSON.parse(savedTemplates));

    const savedAnalysisPresets = localStorage.getItem("gakumasAnalysisPresets");
    if (savedAnalysisPresets) {
      setAnalysisPresets(JSON.parse(savedAnalysisPresets));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("gakumasContestRecords", JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(
      "gakumasFormationTemplates",
      JSON.stringify(formationTemplates)
    );
  }, [formationTemplates]);

  useEffect(() => {
    localStorage.setItem(
      "gakumasAnalysisPresets",
      JSON.stringify(analysisPresets)
    );
  }, [analysisPresets]);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file, "貼り付け画像");
            event.preventDefault();
          }
          return;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [screenshotPreview]);

  const filteredIdols = useMemo(() => {
    return idolDb.filter((idol) =>
      `${idol.name} ${idol.short} ${idol.character} ${idol.plan}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search]);

  const analysisRecords = useMemo(() => {
    let filtered = records;

    if (analysisPosition !== "全体") {
      filtered = filtered.filter(
        (record) => record.position === analysisPosition
      );
    }

    const days = toNumber(analysisDays);

    if (days > 0) {
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((record) => {
        const time = new Date(record.date).getTime();
        if (Number.isNaN(time)) return false;
        return time >= cutoff;
      });
    }

    return filtered;
  }, [records, analysisPosition, analysisDays]);

  const stageStats = useMemo(() => {
    return buildStageStats(analysisRecords, analysisSort, analysisMinCount);
  }, [analysisRecords, analysisSort, analysisMinCount]);

  const stageResults = useMemo(() => {
    return buildStageResults(stageDetails);
  }, [stageDetails]);

  const autoResult = useMemo(() => {
    return buildAutoMatchResult(stageResults);
  }, [stageResults]);



  const saveAnalysisPreset = () => {
    const name = analysisPresetName.trim();

    if (!name) {
      setSaveStatus("分析条件名を入力してください");
      return;
    }

    const preset = {
      id: `A${Date.now()}`,
      name,
      analysisSort,
      analysisPosition,
      analysisDays,
      analysisMinCount,
      graphDays,
      graphPosition,
      metaDays,
      metaPosition,
      metaMinCount,
      createdAt: new Date().toISOString(),
    };

    setAnalysisPresets((prev) => [preset, ...prev]);
    setAnalysisPresetName("");
    setSaveStatus(`分析条件「${name}」を保存しました`);
  };

  const loadAnalysisPreset = (preset) => {
    setAnalysisSort(preset.analysisSort || "averageCombined");
    setAnalysisPosition(preset.analysisPosition || "全体");
    setAnalysisDays(preset.analysisDays || "17");
    setAnalysisMinCount(preset.analysisMinCount || "");

    setGraphDays(preset.graphDays || preset.analysisDays || "17");
    setGraphPosition(preset.graphPosition || preset.analysisPosition || "全体");

    setMetaDays(preset.metaDays || preset.analysisDays || "17");
    setMetaPosition(preset.metaPosition || preset.analysisPosition || "全体");
    setMetaMinCount(preset.metaMinCount || "");

    setSaveStatus(`分析条件「${preset.name}」を読み込みました`);
  };

  const deleteAnalysisPreset = (presetId) => {
    setAnalysisPresets((prev) =>
      prev.filter((preset) => preset.id !== presetId)
    );
    setSaveStatus("分析条件を削除しました");
  };

  const saveCurrentFormation = () => {
    const name = formationName.trim();

    if (!name) {
      setSaveStatus("編成名を入力してください");
      return;
    }

    const slots = {};

    mySlots.forEach((slot) => {
      const idol = slotValues[slot];
      slots[slot] = idol?.name || "";
    });

    const newTemplate = {
      id: `F${Date.now()}`,
      name,
      slots,
      createdAt: new Date().toISOString(),
    };

    setFormationTemplates((prev) => [newTemplate, ...prev]);
    setFormationName("");
    setSaveStatus(`編成「${name}」を保存しました`);
  };

  const loadFormation = (template) => {
    const loaded = {};

    Object.entries(template.slots || {}).forEach(([slot, idolName]) => {
      const idol = findIdolByName(idolName);
      if (idol) loaded[slot] = idol;
    });

    setSlotValues((prev) => ({
      ...prev,
      ...loaded,
    }));

    setSaveStatus(`編成「${template.name}」を読み込みました`);
  };

  const deleteFormation = (templateId) => {
    setFormationTemplates((prev) =>
      prev.filter((template) => template.id !== templateId)
    );
    setSaveStatus("編成テンプレを削除しました");
  };

  const setImageFile = (file, label) => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);

    const url = URL.createObjectURL(file);
    setScreenshotFile(file);
    setScreenshotPreview(url);
    setScreenshotName(label || file.name || "画像");
    setOcrText("");
    setOcrStatus("");
    setOcrProgress(0);
    setParsedOcrScores(null);
  };

  const handleScreenshotChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file, file.name);
  };

  const clearScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);

    setScreenshotPreview("");
    setScreenshotFile(null);
    setScreenshotName("");
    setOcrText("");
    setOcrStatus("");
    setOcrProgress(0);
    setParsedOcrScores(null);
  };

  const runOcr = async () => {
    if (!screenshotFile) {
      setOcrStatus("先にスクリーンショットを選択または貼り付けしてください");
      return;
    }

    setOcrText("");
    setOcrProgress(0);
    setParsedOcrScores(null);
    setOcrStatus("画像をステージごとに分割中...");

    try {
      const imageUrl = URL.createObjectURL(screenshotFile);

      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const stageTexts = [];
      const stageScores = {
        1: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
        2: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
        3: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
      };

      for (const stage of stages) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const cropY = Math.floor((image.height / 3) * (stage - 1));
        const cropHeight = Math.floor(image.height / 3);

        canvas.width = image.width;
        canvas.height = cropHeight;

        context.drawImage(
          image,
          0,
          cropY,
          image.width,
          cropHeight,
          0,
          0,
          image.width,
          cropHeight
        );

        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/png");
        });

        setOcrStatus(`ステージ${stage}をOCR中...`);

        const result = await Tesseract.recognize(blob, "jpn+eng", {
          logger: (m) => {
            if (typeof m.progress === "number") {
              const base = (stage - 1) * 33;
              const progress = Math.min(99, base + Math.round(m.progress * 33));
              setOcrProgress(progress);
            }
          },
        });

        const text = result.data.text || "";
        stageTexts.push(`--- ステージ${stage} ---\n${text}`);
        stageScores[stage] = extractScoresFromOcr(text, stage);
      }

      URL.revokeObjectURL(imageUrl);

      setOcrText(stageTexts.join("\n\n"));
      setParsedOcrScores({ rawNumbers: [], stages: stageScores });
      setOcrProgress(100);
      setOcrStatus("OCR完了");
    } catch (error) {
      console.error(error);
      setOcrStatus("OCRに失敗しました");
    }
  };

  const applyOcrScores = () => {
    if (!parsedOcrScores) return;

    setStageDetails((prev) => {
      const next = { ...prev };

      stages.forEach((stage) => {
        const allScores = [];

        members.forEach((member, index) => {
          const selfScore = parsedOcrScores.stages[stage]?.self?.[index] || "";
          const enemyScore = parsedOcrScores.stages[stage]?.enemy?.[index] || "";

          if (selfScore) {
            next[`s${stage}_my${member}_score`] = selfScore;
            allScores.push({ side: "self", member, score: toNumber(selfScore) });
          }

          if (enemyScore) {
            next[`s${stage}_enemy${member}_score`] = enemyScore;
            allScores.push({ side: "enemy", member, score: toNumber(enemyScore) });
          }
        });

        const selfBaseTotal = members.reduce(
          (sum, member) => sum + toNumber(next[`s${stage}_my${member}_score`]),
          0
        );

        const enemyBaseTotal = members.reduce(
          (sum, member) =>
            sum + toNumber(next[`s${stage}_enemy${member}_score`]),
          0
        );

        const ocrSelfTotal = toNumber(parsedOcrScores.stages[stage]?.selfTotal);
        const ocrEnemyTotal = toNumber(parsedOcrScores.stages[stage]?.enemyTotal);

        if (ocrSelfTotal > 0) {
          const bonus = Math.max(0, ocrSelfTotal - selfBaseTotal);
          next[`s${stage}_my_bonus`] = bonus ? bonus.toLocaleString() : "";
        }

        if (ocrEnemyTotal > 0) {
          const bonus = Math.max(0, ocrEnemyTotal - enemyBaseTotal);
          next[`s${stage}_enemy_bonus`] = bonus ? bonus.toLocaleString() : "";
        }

        const ranked = [...allScores].sort((a, b) => b.score - a.score);

        ranked.forEach((item, index) => {
          if (item.side === "self") {
            next[`s${stage}_my${item.member}_rank`] = String(index + 1);
          }

          if (item.side === "enemy") {
            next[`s${stage}_enemy${item.member}_rank`] = String(index + 1);
          }
        });
      });

      return next;
    });

    setOcrStatus("OCRスコア・順位・プラス点を入力欄へ反映しました");
  };

  const updateStageDetail = (stage, member, field, value) => {
    const key = `s${stage}_my${member}_${field}`;
    setStageDetails((prev) => ({ ...prev, [key]: value }));
  };

  const buildSaveWarnings = () => {
    const warnings = [];

    stages.forEach((stage) => {
      members.forEach((member) => {
        const myIdol = getSelectedMyIdol(stage, member, slotValues);
        const enemyIdol = getSelectedEnemyIdol(stage, member, slotValues);

        if (!myIdol) {
          warnings.push(
            `自分 ステージ${stage} メンバー${member} のアイドルが未選択です`
          );
        }

        if (!enemyIdol) {
          warnings.push(
            `相手 ステージ${stage} メンバー${member} のアイドルが未選択です（登録なしで保存できます）`
          );
        }

        if (!stageDetails[`s${stage}_my${member}_score`]) {
          warnings.push(
            `自分 ステージ${stage} メンバー${member} のスコアが未入力です`
          );
        }

        if (!stageDetails[`s${stage}_enemy${member}_score`]) {
          warnings.push(
            `相手 ステージ${stage} メンバー${member} のスコアが未入力です`
          );
        }
      });
    });

    if (autoResult === "-") warnings.push("勝敗が未判定です");

    return warnings;
  };

  const executeSave = () => {
    const idolFields = flattenSlotValues(slotValues);
    const finalResult = autoResult === "引き分け" ? "負け" : autoResult;

    const nextRecord = {
      id: `M${Date.now()}`,
      date: new Date().toISOString(),
      opponent,
      position,
      result: finalResult === "-" ? "負け" : finalResult,
      point,
      ...idolFields,
      ...Object.fromEntries(
        stages.flatMap((stage) => [
          [
            `s${stage}_my_base_total`,
            members.reduce(
              (sum, member) =>
                sum + toNumber(stageDetails[`s${stage}_my${member}_score`]),
              0
            ),
          ],
          [
            `s${stage}_enemy_base_total`,
            members.reduce(
              (sum, member) =>
                sum + toNumber(stageDetails[`s${stage}_enemy${member}_score`]),
              0
            ),
          ],
        ])
      ),
      ...stageDetails,
    };

    setRecords((prev) => [nextRecord, ...prev]);
    setSaveStatus("保存中...");
    setShowSaveConfirm(false);
    setSaveWarnings([]);

    saveRecordToSheets(nextRecord)
      .then((data) => {
        console.log("保存成功", data);
        setSaveStatus("保存しました");
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus("保存に失敗しました");
      });

    setOpponent("");
    setPoint("");
    setStageDetails(makeInitialStageDetails());
  };

  const handleSaveClick = () => {
    const warnings = buildSaveWarnings();

    if (warnings.length > 0) {
      setSaveWarnings(warnings);
      setShowSaveConfirm(true);
      return;
    }

    executeSave();
  };

  const deleteRecord = () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id;

    setSaveStatus("削除中...");

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        id: targetId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          console.error(data);
          setSaveStatus("Sheets側の削除に失敗しました");
          return;
        }

        setRecords((prev) =>
          prev.filter((record, index) => {
            const recordKey = record.id || `index-${index}`;
            const targetKey = deleteTarget.id || `index-${deleteTarget.index}`;
            return recordKey !== targetKey;
          })
        );

        setSaveStatus("Sheets側とローカル履歴から削除しました");
        setDeleteTarget(null);
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus("削除に失敗しました");
      });
  };

  const exportBackup = () => {
    try {
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        records,
        formationTemplates,
        analysisPresets,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();

      const fileName =
        `gakumas-backup-${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}-` +
        `${String(now.getHours()).padStart(2, "0")}-` +
        `${String(now.getMinutes()).padStart(2, "0")}.json`;

      a.href = url;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setBackupStatus("バックアップを書き出しました");
    } catch (error) {
      console.error(error);
      setBackupStatus("バックアップに失敗しました");
    }
  };

  const importBackup = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.records || !Array.isArray(data.records)) {
        setBackupStatus("records が見つかりません");
        return;
      }

      setRecords(data.records);

      if (data.formationTemplates && Array.isArray(data.formationTemplates)) {
        setFormationTemplates(data.formationTemplates);
      }

      if (data.analysisPresets && Array.isArray(data.analysisPresets)) {
        setAnalysisPresets(data.analysisPresets);
      }

      setBackupStatus(`バックアップを復元しました (${data.records.length}件)`);
      event.target.value = "";
    } catch (error) {
      console.error(error);
      setBackupStatus("バックアップ復元に失敗しました");
    }
  };

  const loadRecords = () => {
    setSaveStatus("読み込み中...");

    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        const reversed = [...data].reverse();
        setRecords(reversed);
        localStorage.setItem("gakumasContestRecords", JSON.stringify(reversed));
        setSaveStatus("読み込みました");
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus("読み込みに失敗しました");
      });
  };

  const updateRecord = (id, field, value) => {
    const updated = records.map((record) =>
      record.id === id ? { ...record, [field]: value } : record
    );

    setRecords(updated);
  };

  const finishEditing = (record) => {
    setEditingId(null);
    setSaveStatus("更新中...");

    saveRecordToSheets(record)
      .then((data) => {
        console.log("更新成功", data);
        setSaveStatus("更新しました");
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus("更新に失敗しました");
      });
  };

  const graphData = useMemo(() => {
    let filtered = [...records];

    if (graphPosition !== "全体") {
      filtered = filtered.filter((record) => record.position === graphPosition);
    }

    const days = Math.max(1, toNumber(graphDays) || 30);
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    filtered = filtered.filter((record) => {
      const time = new Date(record.date).getTime();
      return !Number.isNaN(time) && time >= cutoff;
    });

    const dailyMap = {};

    filtered.forEach((record) => {
      const dateObj = new Date(record.date);
      const dayKey = dateObj.toLocaleDateString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
      });

      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          date: dayKey,
          total: 0,
          wins: 0,
          scoreTotal: 0,
          rawTime: new Date(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate()
          ).getTime(),
        };
      }

      dailyMap[dayKey].total += 1;

      if (record.result === "勝ち") {
        dailyMap[dayKey].wins += 1;
      }

      const teamScore = stages.reduce((sum, stage) => {
        const base = toNumber(record[`s${stage}_my_base_total`]);
        const bonus = toNumber(record[`s${stage}_my_bonus`]);
        return sum + base + bonus;
      }, 0);

      dailyMap[dayKey].scoreTotal += teamScore;
    });

    return Object.values(dailyMap)
      .sort((a, b) => a.rawTime - b.rawTime)
      .map((item) => ({
        ...item,
        winRate: item.total ? Math.round((item.wins / item.total) * 100) : 0,
        averageScore: item.total ? Math.round(item.scoreTotal / item.total) : 0,
      }));
  }, [records, graphDays, graphPosition]);

  const graphChartData = useMemo(() => {
    return {
      labels: graphData.map((row) => row.date),
      datasets: [
        {
          label: "勝率(%)",
          data: graphData.map((row) => row.winRate),
          tension: 0.3,
          yAxisID: "y",
        },
        {
          label: "平均チーム点",
          data: graphData.map((row) => row.averageScore),
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    };
  }, [graphData]);

  const graphChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const value = context.parsed.y;

              if (label.includes("勝率")) {
                return `${label}: ${value}%`;
              }

              return `${label}: ${Number(value || 0).toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          min: 0,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`,
          },
          title: {
            display: true,
            text: "勝率",
          },
        },
        y1: {
          type: "linear",
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: (value) => Number(value || 0).toLocaleString(),
          },
          title: {
            display: true,
            text: "平均チーム点",
          },
        },
      },
    };
  }, []);

  const metaStats = useMemo(() => {
    let filtered = [...records];

    if (metaPosition !== "全体") {
      filtered = filtered.filter((record) => record.position === metaPosition);
    }

    const days = toNumber(metaDays);

    if (days > 0) {
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((record) => {
        const time = new Date(record.date).getTime();
        if (Number.isNaN(time)) return false;
        return time >= cutoff;
      });
    }

    const minimumCount = Math.max(0, toNumber(metaMinCount) || 0);
    const totalMatches = filtered.length;
    const map = {};

    filtered.forEach((record) => {
      stages.forEach((stage) => {
        members.forEach((member) => {
          const idolName = record[`s${stage}_enemy${member}_idol`];

          if (!idolName || idolName === "登録なし") return;

          if (!map[idolName]) {
            map[idolName] = {
              idolName,
              count: 0,
              winCount: 0,
              loseCount: 0,
              stageCounts: { 1: 0, 2: 0, 3: 0 },
              totalEnemyScore: 0,
              enemyScoreCount: 0,
            };
          }

          const stat = map[idolName];

          stat.count += 1;
          stat.stageCounts[stage] += 1;

          if (record.result === "勝ち") {
            stat.winCount += 1;
          } else if (record.result === "負け") {
            stat.loseCount += 1;
          }

          const enemyScore = toNumber(record[`s${stage}_enemy${member}_score`]);

          if (enemyScore > 0) {
            stat.totalEnemyScore += enemyScore;
            stat.enemyScoreCount += 1;
          }
        });
      });
    });

    return Object.values(map)
      .filter((stat) => stat.count >= minimumCount)
      .map((stat) => ({
        ...stat,
        encounterRate: totalMatches
          ? Math.round((stat.count / totalMatches) * 100)
          : 0,
        winRate: stat.count ? Math.round((stat.winCount / stat.count) * 100) : 0,
        averageEnemyScore: stat.enemyScoreCount
          ? Math.round(stat.totalEnemyScore / stat.enemyScoreCount)
          : 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.winRate - a.winRate;
      });
  }, [records, metaDays, metaPosition, metaMinCount]);

  const winCount = records.filter((r) => r.result === "勝ち").length;
  const winRate = records.length
    ? Math.round((winCount / records.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-100 p-4 md:p-6">
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">保存前チェック</h2>

            <p className="mt-2 text-sm text-zinc-600">
              入力漏れがあります。このまま保存することもできます。
            </p>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {saveWarnings.map((warning, index) => (
                <li key={index} className="rounded-xl bg-zinc-100 p-3">
                  {warning}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="rounded-2xl border px-5 py-3 font-semibold"
              >
                戻って修正
              </button>

              <button
                onClick={executeSave}
                className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white"
              >
                そのまま保存
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">履歴を削除しますか？</h2>

            <p className="mt-2 text-sm text-zinc-600">
              Sheets側とローカル履歴の両方から削除します。
            </p>

            <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm">
              <div>相手：{deleteTarget.opponent || "未入力"}</div>
              <div>位置：{deleteTarget.position || "-"}</div>
              <div>勝敗：{deleteTarget.result || "-"}</div>
              <div>pt：{deleteTarget.point || "-"}</div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border px-5 py-3 font-semibold"
              >
                キャンセル
              </button>

              <button
                onClick={deleteRecord}
                className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIdolDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-500">
                  ステージ{selectedIdolDetail.stage}
                </div>
                <h2 className="mt-1 text-xl font-bold">
                  {selectedIdolDetail.idolName}
                </h2>
              </div>

              <button
                onClick={() => setSelectedIdolDetail(null)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold"
              >
                閉じる
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">勝率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.adoptionWinRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {selectedIdolDetail.winCount}勝{" "}
                  {selectedIdolDetail.loseCount}敗 / 採用
                  {selectedIdolDetail.count}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">平均素点</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.averageBaseScore.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  スコア記録 {selectedIdolDetail.scoreCount}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">平均順位</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.averageRank}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  順位記録 {selectedIdolDetail.rankCount}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">1位率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.firstRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  1位 {selectedIdolDetail.firstCount}回
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-zinc-100 p-4">
              <div className="mb-3 text-sm font-semibold">順位分布</div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
                {[1,2,3,4].map((rank)=> {
                  const count = selectedIdolDetail.rankDistribution?.[rank] || 0;
                  const total = selectedIdolDetail.rankCount || 0;
                  const rate = total ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={rank} className="rounded-xl bg-white p-3">
                      <div className="text-xs text-zinc-500">{rank}位率</div>
                      <div className="font-semibold">{rate}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">下位率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.lowRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  3位以下割合
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">安定度</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.stability}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  高いほど安定
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-500">2位以内率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.top2Rate}%
                </div>
              </div>

            </div>

            <div className="mt-4 rounded-2xl border p-4 text-sm text-zinc-600">
              現在の分析フィルタ条件に含まれる対戦だけで集計しています。
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold md:text-3xl">
            学マス コンテスト戦績トラッカー
          </h1>

          <p className="mt-2 text-zinc-600">
            OCR・素点/プラス点・編成テンプレ対応版
          </p>

          {saveStatus && (
            <p className="mt-3 text-sm text-zinc-500">{saveStatus}</p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="text-sm text-zinc-500">総対戦数</div>
            <div className="mt-1 text-3xl font-bold">{records.length}</div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="text-sm text-zinc-500">勝敗</div>
            <div className="mt-1 text-3xl font-bold">
              {winCount}勝 {records.length - winCount}敗
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <div className="text-sm text-zinc-500">勝率</div>
            <div className="mt-1 text-3xl font-bold">{winRate}%</div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">スクショ取り込み</h2>
              <p className="mt-1 text-sm text-zinc-500">
                PCは Ctrl+V で画像貼り付けできます。スマホやPCのファイル選択にも対応しています。
              </p>
            </div>

            {screenshotPreview && (
              <button
                onClick={clearScreenshot}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                画像をクリア
              </button>
            )}
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center hover:bg-zinc-100 md:p-8">
            <div className="text-base font-semibold">
              スクリーンショットを選択
            </div>
            <div className="mt-2 text-sm text-zinc-500">
              PCではファイル選択またはCtrl+V、スマホでは写真ライブラリやカメラから選べます
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshotChange}
            />
          </label>

          {screenshotName && (
            <div className="mt-3 text-sm text-zinc-500">
              選択中：{screenshotName}
            </div>
          )}

          {screenshotPreview && (
            <div className="mt-5 space-y-4">
              <div className="overflow-hidden rounded-3xl border bg-zinc-100">
                <img
                  src={screenshotPreview}
                  alt="スクリーンショットプレビュー"
                  className="max-h-[720px] w-full object-contain"
                />
              </div>

              <button
                onClick={runOcr}
                className="w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white md:w-auto md:px-6"
              >
                OCRで読み取る
              </button>

              {ocrStatus && (
                <div className="text-sm text-zinc-500">
                  {ocrStatus}
                  {ocrProgress > 0 ? ` ${ocrProgress}%` : ""}
                </div>
              )}

              {parsedOcrScores && (
                <div className="rounded-2xl border bg-zinc-50 p-4">
                  <div className="mb-3 font-semibold">OCRスコア抽出結果</div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {stages.map((stage) => (
                      <div key={stage} className="rounded-xl bg-white p-3">
                        <div className="mb-2 font-medium">ステージ{stage}</div>
                        <div className="text-sm text-zinc-600">
                          <div>
                            自分：
                            {parsedOcrScores.stages[stage].self.join(" / ") ||
                              "-"}
                          </div>
                          <div className="mt-1">
                            相手：
                            {parsedOcrScores.stages[stage].enemy.join(" / ") ||
                              "-"}
                          </div>
                          <div className="mt-2 text-xs text-zinc-500">
                            自分合計：
                            {parsedOcrScores.stages[stage].selfTotal || "-"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            相手合計：
                            {parsedOcrScores.stages[stage].enemyTotal || "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={applyOcrScores}
                    className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    抽出スコア・順位・プラス点を入力欄へ反映
                  </button>
                </div>
              )}

              {ocrText && (
                <div className="rounded-2xl border bg-zinc-50 p-4">
                  <div className="mb-2 font-semibold">OCR読み取り結果</div>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm text-zinc-700">
                    {ocrText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 rounded-3xl bg-white p-6 shadow lg:col-span-2">
            <h2 className="text-xl font-semibold">対戦入力</h2>

            <section className="rounded-3xl border bg-zinc-50 p-4">
              <h3 className="font-semibold">自分編成テンプレ</h3>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <input
                  className="rounded-2xl border px-3 py-2"
                  placeholder="編成名を入力"
                  value={formationName}
                  onChange={(e) => setFormationName(e.target.value)}
                />

                <button
                  onClick={saveCurrentFormation}
                  className="rounded-2xl bg-zinc-900 px-5 py-2 font-semibold text-white"
                >
                  現在の自分編成を保存
                </button>
              </div>

              {formationTemplates.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-500">
                  保存済みの編成テンプレはまだありません。
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {formationTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-2xl border bg-white p-4"
                    >
                      <div className="font-semibold">{template.name}</div>

                      <div className="mt-2 text-xs text-zinc-500">
                        {mySlots
                          .map((slot) => template.slots?.[slot])
                          .filter(Boolean)
                          .join(" / ") || "未登録"}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => loadFormation(template)}
                          className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                        >
                          読み込み
                        </button>

                        <button
                          onClick={() => deleteFormation(template.id)}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <input
                className="rounded-2xl border p-3"
                placeholder="相手プレイヤー名"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
              />

              <select
                className="rounded-2xl border p-3"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option>上</option>
                <option>中</option>
                <option>下</option>
              </select>

              <div className="rounded-2xl border bg-zinc-50 p-3">
                <div className="text-xs text-zinc-500">勝敗自動判定</div>
                <div className="font-semibold">
                  {autoResult === "-" ? "未判定" : autoResult}
                </div>
              </div>

              <input
                className="rounded-2xl border p-3"
                placeholder="獲得pt"
                value={point}
                onChange={(e) => setPoint(e.target.value)}
              />
            </div>

            <section className="rounded-3xl border bg-zinc-50 p-4">
              <h3 className="mb-3 font-semibold">ステージ勝敗</h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {stageResults.map((item) => (
                  <div key={item.stage} className="rounded-2xl bg-white p-4">
                    <div className="font-semibold">ステージ{item.stage}</div>

                    <div className="mt-3 text-xs text-zinc-500">自分</div>
                    <div className="text-sm text-zinc-700">
                      素点：{item.myBaseTotal.toLocaleString()}
                    </div>
                    <div className="text-sm text-zinc-700">
                      プラス点：{item.myBonus.toLocaleString()}
                    </div>
                    <div className="text-sm font-semibold">
                      合計：{item.myTotal.toLocaleString()}
                    </div>

                    <div className="mt-3 text-xs text-zinc-500">相手</div>
                    <div className="text-sm text-zinc-700">
                      素点：{item.enemyBaseTotal.toLocaleString()}
                    </div>
                    <div className="text-sm text-zinc-700">
                      プラス点：{item.enemyBonus.toLocaleString()}
                    </div>
                    <div className="text-sm font-semibold">
                      合計：{item.enemyTotal.toLocaleString()}
                    </div>

                    <div className="mt-3 text-sm font-semibold">
                      結果：{item.result}
                    </div>

                    <div className="text-xs text-zinc-500">
                      差分：{item.diff.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {slotGroups.map((group) => (
                <div key={group.title} className="rounded-3xl border p-4">
                  <h3 className="mb-3 font-semibold">{group.title}</h3>

                  <div className="space-y-3">
                    {group.slots.map((slot) => {
                      const idol = slotValues[slot];

                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full rounded-2xl border p-3 text-left ${
                            selectedSlot === slot ? "ring-2 ring-zinc-900" : ""
                          }`}
                        >
                          <div className="text-sm text-zinc-500">{slot}</div>

                          {idol ? (
                            <>
                              <div className="mt-1 font-semibold">
                                {idol.name}
                              </div>
                              <div className="text-sm text-zinc-500">
                                {idol.short} / {idol.plan}
                              </div>
                            </>
                          ) : (
                            <div className="mt-1 text-zinc-400">未選択</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <section className="rounded-3xl border bg-zinc-50 p-4">
              <h3 className="mb-3 font-semibold">自分側スコア・順位</h3>

              <div className="space-y-4">
                {stages.map((stage) => (
                  <div key={stage} className="rounded-2xl bg-white p-4">
                    <div className="mb-3 font-semibold">ステージ{stage}</div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {members.map((member) => {
                        const idol = getSelectedMyIdol(
                          stage,
                          member,
                          slotValues
                        );

                        return (
                          <div key={member} className="rounded-2xl border p-3">
                            <div className="mb-2 text-sm font-medium">
                              {member}人目
                            </div>

                            <div className="mb-2 min-h-6 text-sm text-zinc-500">
                              {idol ? idol.short : "アイドル未選択"}
                            </div>

                            <input
                              className="mb-2 w-full rounded-xl border px-3 py-2"
                              placeholder="スコア"
                              value={stageDetails[`s${stage}_my${member}_score`]}
                              onChange={(e) =>
                                updateStageDetail(
                                  stage,
                                  member,
                                  "score",
                                  e.target.value
                                )
                              }
                            />

                            <input
                              className="w-full rounded-xl border px-3 py-2"
                              placeholder="順位"
                              value={stageDetails[`s${stage}_my${member}_rank`]}
                              onChange={(e) =>
                                updateStageDetail(
                                  stage,
                                  member,
                                  "rank",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border bg-zinc-50 p-3">
                      <div className="mb-2 text-sm font-medium">
                        自分プラス点
                      </div>

                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="プラス点"
                        value={stageDetails[`s${stage}_my_bonus`]}
                        onChange={(e) =>
                          setStageDetails((prev) => ({
                            ...prev,
                            [`s${stage}_my_bonus`]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mb-3 mt-6 font-semibold">相手側スコア・順位</h3>

              <div className="space-y-4">
                {stages.map((stage) => (
                  <div
                    key={`enemy-${stage}`}
                    className="rounded-2xl bg-white p-4"
                  >
                    <div className="mb-3 font-semibold">ステージ{stage}</div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {members.map((member) => {
                        const idol = getSelectedEnemyIdol(
                          stage,
                          member,
                          slotValues
                        );

                        return (
                          <div key={member} className="rounded-2xl border p-3">
                            <div className="mb-2 text-sm font-medium">
                              相手{member}人目
                            </div>

                            <div className="mb-2 min-h-6 text-sm text-zinc-500">
                              {idol ? idol.short : "アイドル未選択"}
                            </div>

                            <input
                              className="mb-2 w-full rounded-xl border px-3 py-2"
                              placeholder="スコア"
                              value={
                                stageDetails[`s${stage}_enemy${member}_score`]
                              }
                              onChange={(e) =>
                                setStageDetails((prev) => ({
                                  ...prev,
                                  [`s${stage}_enemy${member}_score`]:
                                    e.target.value,
                                }))
                              }
                            />

                            <input
                              className="w-full rounded-xl border px-3 py-2"
                              placeholder="順位"
                              value={
                                stageDetails[`s${stage}_enemy${member}_rank`]
                              }
                              onChange={(e) =>
                                setStageDetails((prev) => ({
                                  ...prev,
                                  [`s${stage}_enemy${member}_rank`]:
                                    e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border bg-zinc-50 p-3">
                      <div className="mb-2 text-sm font-medium">
                        相手プラス点
                      </div>

                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="プラス点"
                        value={stageDetails[`s${stage}_enemy_bonus`]}
                        onChange={(e) =>
                          setStageDetails((prev) => ({
                            ...prev,
                            [`s${stage}_enemy_bonus`]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={handleSaveClick}
              className="w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white"
            >
              この対戦を保存
            </button>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">アイドル選択</h2>

            <p className="mt-1 text-sm text-zinc-500">
              選択中：{selectedSlot}
            </p>

            <input
              className="my-4 w-full rounded-2xl border px-3 py-2"
              placeholder="名前・略称で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="grid max-h-[650px] grid-cols-2 gap-3 overflow-y-auto">
              {filteredIdols.map((idol) => (
                <button
                  key={idol.id}
                  onClick={() =>
                    setSlotValues((prev) => ({
                      ...prev,
                      [selectedSlot]: idol,
                    }))
                  }
                  className="rounded-2xl border p-3 text-left hover:bg-zinc-50"
                >
                  <div className="mb-2 flex aspect-square items-center justify-center rounded-2xl bg-zinc-200 p-2 text-center text-sm text-zinc-600">
                    {idol.short}
                  </div>

                  <div className="mt-2 text-sm font-semibold">{idol.short}</div>

                  <div className="mt-1 text-xs text-zinc-500">
                    {idol.character}
                  </div>

                  <div
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planClass(
                      idol.plan
                    )}`}
                  >
                    {idol.plan}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        
<section className="rounded-3xl bg-white p-6 shadow">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">使い方ガイド</h2>

            <span className="text-sm text-zinc-500">
              {showGuide ? "閉じる" : "開く"}
            </span>
          </button>

          {showGuide && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">初回設定</div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  <li>・自分編成を保存</li>
                  <li>・Google Sheets同期設定</li>
                  <li>・バックアップ作成推奨</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">対戦入力</div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  <li>・OCR画像読込可能</li>
                  <li>・順位 / 勝敗は自動計算</li>
                  <li>・相手編成は空欄保存可</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">分析</div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  <li>・分析期間デフォルト17日</li>
                  <li>・順位分布 / 安定度対応</li>
                  <li>・条件保存対応</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="font-semibold">データ保護</div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  <li>・ブラウザ保存</li>
                  <li>・Sheets同期</li>
                  <li>・jsonバックアップ可能</li>
                </ul>
              </div>
            </div>
          )}
        </section>

<section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">分析条件保存</h2>
              <p className="mt-1 text-sm text-zinc-500">
                直近日数・最低採用数・ソート・位置フィルタを保存できます。現在のデフォルト期間は17日です。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="分析条件名"
                value={analysisPresetName}
                onChange={(e) => setAnalysisPresetName(e.target.value)}
              />

              <button
                onClick={saveAnalysisPreset}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                現在の分析条件を保存
              </button>
            </div>
          </div>

          {analysisPresets.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-500">
              保存済みの分析条件はまだありません。
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {analysisPresets.map((preset) => (
                <div key={preset.id} className="rounded-2xl border bg-zinc-50 p-4">
                  <div className="font-semibold">{preset.name}</div>

                  <div className="mt-2 text-xs text-zinc-500">
                    {preset.analysisPosition || "全体"} / 直近
                    {preset.analysisDays || "17"}日 / 最低採用
                    {preset.analysisMinCount === "" ? "なし" : preset.analysisMinCount} /{" "}
                    {preset.analysisSort || "averageCombined"}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => loadAnalysisPreset(preset)}
                      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                    >
                      読み込み
                    </button>

                    <button
                      onClick={() => deleteAnalysisPreset(preset.id)}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">ステージ別アイドル分析</h2>
              <p className="mt-1 text-sm text-zinc-500">
                現在の対象：{analysisPosition} /{" "}
                {analysisDays ? `直近${analysisDays}日 / ` : "全期間 / "}
                最低採用数
                {analysisMinCount === ""
                  ? "なし"
                  : Math.max(0, toNumber(analysisMinCount) || 0)}{" "}
                / {analysisRecords.length}戦
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                アイドル名を押すと、勝率・平均素点・平均順位・1位率を確認できます。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={analysisPosition}
                onChange={(e) => setAnalysisPosition(e.target.value)}
              >
                <option value="全体">全体</option>
                <option value="上">上</option>
                <option value="中">中</option>
                <option value="下">下</option>
              </select>

              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="直近○日"
                value={analysisDays}
                onChange={(e) => setAnalysisDays(e.target.value)}
              />

              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="最低採用数"
                value={analysisMinCount}
                onChange={(e) => setAnalysisMinCount(e.target.value)}
              />

              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={analysisSort}
                onChange={(e) => setAnalysisSort(e.target.value)}
              >
                <option value="averageCombined">平均合計順</option>
                <option value="averageBaseScore">平均素点順</option>
                <option value="averageRank">平均順位順</option>
                <option value="firstRate">1位率順</option>
                <option value="top2Rate">2位以内率順</option>
                <option value="lowRate">下位率順</option>
                <option value="stability">安定度順</option>
                <option value="count">採用数順</option>
                <option value="winRate">採用時勝率順</option>
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
              平均素点トップ
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
              平均順位トップ
            </span>
          </div>

          <div className="space-y-6">
            {stages.map((stage) => (
              <div key={stage} className="rounded-2xl border p-4">
                <h3 className="mb-3 font-semibold">ステージ{stage}</h3>

                {stageStats[stage].length === 0 ? (
                  <div className="text-sm text-zinc-500">
                    この条件のスコア・順位付き戦績がまだありません。
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {stageStats[stage].map((stat, index) => (
                        <div
                          key={stat.idolName}
                          className={`rounded-2xl border p-4 ${
                            stat.isTopAverageBaseScore && stat.isTopAverageRank
                              ? "bg-yellow-100"
                              : stat.isTopAverageBaseScore
                              ? "bg-amber-50"
                              : stat.isTopAverageRank
                              ? "bg-emerald-50"
                              : "bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs text-zinc-500">
                                #{index + 1}
                              </div>
                              <button
                                onClick={() => setSelectedIdolDetail(stat)}
                                className="text-left font-semibold underline-offset-2 hover:underline"
                              >
                                {stat.idolName}
                              </button>
                            </div>

                            <div className="text-right text-xs text-zinc-500">
                              採用 {stat.count}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-xl bg-white/80 p-3">
                              <div className="text-xs text-zinc-500">
                                平均素点
                              </div>
                              <div className="font-semibold">
                                {stat.averageBaseScore.toLocaleString()}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/80 p-3">
                              <div className="text-xs text-zinc-500">
                                平均順位
                              </div>
                              <div className="font-semibold">
                                {stat.averageRank}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/80 p-3">
                              <div className="text-xs text-zinc-500">
                                1位率
                              </div>
                              <div className="font-semibold">
                                {stat.firstRate}%
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/80 p-3">
                              <div className="text-xs text-zinc-500">
                                採用時勝率
                              </div>
                              <div className="font-semibold">
                                {stat.adoptionWinRate}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-zinc-500">
                            <th className="py-2">アイドル</th>
                            <th>採用数</th>
                            <th>勝利</th>
                            <th>敗北</th>
                            <th>採用時勝率</th>
                            <th>平均素点</th>
                            <th>平均合計</th>
                            <th>平均チーム点</th>
                            <th>平均ステージ勝利</th>
                            <th>平均順位</th>
                            <th>1位率</th>
                          </tr>
                        </thead>

                        <tbody>
                          {stageStats[stage].map((stat) => (
                            <tr
                              key={stat.idolName}
                              className={`border-b ${
                                stat.isTopAverageBaseScore &&
                                stat.isTopAverageRank
                                  ? "bg-yellow-100"
                                  : stat.isTopAverageBaseScore
                                  ? "bg-amber-50"
                                  : stat.isTopAverageRank
                                  ? "bg-emerald-50"
                                  : ""
                              }`}
                            >
                              <td className="py-2 font-medium">
                                <button
                                  onClick={() => setSelectedIdolDetail(stat)}
                                  className="text-left underline-offset-2 hover:underline"
                                >
                                  {stat.idolName}
                                </button>
                              </td>
                              <td>{stat.count}</td>
                              <td>{stat.winCount}</td>
                              <td>{stat.loseCount}</td>
                              <td>{stat.adoptionWinRate}%</td>
                              <td className="font-semibold">
                                {stat.averageBaseScore.toLocaleString()}
                              </td>
                              <td>{stat.averageCombined.toLocaleString()}</td>
                              <td>{stat.averageTeamScore.toLocaleString()}</td>
                              <td>{stat.averageStageWins}</td>
                              <td className="font-semibold">
                                {stat.averageRank}
                              </td>
                              <td>{stat.firstRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">勝率推移グラフ</h2>
              <p className="mt-1 text-sm text-zinc-500">
                日別勝率と平均チーム点を折れ線グラフで表示します
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                value={graphDays}
                onChange={(e) => setGraphDays(e.target.value)}
                placeholder="直近○日"
              />

              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={graphPosition}
                onChange={(e) => setGraphPosition(e.target.value)}
              >
                <option>全体</option>
                <option>上</option>
                <option>中</option>
                <option>下</option>
              </select>
            </div>
          </div>

          {graphData.length === 0 ? (
            <div className="mt-6 rounded-2xl border bg-zinc-50 p-5 text-sm text-zinc-500">
              この条件の対戦データがまだありません。
            </div>
          ) : (
            <>
              <div className="mt-6 h-80 rounded-3xl border bg-white p-4">
                <Line data={graphChartData} options={graphChartOptions} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <div className="text-xs text-zinc-500">対象日数</div>
                  <div className="mt-1 text-2xl font-bold">
                    {graphData.length}日
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <div className="text-xs text-zinc-500">期間内対戦数</div>
                  <div className="mt-1 text-2xl font-bold">
                    {graphData
                      .reduce((sum, row) => sum + row.total, 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <div className="text-xs text-zinc-500">期間内勝率</div>
                  <div className="mt-1 text-2xl font-bold">
                    {(() => {
                      const total = graphData.reduce(
                        (sum, row) => sum + row.total,
                        0
                      );
                      const wins = graphData.reduce(
                        (sum, row) => sum + row.wins,
                        0
                      );
                      return total ? Math.round((wins / total) * 100) : 0;
                    })()}
                    %
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="py-2">日付</th>
                      <th>対戦数</th>
                      <th>勝利数</th>
                      <th>勝率</th>
                      <th>平均チーム点</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.map((row) => (
                      <tr key={row.date} className="border-b">
                        <td className="py-2 font-medium">{row.date}</td>
                        <td>{row.total}</td>
                        <td>{row.wins}</td>
                        <td>{row.winRate}%</td>
                        <td>{row.averageScore.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">相手メタ分析</h2>
              <p className="mt-1 text-sm text-zinc-500">
                相手編成に登場したPアイドルの遭遇数・遭遇率・遭遇時勝率を確認できます。
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                遭遇率は「対象対戦数に対して、そのPアイドルを何回見たか」で計算しています。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="直近○日"
                value={metaDays}
                onChange={(e) => setMetaDays(e.target.value)}
              />

              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={metaPosition}
                onChange={(e) => setMetaPosition(e.target.value)}
              >
                <option value="全体">全体</option>
                <option value="上">上</option>
                <option value="中">中</option>
                <option value="下">下</option>
              </select>

              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="最低遭遇数"
                value={metaMinCount}
                onChange={(e) => setMetaMinCount(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-500">表示件数</div>
              <div className="mt-1 text-2xl font-bold">{metaStats.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-500">最多遭遇</div>
              <div className="mt-1 text-lg font-bold">
                {metaStats[0]?.idolName || "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {metaStats[0] ? `${metaStats[0].count}回` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-500">対象条件</div>
              <div className="mt-1 text-lg font-bold">
                {metaPosition} / {metaDays ? `直近${metaDays}日` : "全期間"}
              </div>
            </div>
          </div>

          {metaStats.length === 0 ? (
            <div className="rounded-2xl border bg-zinc-50 p-5 text-sm text-zinc-500">
              この条件の相手編成データがまだありません。
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {metaStats.map((stat, index) => (
                  <div key={stat.idolName} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-zinc-500">#{index + 1}</div>
                        <div className="font-semibold">{stat.idolName}</div>
                      </div>

                      <div className="text-right text-xs text-zinc-500">
                        遭遇 {stat.count}回
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-zinc-100 p-3">
                        <div className="text-xs text-zinc-500">遭遇率</div>
                        <div className="font-semibold">{stat.encounterRate}%</div>
                      </div>

                      <div className="rounded-xl bg-zinc-100 p-3">
                        <div className="text-xs text-zinc-500">遭遇時勝率</div>
                        <div className="font-semibold">{stat.winRate}%</div>
                      </div>

                      <div className="rounded-xl bg-zinc-100 p-3">
                        <div className="text-xs text-zinc-500">平均相手素点</div>
                        <div className="font-semibold">
                          {stat.averageEnemyScore.toLocaleString()}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-100 p-3">
                        <div className="text-xs text-zinc-500">ステージ別</div>
                        <div className="font-semibold">
                          1:{stat.stageCounts[1]} / 2:{stat.stageCounts[2]} / 3:
                          {stat.stageCounts[3]}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="py-2">順位</th>
                      <th>相手Pアイドル</th>
                      <th>遭遇数</th>
                      <th>遭遇率</th>
                      <th>遭遇時勝率</th>
                      <th>勝利</th>
                      <th>敗北</th>
                      <th>平均相手素点</th>
                      <th>ステージ1</th>
                      <th>ステージ2</th>
                      <th>ステージ3</th>
                    </tr>
                  </thead>

                  <tbody>
                    {metaStats.map((stat, index) => (
                      <tr key={stat.idolName} className="border-b">
                        <td className="py-2">#{index + 1}</td>
                        <td className="font-medium">{stat.idolName}</td>
                        <td>{stat.count}</td>
                        <td>{stat.encounterRate}%</td>
                        <td className="font-semibold">{stat.winRate}%</td>
                        <td>{stat.winCount}</td>
                        <td>{stat.loseCount}</td>
                        <td>{stat.averageEnemyScore.toLocaleString()}</td>
                        <td>{stat.stageCounts[1]}</td>
                        <td>{stat.stageCounts[2]}</td>
                        <td>{stat.stageCounts[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        

        <section className="rounded-3xl bg-white p-6 shadow">
          <button
            onClick={() => setShowBackup(!showBackup)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">バックアップ / 復元</h2>

            <span className="text-sm text-zinc-500">
              {showBackup ? "閉じる" : "開く"}
            </span>
          </button>

          {showBackup && (
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  対戦履歴・編成テンプレ・分析条件をJSONで保存できます。
                </p>

                {backupStatus && (
                  <p className="mt-2 text-sm text-zinc-500">
                    {backupStatus}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  onClick={exportBackup}
                  className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white"
                >
                  バックアップを書き出し
                </button>

                <label className="cursor-pointer rounded-2xl border px-5 py-3 text-center font-semibold">
                  バックアップを復元
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={importBackup}
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">最近の対戦</h2>

            <button
              onClick={loadRecords}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Sheetsから読み込み
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-zinc-500">まだ保存された対戦はありません。</div>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {records.map((record, index) => {
                  const recordStages = buildRecordStageResults(record);

                  return (
                    <div
                      key={record.id || index}
                      className="rounded-3xl border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-zinc-500">
                            {record.id || `#${index + 1}`}
                          </div>
                          <div className="font-semibold">
                            {record.opponent || "相手未入力"}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            位置：{record.position || "-"} / pt：
                            {record.point || "-"}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${resultClass(
                            record.result
                          )}`}
                        >
                          {record.result || "-"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {recordStages.map((item) => (
                          <div
                            key={item.stage}
                            className="rounded-2xl bg-zinc-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="font-semibold">
                                ステージ{item.stage}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${resultClass(
                                  item.result
                                )}`}
                              >
                                {item.result}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-zinc-500">
                                  自分合計
                                </div>
                                <div className="font-semibold">
                                  {item.myTotal.toLocaleString()}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-500">
                                  相手合計
                                </div>
                                <div className="font-semibold">
                                  {item.enemyTotal.toLocaleString()}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-500">
                                  差分
                                </div>
                                <div className="font-semibold">
                                  {item.diff.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => {
                            if (editingId === record.id) {
                              finishEditing(record);
                            } else {
                              setEditingId(record.id);
                            }
                          }}
                          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
                        >
                          {editingId === record.id ? "保存" : "編集"}
                        </button>

                        <button
                          onClick={() => setDeleteTarget({ ...record, index })}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="py-2">ID</th>
                      <th>相手</th>
                      <th>位置</th>
                      <th>勝敗</th>
                      <th>pt</th>
                      <th>ステージ1</th>
                      <th>ステージ2</th>
                      <th>ステージ3</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, index) => (
                      <tr key={record.id || index} className="border-b">
                        <td className="py-2">{record.id}</td>

                        <td>
                          {editingId === record.id ? (
                            <input
                              className="rounded border px-2 py-1"
                              value={record.opponent || ""}
                              onChange={(e) =>
                                updateRecord(
                                  record.id,
                                  "opponent",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            record.opponent || "未入力"
                          )}
                        </td>

                        <td>{record.position}</td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${resultClass(
                              record.result
                            )}`}
                          >
                            {record.result}
                          </span>
                        </td>
                        <td>{record.point || "-"}</td>

                        {stages.map((stage) => {
                          const summary = buildRecordStageResults(record).find(
                            (item) => item.stage === stage
                          );

                          return (
                            <td key={stage} className="text-xs text-zinc-600">
                              <div className="font-semibold">
                                {summary?.result || "-"} / 差分：
                                {summary?.diff.toLocaleString() || "0"}
                              </div>
                              <div>
                                自分 {summary?.myTotal.toLocaleString() || "0"} /
                                相手 {summary?.enemyTotal.toLocaleString() || "0"}
                              </div>
                            </td>
                          );
                        })}

                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (editingId === record.id) {
                                  finishEditing(record);
                                } else {
                                  setEditingId(record.id);
                                }
                              }}
                              className="rounded bg-zinc-800 px-3 py-1 text-xs text-white"
                            >
                              {editingId === record.id ? "保存" : "編集"}
                            </button>

                            <button
                              onClick={() =>
                                setDeleteTarget({ ...record, index })
                              }
                              className="rounded border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}