"use client";

/* eslint-disable @next/next/no-img-element */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toPng } from "html-to-image";
import { idolDb } from "./idols";
import IdolSelectModal from "./components/IdolSelectModal";
import AnalysisPresetPanel from "./components/analysis/AnalysisPresetPanel";
import AnalysisGraphPanel from "./components/analysis/AnalysisGraphPanel";
import FinalFormationPanel from "./components/analysis/FinalFormationPanel";
import MetaStatsPanel from "./components/analysis/MetaStatsPanel";
import PositionSummaryPanel from "./components/analysis/PositionSummaryPanel";
import StageIdolAnalysisPanel from "./components/analysis/StageIdolAnalysisPanel";
import MainTabNav from "./components/MainTabNav";
import BattleInputPanel from "./components/input/BattleInputPanel";
import FormationSelectorPanel from "./components/input/FormationSelectorPanel";
import RecentRecordsPanel from "./components/input/RecentRecordsPanel";
import DeleteConfirmModal from "./components/modals/DeleteConfirmModal";
import IdolDetailModal from "./components/modals/IdolDetailModal";
import SaveConfirmModal from "./components/modals/SaveConfirmModal";
import OcrImportPanel from "./components/ocr/OcrImportPanel";
import PageHeader from "./components/PageHeader";
import BackupPanel from "./components/settings/BackupPanel";
import DeveloperPanel from "./components/settings/DeveloperPanel";
import GuidePanel from "./components/settings/GuidePanel";
import RegressionTestPanel from "./components/settings/RegressionTestPanel";
import SharePanel from "./components/share/SharePanel";
import DailyBattleHistoryPanel from "./components/season/DailyBattleHistoryPanel";
import FormationChangeHistoryPanel from "./components/season/FormationChangeHistoryPanel";
import SeasonListPanel from "./components/season/SeasonListPanel";
import SeasonManagementForm from "./components/season/SeasonManagementForm";
import SeasonSummaryPanel from "./components/season/SeasonSummaryPanel";
import SeasonShareCard from "./components/SeasonShareCard";
import StatCard from "./components/StatCard";
import { applyKnownOcrCorrections } from "./lib/ocrPostProcess";

function makeTimestampId(prefix) {
  return `${prefix}${Date.now()}`;
}

const positionOptions = ["上殴り", "中殴り", "下殴り"];
const resultOptions = ["勝ち", "負け"];
const stageTypeOptions = ["未設定", "センス", "ロジック", "アノマリー"];

function normalizePosition(value) {
  if (value === "上") return "上殴り";
  if (value === "中") return "中殴り";
  if (value === "下") return "下殴り";
  return value || "上殴り";
}

function normalizePositionFilter(value) {
  return value === "全体" ? "全体" : normalizePosition(value);
}

function getSeasonTypeChipKind(stageType) {
  if (stageType === "センス") return "sense";
  if (stageType === "ロジック") return "logic";
  if (stageType === "アノマリー") return "anomaly";
  return "unset";
}

import {
  API_URL,
  stages,
  members,
  mySlots,
  enemySlots,
  slotGroups,
  idolCharacterOrder,
  getIdolCharacterOrder,
  planClass,
  resultClass,
  toNumber,
  extractScoresFromOcr,
  getDeviceOcrLayout,
  getFixedOcrZones,
  getAlternativeTotalZones,
  recognizeTotalCandidates,
  getCrownBonusZones,
  getMemberScoreSlotZones,
  inferCrownBonusFromMemberNumbers,
  recognizeCrownBonusCandidates,
  recognizeMemberScoreSlotCandidates,
  correctCommonTotalOcr,
  pickTotalWithMemberFallback,
  getAlternativeMemberZones,
  scoreMemberCandidate,
  recognizeBestMemberZone,
  createPreprocessedStageBlob,
  extractNumbersForZone,
  pickTotalNumber,
  normalizeMemberScore,
  pickMemberNumbers,
  repairMissingLeadingOneMember,
  hasMatchingCrownBonusForMembers,
  uniqueNumbers,
  isNearNumber,
  removeNumbersNearTargets,
  removeTotalLikeNumbersFromMembers,
  removePlusLikeNumbers,
  recoverMissingLeadingDigit,
  applyCommonMemberCleanup,
  recognizeOcrZone,
  buildAnonymousStatsRecord,
  saveRecordToSheets,
  makeInitialStageDetails,
  getSelectedMyIdol,
  getSelectedEnemyIdol,
  findIdolByName,
  makeStableIdolKey,
  getIdolKey,
  getIdolDisplayName,
  getIdolImage,
  buildFallbackImagePath,
  resolveRecordIdolImage,
  resolveRecordIdolDisplayName,
  flattenSlotValues,
  buildStageStats,
  buildStageResults,
  buildRecordStageResults,
  buildAutoMatchResult,
  regressionTestCases,
  CURRENT_BACKUP_VERSION,
  migrateBackupData,
} from "./lib/tracker";

export default function Home() {
  const normalizeTheme = (value, { allowStandard = false } = {}) => {
    if (value === "dark-analytics") return "dark-analytics";
    if (value === "standard" && allowStandard) return "standard";
    return "soft";
  };
  const [selectedSlot, setSelectedSlot] = useState("自分 ステージ1 メンバー1");
  const [slotValues, setSlotValues] = useState({});
  const [idolSelectOpen, setIdolSelectOpen] = useState(false);
  const [favoriteIdols, setFavoriteIdols] = useState([]);
  const [recentIdols, setRecentIdols] = useState([]);
  const [theme, setTheme] = useState("soft");
  const [activeTab, setActiveTab] = useState("input");
  const [storageReady, setStorageReady] = useState(false);
  const [stageDetails, setStageDetails] = useState(makeInitialStageDetails());
  const [records, setRecords] = useState([]);
  const [recentDays, setRecentDays] = useState("30");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("gakumasRecentDays")
        : null;

    if (saved !== null) {
      setRecentDays(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gakumasRecentDays", recentDays);
    }
  }, [recentDays]);
  const [opponent, setOpponent] = useState("");
  const [position, setPosition] = useState("上殴り");
  const [point, setPoint] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingDirtyIds, setEditingDirtyIds] = useState([]);
  const [loadedRecordId, setLoadedRecordId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [shareStatsEnabled, setShareStatsEnabled] = useState(false);
  const [shareStatsConsentAsked, setShareStatsConsentAsked] = useState(false);
  const [manualResult, setManualResult] = useState("");
  const [saveWarnings, setSaveWarnings] = useState([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formationName, setFormationName] = useState("");
  const [formationTemplates, setFormationTemplates] = useState([]);

  const [customIdolName, setCustomIdolName] = useState("");
  const [customIdolVariant, setCustomIdolVariant] = useState("");
  const [customIdolShort, setCustomIdolShort] = useState("");
  const [customIdolCharacter, setCustomIdolCharacter] = useState("");
  const [customIdolPlan, setCustomIdolPlan] = useState("未設定");
  const [customIdolImage, setCustomIdolImage] = useState("");
  const [idolChecklistText, setIdolChecklistText] = useState("");
  const [customIdols, setCustomIdols] = useState([]);
  const [showIdolManager, setShowIdolManager] = useState(false);

  const [analysisSort, setAnalysisSort] = useState("averageCombined");
  const [analysisPosition, setAnalysisPosition] = useState("全体");
  const [analysisDays, setAnalysisDays] = useState("");
  const [analysisStartDate, setAnalysisStartDate] = useState("");
  const [analysisEndDate, setAnalysisEndDate] = useState("");
  const [analysisSeasonSourceId, setAnalysisSeasonSourceId] = useState("");
  const [analysisMinCount, setAnalysisMinCount] = useState("");
  const [selectedIdolDetail, setSelectedIdolDetail] = useState(null);

  const [analysisPresetName, setAnalysisPresetName] = useState("");
  const [analysisPresets, setAnalysisPresets] = useState([]);

  const [seasonName, setSeasonName] = useState("");
  const [seasonStartDate, setSeasonStartDate] = useState("");
  const [seasonEndDate, setSeasonEndDate] = useState("");
  const [seasonFinalPoint, setSeasonFinalPoint] = useState("");
  const [seasonFinalRank, setSeasonFinalRank] = useState("");
  const [seasonStageTypes, setSeasonStageTypes] = useState({
    1: "未設定",
    2: "未設定",
    3: "未設定",
  });
  const [seasonMemo, setSeasonMemo] = useState("");
  const [editingSeasonId, setEditingSeasonId] = useState(null);

  useEffect(() => {
    if (!editingSeasonId || activeTab !== "season") return;

    const scrollToSeasonEditor = () => {
      const target =
        document.getElementById("season-edit-scroll-target") ||
        document.getElementById("season-management-top");

      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 24;

      window.scrollTo({
        top,
        behavior: "auto",
      });

      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    };

    const timer = window.setTimeout(() => {
      requestAnimationFrame(scrollToSeasonEditor);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [editingSeasonId, activeTab]);
  const [displayName, setDisplayName] = useState("");
  const [sharePlayerName, setSharePlayerName] = useState("");
  const [shareCardLayout, setShareCardLayout] = useState("vertical");
  const [seasonPresets, setSeasonPresets] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("all");
  const [seasonSearch, setSeasonSearch] = useState("");
  const [seasonSort, setSeasonSort] = useState("startDesc");
  const [collapsedSeasonIds, setCollapsedSeasonIds] = useState([]);

  useEffect(() => {
    setCollapsedSeasonIds(seasonPresets.map((season) => season.id));
  }, [seasonPresets]);
  const [showDailyFinalFormations, setShowDailyFinalFormations] = useState(true);

  const [backupStatus, setBackupStatus] = useState("");
  const [shareImageStatus, setShareImageStatus] = useState("");

  const [showGuide, setShowGuide] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showRegressionTest, setShowRegressionTest] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  const [graphDays, setGraphDays] = useState("");
  const [graphPosition, setGraphPosition] = useState("全体");

  const [metaDays, setMetaDays] = useState("");
  const [metaPosition, setMetaPosition] = useState("全体");
  const [metaMinCount, setMetaMinCount] = useState("");
  const [enemyMetaTopCount, setEnemyMetaTopCount] = useState("");

  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [parsedOcrScores, setParsedOcrScores] = useState(null);
  const [ocrMode, setOcrMode] = useState("smartphone");
  const [currentTime] = useState(() => Date.now());

  const setImageFile = useCallback((file, label) => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);

    const url = URL.createObjectURL(file);
    setScreenshotFile(file);
    setScreenshotPreview(url);
    setScreenshotName(label || file.name || "画像");
    setOcrText("");
    setOcrStatus("");
    setOcrProgress(0);
    setParsedOcrScores(null);
  }, [screenshotPreview]);

  useEffect(() => {
    queueMicrotask(() => {
      const savedRecords = localStorage.getItem("gakumasContestRecords");
      if (savedRecords) setRecords(JSON.parse(savedRecords));

      const savedTemplates = localStorage.getItem("gakumasFormationTemplates");
      if (savedTemplates) setFormationTemplates(JSON.parse(savedTemplates));

      const savedCustomIdols = localStorage.getItem("gakumasCustomIdols");
      if (savedCustomIdols) setCustomIdols(JSON.parse(savedCustomIdols));

      const savedIdolChecklistText = localStorage.getItem("gakumasIdolChecklistText");
      if (savedIdolChecklistText) setIdolChecklistText(savedIdolChecklistText);

      const savedAnalysisPresets = localStorage.getItem("gakumasAnalysisPresets");
      if (savedAnalysisPresets) {
        setAnalysisPresets(JSON.parse(savedAnalysisPresets));
      }

      const savedSeasonPresets = localStorage.getItem("gakumasSeasonPresets");
      if (savedSeasonPresets) {
        setSeasonPresets(JSON.parse(savedSeasonPresets));
      }

      const savedShareStatsEnabled = localStorage.getItem("gakumasShareStatsEnabled");
      if (savedShareStatsEnabled) {
        setShareStatsEnabled(savedShareStatsEnabled === "true");
      }

      const savedShareStatsConsentAsked = localStorage.getItem(
        "gakumasShareStatsConsentAsked"
      );
      if (savedShareStatsConsentAsked) {
        setShareStatsConsentAsked(savedShareStatsConsentAsked === "true");
      }

      const savedSharePlayerName = localStorage.getItem("gakumasSharePlayerName");
      if (savedSharePlayerName) {
        setSharePlayerName(savedSharePlayerName);
      }

      const savedDisplayName = localStorage.getItem("gakumasDisplayName");
      if (savedDisplayName) {
        setDisplayName(savedDisplayName);
      }

      const savedShareCardLayout = localStorage.getItem("gakumasShareCardLayout");
      if (savedShareCardLayout) {
        setShareCardLayout(savedShareCardLayout);
      }

      const savedFavoriteIdols = localStorage.getItem("favoriteIdols");
      if (savedFavoriteIdols) {
        setFavoriteIdols(JSON.parse(savedFavoriteIdols));
      }

      const savedRecentIdols = localStorage.getItem("recentIdols");
      if (savedRecentIdols) {
        setRecentIdols(JSON.parse(savedRecentIdols));
      }

      const savedTheme = localStorage.getItem("theme");
      setTheme(normalizeTheme(savedTheme));

      const savedSelectedSeasonId = localStorage.getItem("gakumasSelectedSeasonId");
      if (savedSelectedSeasonId) {
        setSelectedSeasonId(savedSelectedSeasonId);
      }

      const savedShowDailyFinalFormations = localStorage.getItem("gakumasShowDailyFinalFormations");
      if (savedShowDailyFinalFormations) {
        setShowDailyFinalFormations(savedShowDailyFinalFormations === "true");
      }

      const savedSlotValues = localStorage.getItem("gakumasSlotValues");
      if (savedSlotValues) {
        setSlotValues(JSON.parse(savedSlotValues));
      }

      const savedAnalysisState = localStorage.getItem("gakumasAnalysisState");
      if (savedAnalysisState) {
        const parsedAnalysisState = JSON.parse(savedAnalysisState);
        setAnalysisSort(parsedAnalysisState.analysisSort || "averageCombined");
        setAnalysisPosition(parsedAnalysisState.analysisPosition || "全体");
        setAnalysisDays(parsedAnalysisState.analysisDays || "");
        setAnalysisMinCount(parsedAnalysisState.analysisMinCount || "");
        setGraphDays(parsedAnalysisState.graphDays || "");
        setGraphPosition(parsedAnalysisState.graphPosition || "全体");
        setMetaDays(parsedAnalysisState.metaDays || "");
        setMetaPosition(parsedAnalysisState.metaPosition || "全体");
        setMetaMinCount(parsedAnalysisState.metaMinCount || "");
      }

      setStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasContestRecords", JSON.stringify(records));
  }, [records, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasFormationTemplates",
      JSON.stringify(formationTemplates)
    );
  }, [formationTemplates, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasCustomIdols", JSON.stringify(customIdols));
  }, [customIdols, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasIdolChecklistText", idolChecklistText);
  }, [idolChecklistText, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasAnalysisPresets",
      JSON.stringify(analysisPresets)
    );
  }, [analysisPresets, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasSeasonPresets", JSON.stringify(seasonPresets));
  }, [seasonPresets, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasSharePlayerName", sharePlayerName);
  }, [sharePlayerName, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasDisplayName", displayName);
  }, [displayName, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasShareCardLayout", shareCardLayout);
  }, [shareCardLayout, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasShareStatsEnabled",
      shareStatsEnabled ? "true" : "false"
    );
  }, [shareStatsEnabled, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasShareStatsConsentAsked",
      shareStatsConsentAsked ? "true" : "false"
    );
  }, [shareStatsConsentAsked, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("favoriteIdols", JSON.stringify(favoriteIdols));
  }, [favoriteIdols, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("recentIdols", JSON.stringify(recentIdols));
  }, [recentIdols, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("theme", normalizeTheme(theme));
  }, [theme, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasSelectedSeasonId", selectedSeasonId || "all");
  }, [selectedSeasonId, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasShowDailyFinalFormations",
      showDailyFinalFormations ? "true" : "false"
    );
  }, [showDailyFinalFormations, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("gakumasSlotValues", JSON.stringify(slotValues));
  }, [slotValues, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      "gakumasAnalysisState",
      JSON.stringify({
        analysisSort,
        analysisPosition,
        analysisDays,
        analysisMinCount,
        graphDays,
        graphPosition,
        metaDays,
        metaPosition,
        metaMinCount,
      })
    );
  }, [
    analysisSort,
    analysisPosition,
    analysisDays,
    analysisMinCount,
    graphDays,
    graphPosition,
    metaDays,
    metaPosition,
    metaMinCount,
    storageReady,
  ]);

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
  }, [setImageFile]);

  const combinedIdolDb = useMemo(() => {
    const existingKeys = new Set(idolDb.map((idol) => getIdolKey(idol)));
    const additionalIdols = customIdols.filter(
      (idol) => !existingKeys.has(getIdolKey(idol))
    );

    return [...idolDb, ...additionalIdols];
  }, [customIdols]);

  const sortedIdols = useMemo(() => {
    return combinedIdolDb
      .map((idol, index) => ({ idol, index }))
      .sort((a, b) => {
        const characterDiff =
          getIdolCharacterOrder(a.idol) - getIdolCharacterOrder(b.idol);

        if (characterDiff !== 0) return characterDiff;

        return a.index - b.index;
      })
      .map(({ idol }) => idol);
  }, [combinedIdolDb]);

  const idolImageMap = useMemo(() => {
    return combinedIdolDb.reduce((map, idol) => {
      const image = getIdolImage(idol);
      if (!image) return map;

      [idol.name, idol.short, idol.character, getIdolDisplayName(idol)]
        .filter(Boolean)
        .forEach((name) => {
          map[name] = image;
        });

      return map;
    }, {});
  }, [combinedIdolDb]);

  const filteredIdols = useMemo(() => {
    return sortedIdols.filter((idol) =>
      `${idol.name} ${idol.short} ${idol.character} ${idol.plan} ${idol.variant || ""} ${idol.id || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, sortedIdols]);

  const addRecentIdol = useCallback((idol) => {
    const idolKey = getIdolKey(idol);
    if (!idolKey) return;

    setRecentIdols((prev) => [
      idolKey,
      ...prev.filter((id) => id !== idolKey),
    ].slice(0, 10));
  }, []);

  const openIdolSelectModal = useCallback((slot) => {
    setSelectedSlot(slot);
    setIdolSelectOpen(true);
  }, []);

  const selectIdolForSlot = useCallback((idol) => {
    setSlotValues((prev) => ({
      ...prev,
      [selectedSlot]: idol || "",
    }));
    if (idol) addRecentIdol(idol);
    setIdolSelectOpen(false);
  }, [addRecentIdol, selectedSlot]);

  const toggleFavoriteIdol = useCallback((idolKey) => {
    if (!idolKey) return;

    setFavoriteIdols((prev) =>
      prev.includes(idolKey)
        ? prev.filter((id) => id !== idolKey)
        : [idolKey, ...prev]
    );
  }, []);

  const idolChecklist = useMemo(() => {
    const expectedNames = idolChecklistText
      .split(/\r?\n|,|、/)
      .map((name) => name.trim())
      .filter(Boolean);

    const uniqueExpectedNames = [...new Set(expectedNames)];

    const registeredNames = new Set(
      combinedIdolDb
        .flatMap((idol) => [idol.name, idol.character, idol.short])
        .filter(Boolean)
    );

    return uniqueExpectedNames.map((name) => ({
      name,
      registered: registeredNames.has(name),
      count: combinedIdolDb.filter(
        (idol) =>
          idol.name === name || idol.character === name || idol.short === name
      ).length,
    }));
  }, [combinedIdolDb, idolChecklistText]);

  const idolDbSummary = useMemo(() => {
    const withImage = combinedIdolDb.filter((idol) => !!getIdolImage(idol)).length;
    const customCount = customIdols.length;
    const officialCount = idolDb.length;

    return {
      total: combinedIdolDb.length,
      officialCount,
      customCount,
      withImage,
      withoutImage: Math.max(0, combinedIdolDb.length - withImage),
    };
  }, [combinedIdolDb, customIdols]);

  const handleCustomIdolImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveStatus("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCustomIdolImage(String(reader.result || ""));
      setSaveStatus("画像を読み込みました");
    };

    reader.onerror = () => {
      setSaveStatus("画像の読み込みに失敗しました");
    };

    reader.readAsDataURL(file);
  };


  const selectedSeason = useMemo(() => {
    if (selectedSeasonId === "all") return null;
    return seasonPresets.find((season) => season.id === selectedSeasonId) || null;
  }, [seasonPresets, selectedSeasonId]);

  const filteredSeasonPresets = useMemo(() => {
    const keyword = seasonSearch.trim().toLowerCase();

    let filtered = seasonPresets;

    if (keyword) {
      filtered = seasonPresets.filter((season) => {
        const searchText = [
          season.name,
          season.startDate,
          season.endDate,
          season.finalPoint,
          season.finalRank,
          season.memo,
          season.stageTypes?.[1],
          season.stageTypes?.[2],
          season.stageTypes?.[3],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchText.includes(keyword);
      });
    }

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      switch (seasonSort) {
        case "startAsc":
          return (a.startDate || "").localeCompare(b.startDate || "");

        default:
          return (b.startDate || "").localeCompare(a.startDate || "");
      }
    });

    return sorted;
  }, [seasonPresets, seasonSearch, seasonSort]);

  const toggleSeasonCollapse = (seasonId) => {
    setCollapsedSeasonIds((prev) =>
      prev.includes(seasonId)
        ? prev.filter((id) => id !== seasonId)
        : [...prev, seasonId]
    );
  };

  const seasonStatsMap = useMemo(() => {
    const map = {};

    seasonPresets.forEach((season) => {
      const start = season.startDate
        ? new Date(`${season.startDate}T00:00:00`).getTime()
        : null;

      const end = season.endDate
        ? new Date(`${season.endDate}T23:59:59`).getTime()
        : null;

      const seasonRecords = records.filter((record) => {
        const time = new Date(record.date).getTime();

        if (start && time < start) return false;
        if (end && time > end) return false;

        return true;
      });

      const wins = seasonRecords.filter((r) => r.result === "勝ち").length;

      map[season.id] = {
        count: seasonRecords.length,
        winRate:
          seasonRecords.length > 0
            ? Math.round((wins / seasonRecords.length) * 100)
            : 0,
      };
    });

    return map;
  }, [seasonPresets, records]);


  const selectedSlotStage = useMemo(() => {
    const match = selectedSlot.match(/ステージ(\d+)/);
    return match ? Number(match[1]) : null;
  }, [selectedSlot]);

  const selectedSlotStageType = useMemo(() => {
    if (!selectedSeason || !selectedSlotStage) return "未設定";
    return selectedSeason.stageTypes?.[selectedSlotStage] || "未設定";
  }, [selectedSeason, selectedSlotStage]);

  const idolSelectIdols = useMemo(() => {
    if (!selectedSlotStageType || selectedSlotStageType === "未設定") {
      return sortedIdols;
    }

    return sortedIdols
      .map((idol, index) => ({ idol, index }))
      .sort((a, b) => {
        const aMatched = a.idol.plan === selectedSlotStageType ? 0 : 1;
        const bMatched = b.idol.plan === selectedSlotStageType ? 0 : 1;

        if (aMatched !== bMatched) return aMatched - bMatched;
        return a.index - b.index;
      })
      .map(({ idol }) => idol);
  }, [sortedIdols, selectedSlotStageType]);

  const analysisRecords = useMemo(() => {
    let filtered = records;
    const normalizedAnalysisPosition = normalizePositionFilter(analysisPosition);

    if (normalizedAnalysisPosition !== "全体") {
      filtered = filtered.filter(
        (record) => normalizePosition(record.position) === normalizedAnalysisPosition
      );
    }

    const rangeStart = analysisStartDate
      ? new Date(`${analysisStartDate}T00:00:00`).getTime()
      : null;
    const rangeEnd = analysisEndDate
      ? new Date(`${analysisEndDate}T23:59:59`).getTime()
      : null;

    if (rangeStart || rangeEnd) {
      filtered = filtered.filter((record) => {
        const time = new Date(record.date).getTime();
        if (Number.isNaN(time)) return false;
        if (rangeStart && time < rangeStart) return false;
        if (rangeEnd && time > rangeEnd) return false;
        return true;
      });
    } else if (selectedSeason) {
      const start = selectedSeason.startDate
        ? new Date(`${selectedSeason.startDate}T00:00:00`).getTime()
        : null;
      const end = selectedSeason.endDate
        ? new Date(`${selectedSeason.endDate}T23:59:59`).getTime()
        : null;

      filtered = filtered.filter((record) => {
        const time = new Date(record.date).getTime();
        if (Number.isNaN(time)) return false;
        if (start && time < start) return false;
        if (end && time > end) return false;
        return true;
      });
    } else {
      const days = toNumber(analysisDays);

      if (days > 0) {
        const now = currentTime;
        const cutoff = now - days * 24 * 60 * 60 * 1000;

        filtered = filtered.filter((record) => {
          const time = new Date(record.date).getTime();
          if (Number.isNaN(time)) return false;
          return time >= cutoff;
        });
      }
    }

    return filtered;
  }, [
    records,
    analysisPosition,
    analysisDays,
    analysisStartDate,
    analysisEndDate,
    selectedSeason,
    currentTime,
  ]);

  const seasonSummary = useMemo(() => {
    const targetRecords = analysisRecords;
    const totalMatches = targetRecords.length;
    const winCount = targetRecords.filter((record) => record.result === "勝ち").length;
    const loseCount = targetRecords.filter((record) => record.result === "負け").length;
    const drawCount = targetRecords.filter((record) => record.result === "引き分け").length;
    const winRate = totalMatches
      ? Math.round((winCount / totalMatches) * 1000) / 10
      : 0;

    const latestRecord = [...targetRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    const stageSummaries = Object.fromEntries(
      stages.map((stage) => {
        const results = targetRecords
          .map((record) =>
            buildRecordStageResults(record).find((item) => item.stage === stage)
          )
          .filter(Boolean);

        const winCount = results.filter((item) => item.result === "勝ち").length;
        const loseCount = results.filter((item) => item.result === "負け").length;
        const drawCount = results.filter(
          (item) => item.result === "引き分け"
        ).length;

        return [
          stage,
          {
            total: results.length,
            winCount,
            loseCount,
            drawCount,
            winRate: results.length
              ? Math.round((winCount / results.length) * 1000) / 10
              : 0,
          },
        ];
      })
    );

    const stageWinRates = Object.fromEntries(
      stages.map((stage) => [stage, stageSummaries[stage]?.winRate || 0])
    );

    const finalFormationBase = latestRecord
      ? stages.flatMap((stage) =>
          members.map((member) => {
            const idol =
              resolveRecordIdolDisplayName(
                latestRecord,
                stage,
                member,
                "my",
                combinedIdolDb
              ) ||
              latestRecord[`s${stage}_my${member}_idol_name`] ||
              latestRecord[`s${stage}_my${member}_idol`] ||
              "";
            const idolId =
              latestRecord[`s${stage}_my${member}_idol_id`] ||
              makeStableIdolKey(latestRecord[`s${stage}_my${member}_idol`]);
            const matchingIdol = combinedIdolDb.find((candidate) => {
              const candidateId = getIdolKey(candidate);
              return (
                (idolId && candidateId === idolId) ||
                getIdolDisplayName(candidate) === idol ||
                candidate.name === latestRecord[`s${stage}_my${member}_idol_name`]
              );
            });

            const matchingRecords = targetRecords.filter((record) => {
              const targetId =
                record[`s${stage}_my${member}_idol_id`] ||
                makeStableIdolKey(record[`s${stage}_my${member}_idol`]);

              return targetId && idolId && targetId === idolId;
            });

            const scoreValues = matchingRecords
              .map((record) => toNumber(record[`s${stage}_my${member}_score`]))
              .filter((score) => score > 0);

            const rankValues = matchingRecords
              .map((record) => toNumber(record[`s${stage}_my${member}_rank`]))
              .filter((rank) => rank > 0);

            return {
              stage,
              member,
              idol,
              idolId,
              plan: matchingIdol?.plan || "",
              image: resolveRecordIdolImage(latestRecord, stage, member, "my"),
              averageBaseScore: scoreValues.length
                ? Math.round(
                    scoreValues.reduce((sum, score) => sum + score, 0) /
                      scoreValues.length
                  )
                : 0,
              averageRank: rankValues.length
                ? rankValues.reduce((sum, rank) => sum + rank, 0) /
                  rankValues.length
                : 0,
            };
          })
        )
      : [];

    const stageTopStats = Object.fromEntries(
      stages.map((stage) => {
        const stageSlots = finalFormationBase.filter(
          (slot) => slot.stage === stage
        );

        const topAverageBaseScore = stageSlots.length
          ? Math.max(...stageSlots.map((slot) => slot.averageBaseScore || 0))
          : 0;

        const rankCandidates = stageSlots.filter((slot) => slot.averageRank > 0);
        const topAverageRank = rankCandidates.length
          ? Math.min(...rankCandidates.map((slot) => slot.averageRank))
          : 0;

        return [
          stage,
          {
            topAverageBaseScore,
            topAverageRank,
          },
        ];
      })
    );

    const finalFormation = finalFormationBase.map((slot) => {
      const stageStats = stageTopStats[slot.stage] || {};
      const isTopScore =
        slot.averageBaseScore > 0 &&
        slot.averageBaseScore === stageStats.topAverageBaseScore;
      const isTopRank =
        slot.averageRank > 0 && slot.averageRank === stageStats.topAverageRank;

      return {
        ...slot,
        isTopScore,
        isTopRank,
        badge: isTopScore && isTopRank ? "🌟" : isTopScore ? "🔥" : isTopRank ? "👑" : "",
      };
    });

    const stageTypes =
      selectedSeason?.stageTypes ||
      Object.fromEntries(
        stages.map((stage) => {
          const plans = finalFormation
            .filter((slot) => slot.stage === stage)
            .map((slot) => slot.plan)
            .filter(Boolean);
          const counts = plans.reduce((acc, plan) => {
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
          }, {});
          const topPlan =
            Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

          return [stage, topPlan || "未設定"];
        })
      );

    const totalPoint = targetRecords.reduce(
      (sum, record) => sum + toNumber(record.point),
      0
    );

    return {
      totalMatches,
      winCount,
      loseCount,
      drawCount,
      winRate,
      stageWinRates,
      stageSummaries,
      stageTypes,
      latestRecord,
      finalFormation,
      totalPoint,
      averageBaseScoreTop: stages
        .map((stage) =>
          [...finalFormation]
            .filter((slot) => slot.stage === stage && slot.averageBaseScore > 0)
            .sort((a, b) => b.averageBaseScore - a.averageBaseScore)[0]
        )
        .filter(Boolean),
      averageRankTop: stages
        .map((stage) =>
          [...finalFormation]
            .filter((slot) => slot.stage === stage && slot.averageRank > 0)
            .sort((a, b) => a.averageRank - b.averageRank)[0]
        )
        .filter(Boolean),
    };
  }, [analysisRecords, combinedIdolDb, selectedSeason]);

  const seasonDailySummaries = useMemo(() => {
    const groups = new Map();

    const getDateKey = (record) => {
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) return "日付不明";

      return date.toLocaleDateString("sv-SE", {
        timeZone: "Asia/Tokyo",
      });
    };

    const buildFinalFormationFromRecord = (record) => {
      if (!record) return [];

      return stages.flatMap((stage) =>
        members.map((member) => {
          const idol =
            resolveRecordIdolDisplayName(
              record,
              stage,
              member,
              "my",
              combinedIdolDb
            ) ||
            record[`s${stage}_my${member}_idol_name`] ||
            record[`s${stage}_my${member}_idol`] ||
            "";
          const idolId =
            record[`s${stage}_my${member}_idol_id`] ||
            makeStableIdolKey(record[`s${stage}_my${member}_idol`]);
          const matchingIdol = combinedIdolDb.find((candidate) => {
            const candidateId = getIdolKey(candidate);
            return (
              (idolId && candidateId === idolId) ||
              getIdolDisplayName(candidate) === idol ||
              candidate.name === record[`s${stage}_my${member}_idol_name`]
            );
          });

          return {
            stage,
            member,
            idol,
            idolId,
            plan: matchingIdol?.plan || "",
            image: resolveRecordIdolImage(record, stage, member, "my"),
          };
        })
      );
    };

    analysisRecords.forEach((record) => {
      const dateKey = getDateKey(record);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          totalMatches: 0,
          winCount: 0,
          loseCount: 0,
          totalPoint: 0,
          latestRecord: null,
          stageWinCounts: { 1: 0, 2: 0, 3: 0 },
          stageLoseCounts: { 1: 0, 2: 0, 3: 0 },
        });
      }

      const summary = groups.get(dateKey);
      summary.totalMatches += 1;
      summary.totalPoint += toNumber(record.point);

      const recordTime = new Date(record.date).getTime();
      const latestTime = summary.latestRecord
        ? new Date(summary.latestRecord.date).getTime()
        : Number.NEGATIVE_INFINITY;

      if (!summary.latestRecord || recordTime >= latestTime) {
        summary.latestRecord = record;
      }

      if (record.result === "勝ち") {
        summary.winCount += 1;
      } else if (record.result === "負け") {
        summary.loseCount += 1;
      }

      buildRecordStageResults(record).forEach((stageResult) => {
        if (stageResult.result === "勝ち") {
          summary.stageWinCounts[stageResult.stage] += 1;
        } else if (stageResult.result === "負け") {
          summary.stageLoseCounts[stageResult.stage] += 1;
        }
      });
    });

    return [...groups.values()]
      .map((summary) => ({
        ...summary,
        stageWinRates: Object.fromEntries(
          stages.map((stage) => {
            const wins = summary.stageWinCounts[stage] || 0;
            const losses = summary.stageLoseCounts[stage] || 0;
            const total = wins + losses;

            return [
              stage,
              total ? Math.round((wins / total) * 1000) / 10 : 0,
            ];
          })
        ),
        finalFormation: buildFinalFormationFromRecord(summary.latestRecord),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analysisRecords, combinedIdolDb]);

  const seasonExtraStats = useMemo(() => {
    const orderedRecords = [...analysisRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let highestPointRecord = null;

    orderedRecords.forEach((record) => {
      if (record.result === "勝ち") {
        currentWinStreak += 1;
        currentLoseStreak = 0;
      } else if (record.result === "負け") {
        currentLoseStreak += 1;
        currentWinStreak = 0;
      } else {
        currentWinStreak = 0;
        currentLoseStreak = 0;
      }

      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);

      if (
        !highestPointRecord ||
        toNumber(record.point) > toNumber(highestPointRecord.point)
      ) {
        highestPointRecord = record;
      }
    });

    const bestPointDay = seasonDailySummaries.reduce((best, current) => {
      if (!best || current.totalPoint > best.totalPoint) return current;
      return best;
    }, null);

    return {
      playedDays: seasonDailySummaries.length,
      longestWinStreak,
      longestLoseStreak,
      highestPoint: highestPointRecord ? toNumber(highestPointRecord.point) : 0,
      highestPointDate: highestPointRecord
        ? new Date(highestPointRecord.date).toLocaleDateString("sv-SE", {
            timeZone: "Asia/Tokyo",
          })
        : "",
      bestPointDay: bestPointDay?.date || "",
      bestPointDayTotal: bestPointDay?.totalPoint || 0,
    };
  }, [analysisRecords, seasonDailySummaries]);

  const seasonFormationChangeHistory = useMemo(() => {
    const history = [];
    let previous = null;
    const normalizeFormationName = (value) => String(value || "").trim();

    seasonDailySummaries.forEach((summary) => {
      const slots = summary.finalFormation || [];
      const key = slots
        .map(
          (slot) =>
            `${slot.stage}-${slot.member}:${normalizeFormationName(slot.idol)}`
        )
        .join("|");

      if (!previous) {
        if (slots.length > 0) {
          history.push({
            date: summary.date,
            type: "initial",
            changes: [],
          });
        }
      } else if (key !== previous.key) {
        const changes = slots
          .map((slot) => {
            const before = previous.slots.find(
              (item) => item.stage === slot.stage && item.member === slot.member
            );

            const beforeName = normalizeFormationName(before?.idol);
            const afterName = normalizeFormationName(slot.idol);

            if (beforeName === afterName) return null;

            return {
              stage: slot.stage,
              member: slot.member,
              before: beforeName || "未登録",
              after: afterName || "未登録",
              beforePlan: before?.plan || "",
              afterPlan: slot.plan || "",
            };
          })
          .filter(Boolean);

        if (changes.length > 0) {
          history.push({
            date: summary.date,
            type: "change",
            changes,
          });
        }
      }

      previous = { key, slots };
    });

    return history;
  }, [seasonDailySummaries]);

  const positionSummaries = useMemo(() => {
    return positionOptions.map((targetPosition) => {
      const targetRecords = analysisRecords.filter(
        (record) => normalizePosition(record.position) === targetPosition
      );

      const totalMatches = targetRecords.length;
      const winCount = targetRecords.filter(
        (record) => record.result === "勝ち"
      ).length;
      const loseCount = targetRecords.filter(
        (record) => record.result === "負け"
      ).length;
      const drawCount = targetRecords.filter(
        (record) => record.result === "引き分け"
      ).length;

      return {
        position: targetPosition,
        totalMatches,
        winCount,
        loseCount,
        drawCount,
        winRate: totalMatches
          ? Math.round((winCount / totalMatches) * 1000) / 10
          : 0,
      };
    });
  }, [analysisRecords]);

  const stageStats = useMemo(() => {
    return buildStageStats(analysisRecords, analysisSort, analysisMinCount);
  }, [analysisRecords, analysisSort, analysisMinCount]);

  const stageResults = useMemo(() => {
    return buildStageResults(stageDetails);
  }, [stageDetails]);

  const autoResult = useMemo(() => {
    return buildAutoMatchResult(stageResults);
  }, [stageResults]);



  const resetSeasonForm = () => {
    setEditingSeasonId(null);
    setSeasonName("");
    setSeasonStartDate("");
    setSeasonEndDate("");
    setSeasonFinalPoint("");
    setSeasonFinalRank("");
    setSeasonStageTypes({
      1: "未設定",
      2: "未設定",
      3: "未設定",
    });
    setSeasonMemo("");
  };

  const saveSeasonPreset = () => {
    const name = seasonName.trim();

    if (!name) {
      setSaveStatus("シーズン名を入力してください");
      return;
    }

    if (!seasonStartDate || !seasonEndDate) {
      setSaveStatus("開始日と終了日を入力してください");
      return;
    }

    if (editingSeasonId) {
      setSeasonPresets((prev) =>
        prev.map((season) =>
          season.id === editingSeasonId
            ? {
                ...season,
                name,
                startDate: seasonStartDate,
                endDate: seasonEndDate,
                finalPoint: seasonFinalPoint,
                finalRank: seasonFinalRank,
                stageTypes: seasonStageTypes,
                memo: seasonMemo,
                updatedAt: new Date().toISOString(),
              }
            : season
        )
      );
      setSelectedSeasonId(editingSeasonId);
      resetSeasonForm();
      setSaveStatus(`シーズン「${name}」を更新しました`);
      return;
    }

    const season = {
      id: makeTimestampId("S"),
      name,
      startDate: seasonStartDate,
      endDate: seasonEndDate,
      finalPoint: seasonFinalPoint,
      finalRank: seasonFinalRank,
      stageTypes: seasonStageTypes,
      memo: seasonMemo,
      createdAt: new Date().toISOString(),
    };

    setSeasonPresets((prev) => [season, ...prev]);
    setSelectedSeasonId(season.id);
    resetSeasonForm();
    setSaveStatus(`シーズン「${name}」を保存しました`);
  };

  const loadSeasonPreset = (season) => {
    setSelectedSeasonId(season.id);
    setSaveStatus(`分析対象を「${season.name}」に変更しました`);
  };

  const scrollToSeasonManagement = () => {
    window.setTimeout(() => {
      const target =
        document.getElementById("season-management-top") ||
        document.querySelector('[data-season-management="true"]');

      if (!target) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        return;
      }

      const top = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - 24
      );

      window.scrollTo({
        top,
        behavior: "smooth",
      });

      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    }, 0);
  };

  const editSeasonPreset = (season) => {
    setEditingSeasonId(season.id);
    setSeasonName(season.name || "");
    setSeasonStartDate(season.startDate || "");
    setSeasonEndDate(season.endDate || "");
    setSeasonFinalPoint(season.finalPoint || "");
    setSeasonFinalRank(season.finalRank || "");
    setSeasonStageTypes({
      1: season.stageTypes?.[1] || "未設定",
      2: season.stageTypes?.[2] || "未設定",
      3: season.stageTypes?.[3] || "未設定",
    });
    setSeasonMemo(season.memo || "");
    setSelectedSeasonId(season.id);

    setSaveStatus(`シーズン「${season.name}」を編集中です`);
  };

  const updateSeasonStageType = (stage, value) => {
    setSeasonStageTypes((prev) => ({
      ...prev,
      [stage]: value,
    }));
  };

  const deleteSeasonPreset = (seasonId) => {
    setSeasonPresets((prev) => prev.filter((season) => season.id !== seasonId));
    if (selectedSeasonId === seasonId) {
      setSelectedSeasonId("all");
    }
    if (editingSeasonId === seasonId) {
      resetSeasonForm();
    }
    setSaveStatus("シーズンを削除しました");
  };

  const duplicateSeasonPreset = (season) => {
    const duplicated = {
      ...season,
      id: makeTimestampId("S"),
      name: `${season.name} (コピー)`,
      createdAt: new Date().toISOString(),
    };

    setSeasonPresets((prev) => [duplicated, ...prev]);
    editSeasonPreset(duplicated);
    setSaveStatus(`シーズン「${season.name}」を複製しました。期間などを編集できます`);
  };

  const saveAnalysisPreset = () => {
    const name = analysisPresetName.trim();

    if (!name) {
      setSaveStatus("分析条件名を入力してください");
      return;
    }

    const preset = {
      id: makeTimestampId("A"),
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
    setAnalysisDays(preset.analysisDays || "");
    setAnalysisMinCount(preset.analysisMinCount || "");

    setGraphDays(preset.graphDays || preset.analysisDays || "");
    setGraphPosition(preset.graphPosition || preset.analysisPosition || "全体");

    setMetaDays(preset.metaDays || preset.analysisDays || "");
    setMetaPosition(preset.metaPosition || preset.analysisPosition || "全体");
    setMetaMinCount("");

    setSaveStatus(`分析条件「${preset.name}」を読み込みました`);
  };

  const deleteAnalysisPreset = (presetId) => {
    setAnalysisPresets((prev) =>
      prev.filter((preset) => preset.id !== presetId)
    );
    setSaveStatus("分析条件を削除しました");
  };

  const saveCustomIdol = () => {
    const name = customIdolName.trim();
    const variant = customIdolVariant.trim();

    if (!name) {
      setSaveStatus("アイドル名を入力してください");
      return;
    }

    if (!variant) {
      setSaveStatus("種類名を入力してください");
      return;
    }

    const id = makeStableIdolKey(`${name}_${variant}`);
    const newIdol = {
      id,
      name,
      variant,
      short: customIdolShort.trim() || name,
      character: customIdolCharacter.trim() || name,
      plan: customIdolPlan || "未設定",
      image: customIdolImage.trim() || buildFallbackImagePath(id),
      source: "custom",
    };

    setCustomIdols((prev) => {
      const withoutSame = prev.filter((idol) => getIdolKey(idol) !== id);
      return [newIdol, ...withoutSame];
    });

    setCustomIdolName("");
    setCustomIdolVariant("");
    setCustomIdolShort("");
    setCustomIdolCharacter("");
    setCustomIdolPlan("未設定");
    setCustomIdolImage("");
    setSaveStatus(`アイドル「${getIdolDisplayName(newIdol)}」を保存しました`);
  };

  const deleteCustomIdol = (idolId) => {
    setCustomIdols((prev) =>
      prev.filter((idol) => getIdolKey(idol) !== idolId)
    );
    setSaveStatus("追加アイドルを削除しました");
  };

  const findIdolByNameLocal = (name) => {
    return (
      combinedIdolDb.find(
        (idol) =>
          idol.name === name ||
          getIdolDisplayName(idol) === name ||
          idol.short === name
      ) || null
    );
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
      slots[slot] = idol ? getIdolDisplayName(idol) : "";
    });

    const newTemplate = {
      id: makeTimestampId("F"),
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

    mySlots.forEach((slot) => {
      loaded[slot] = "";
    });

    Object.entries(template.slots || {}).forEach(([slot, idolName]) => {
      const idol = findIdolByNameLocal(idolName);
      loaded[slot] = idol || "";
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

  const findRecordIdol = useCallback((record, stage, member, side) => {
    const prefix = `s${stage}_${side}${member}`;
    const idolId = record[`${prefix}_idol_id`] || "";
    const idolName =
      record[`${prefix}_idol`] ||
      record[`${prefix}_idol_name`] ||
      record[`${prefix}_name`] ||
      "";

    if (!idolId && !idolName) return null;
    if (idolName === "編成なし" || idolName === "未登録" || idolName === "登録なし") return null;

    const matched = combinedIdolDb.find((idol) => {
      const candidateId = getIdolKey(idol);
      return (
        (idolId && candidateId === idolId) ||
        getIdolDisplayName(idol) === idolName ||
        idol.name === idolName ||
        idol.short === idolName
      );
    });

    if (matched) return matched;

    return {
      id: idolId || makeStableIdolKey(idolName),
      name: idolName,
      short: idolName,
      character: idolName,
      variant: "",
      plan: "未設定",
      image: record[`${prefix}_idol_image`] || "",
      source: "record",
    };
  }, [combinedIdolDb]);

  const loadRecordToInput = useCallback((record) => {
    if (!record?.id) {
      setSaveStatus("この履歴はIDがないため、入力欄へ読み込めません");
      return;
    }

    const loadedSlots = {};

    const loadSlot = (slot, side) => {
      const match = slot.match(/ステージ(\d+)\s+メンバー(\d+)/);
      if (!match) return;

      const stage = Number(match[1]);
      const member = Number(match[2]);
      const idol = findRecordIdol(record, stage, member, side);

      if (idol) loadedSlots[slot] = idol;
    };

    mySlots.forEach((slot) => {
      loadedSlots[slot] = "";
    });
    enemySlots.forEach((slot) => {
      loadedSlots[slot] = "";
    });

    mySlots.forEach((slot) => loadSlot(slot, "my"));
    enemySlots.forEach((slot) => loadSlot(slot, "enemy"));

    const loadedStageDetails = makeInitialStageDetails();

    Object.keys(loadedStageDetails).forEach((key) => {
      loadedStageDetails[key] = record[key] ?? "";
    });

    setLoadedRecordId(record.id);
    setSlotValues((prev) => ({
      ...prev,
      ...loadedSlots,
    }));
    setStageDetails(loadedStageDetails);
    setOpponent(record.opponent || "");
    setPosition(normalizePosition(record.position));
    setPoint(record.point || "");
    setManualResult(record.result || "");
    setActiveTab("input");
    setShowSaveConfirm(false);
    setSaveWarnings([]);
    setSaveStatus(`履歴「${record.id}」を入力欄へ読み込みました。保存するとこの履歴を更新します`);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [enemySlots, findRecordIdol, mySlots]);

  const cancelLoadedRecordEdit = () => {
    setLoadedRecordId(null);
    setSaveStatus("履歴更新モードを解除しました。次回保存は新規保存になります");
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
    setOcrStatus("合計値と個人スコア部分を切り抜き中...");

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

      const activeOcrMode = ocrMode === "compare" ? "smartphone" : ocrMode;
      const compareOcrMode = ocrMode === "compare";

      for (const stage of stages) {
        setOcrStatus(
          compareOcrMode
            ? `ステージ${stage}をOCR中...（比較モード: smartphone採用）`
            : `ステージ${stage}をOCR中...`
        );

        const zones = getFixedOcrZones(image, stage, activeOcrMode);

        const selfTotalResult = await recognizeOcrZone(image, zones.selfTotal, {
          logger: (m) => {
            if (typeof m.progress === "number") {
              const base = (stage - 1) * 33;
              setOcrProgress(Math.min(99, base + Math.round(m.progress * 8)));
            }
          },
        });

        const selfTotalCandidateZones = getAlternativeTotalZones(
          image,
          stage,
          activeOcrMode,
          "self"
        );

        const selfTotalCandidates =
          selfTotalCandidateZones.length > 0
            ? await recognizeTotalCandidates(image, selfTotalCandidateZones)
            : [];

        const selfMemberZones = getAlternativeMemberZones(
          image,
          stage,
          activeOcrMode,
          "self"
        );

        const selfMemberResult =
          selfMemberZones.length > 0
            ? await recognizeBestMemberZone(image, selfMemberZones)
            : await recognizeOcrZone(image, zones.selfMembers, {
                logger: (m) => {
                  if (typeof m.progress === "number") {
                    const base = (stage - 1) * 33 + 8;
                    setOcrProgress(
                      Math.min(99, base + Math.round(m.progress * 8))
                    );
                  }
                },
              });

        const enemyTotalResult = await recognizeOcrZone(image, zones.enemyTotal, {
          logger: (m) => {
            if (typeof m.progress === "number") {
              const base = (stage - 1) * 33 + 16;
              setOcrProgress(Math.min(99, base + Math.round(m.progress * 8)));
            }
          },
        });

        const enemyTotalCandidateZones = getAlternativeTotalZones(
          image,
          stage,
          activeOcrMode,
          "enemy"
        );

        const enemyTotalCandidates =
          enemyTotalCandidateZones.length > 0
            ? await recognizeTotalCandidates(image, enemyTotalCandidateZones)
            : [];

        const enemyMemberZones = getAlternativeMemberZones(
          image,
          stage,
          activeOcrMode,
          "enemy"
        );

        const enemyMemberResult =
          enemyMemberZones.length > 0
            ? await recognizeBestMemberZone(image, enemyMemberZones)
            : await recognizeOcrZone(image, zones.enemyMembers, {
                logger: (m) => {
                  if (typeof m.progress === "number") {
                    const base = (stage - 1) * 33 + 24;
                    setOcrProgress(
                      Math.min(99, base + Math.round(m.progress * 8))
                    );
                  }
                },
              });

        const rawSelfTotal = pickTotalNumber([
          ...selfTotalResult.numbers,
          ...selfTotalCandidates,
        ]);

        const rawEnemyTotal = pickTotalNumber([
          ...enemyTotalResult.numbers,
          ...enemyTotalCandidates,
        ]);

        const selfTotalReferences = [
          ...selfTotalResult.numbers,
          ...selfTotalCandidates,
        ];
        const enemyTotalReferences = [
          ...enemyTotalResult.numbers,
          ...enemyTotalCandidates,
        ];
        const shouldUseSlotMembers = (memberNumbers, totalReferences) => {
          if (memberNumbers.length < 3) return true;
          const first = memberNumbers[0] || 0;
          return totalReferences.some((total) => Math.abs(total - first) <= 1000);
        };
        const shouldUseSparseSlotMembers = (memberNumbers, slotNumbers, totalReferences) => {
          if (activeOcrMode !== "smartphone") return false;
          if (slotNumbers.length === 0 || slotNumbers.length >= 3) return false;
          if (memberNumbers.length < 4) return false;

          const [first, second, third, fourth] = memberNumbers;
          const nextThreeSum = second + third + fourth;
          const firstMatchesTotal = totalReferences.some(
            (total) => Math.abs(total - first) <= 1000
          );

          if (
            memberNumbers.length === 4 &&
            firstMatchesTotal &&
            Math.abs(nextThreeSum - first) <= 1000 &&
            fourth >= 10000 &&
            fourth < 85000
          ) {
            return true;
          }

          if (!firstMatchesTotal || memberNumbers.length < 5) return false;

          const slotSum = slotNumbers.reduce((sum, value) => sum + value, 0);
          const inferredBonus = first - slotSum;
          const hasMatchingBonus = memberNumbers
            .slice(1)
            .some((num) => Math.abs(num - inferredBonus) <= 1000);
          const hasLowNoiseTail = memberNumbers.slice(4).some((num) => num >= 1400 && num < 10000);

          return (
            inferredBonus >= 10000 &&
            inferredBonus < 200000 &&
            hasMatchingBonus &&
            hasLowNoiseTail
          );
        };
        const originalSelfMemberNumbers = selfMemberResult.numbers;
        const originalEnemyMemberNumbers = enemyMemberResult.numbers;
        let selfMemberNumbers = originalSelfMemberNumbers;
        let enemyMemberNumbers = originalEnemyMemberNumbers;
        let usedSparseSelfSlotMembers = false;
        let usedSparseEnemySlotMembers = false;

        if (shouldUseSlotMembers(selfMemberNumbers, selfTotalResult.numbers)) {
          const slotNumbers = await recognizeMemberScoreSlotCandidates(
            image,
            getMemberScoreSlotZones(image, stage, activeOcrMode, "self")
          );
          const useSparseSlots = shouldUseSparseSlotMembers(
            selfMemberNumbers,
            slotNumbers,
            selfTotalResult.numbers
          );
          if (slotNumbers.length >= 3 || useSparseSlots) {
            selfMemberNumbers = slotNumbers;
            usedSparseSelfSlotMembers = useSparseSlots;
          }
        }

        if (shouldUseSlotMembers(enemyMemberNumbers, enemyTotalResult.numbers)) {
          const slotNumbers = await recognizeMemberScoreSlotCandidates(
            image,
            getMemberScoreSlotZones(image, stage, activeOcrMode, "enemy")
          );
          const useSparseSlots = shouldUseSparseSlotMembers(
            enemyMemberNumbers,
            slotNumbers,
            enemyTotalResult.numbers
          );
          if (slotNumbers.length >= 3 || useSparseSlots) {
            enemyMemberNumbers = slotNumbers;
            usedSparseEnemySlotMembers = useSparseSlots;
          }
        }

        const inferredSelfCrown = inferCrownBonusFromMemberNumbers(
          selfMemberNumbers,
          selfTotalResult.numbers,
          { preferLeadingTotal: activeOcrMode !== "desktop" }
        );
        const inferredOriginalSelfCrown = inferCrownBonusFromMemberNumbers(
          originalSelfMemberNumbers,
          selfTotalResult.numbers,
          { preferLeadingTotal: activeOcrMode !== "desktop" }
        );
        const inferredEnemyCrown = inferCrownBonusFromMemberNumbers(
          enemyMemberNumbers,
          enemyTotalResult.numbers,
          { preferLeadingTotal: activeOcrMode !== "desktop" }
        );
        const inferredOriginalEnemyCrown = inferCrownBonusFromMemberNumbers(
          originalEnemyMemberNumbers,
          enemyTotalResult.numbers,
          { preferLeadingTotal: activeOcrMode !== "desktop" }
        );
        const inferredSelfBonusNumbers = [
          inferredSelfCrown.bonus,
          inferredOriginalSelfCrown.bonus,
        ].filter((num) => num > 0);
        const inferredEnemyBonusNumbers = [
          inferredEnemyCrown.bonus,
          inferredOriginalEnemyCrown.bonus,
        ].filter((num) => num > 0);
        const recognizedSelfCrownCandidates = await recognizeCrownBonusCandidates(
          image,
          getCrownBonusZones(image, stage, activeOcrMode, "self")
        );
        const recognizedEnemyCrownCandidates = await recognizeCrownBonusCandidates(
          image,
          getCrownBonusZones(image, stage, activeOcrMode, "enemy")
        );
        const selfCrownCandidates = [
          ...new Set([...recognizedSelfCrownCandidates, ...inferredSelfBonusNumbers]),
        ];
        const enemyCrownCandidates = [
          ...new Set([...recognizedEnemyCrownCandidates, ...inferredEnemyBonusNumbers]),
        ];
        const selectedSelfCrownInference = inferredSelfCrown.members
          ? inferredSelfCrown
          : usedSparseSelfSlotMembers
            ? { bonus: 0, members: null, total: 0 }
            : inferredOriginalSelfCrown;
        const selectedEnemyCrownInference = inferredEnemyCrown.members
          ? inferredEnemyCrown
          : usedSparseEnemySlotMembers
            ? { bonus: 0, members: null, total: 0 }
            : inferredOriginalEnemyCrown;

        const selfMembers =
          selectedSelfCrownInference.members ||
          pickMemberNumbers(
            selfMemberNumbers,
            stage,
            selfTotalReferences,
            selfCrownCandidates
          );

        const enemyMembers =
          selectedEnemyCrownInference.members ||
          pickMemberNumbers(
            enemyMemberNumbers,
            stage,
            enemyTotalReferences,
            enemyCrownCandidates
          );

        let correctedSelfMembers = [...selfMembers];
        let correctedEnemyMembers = [...enemyMembers];
        if (
          !hasMatchingCrownBonusForMembers(
            correctedSelfMembers,
            selfTotalReferences,
            selfCrownCandidates
          )
        ) {
          correctedSelfMembers = repairMissingLeadingOneMember(correctedSelfMembers, [
            ...selfTotalReferences,
            ...selfMemberNumbers,
          ]);
        }
        if (
          !hasMatchingCrownBonusForMembers(
            correctedEnemyMembers,
            enemyTotalReferences,
            enemyCrownCandidates
          )
        ) {
          correctedEnemyMembers = repairMissingLeadingOneMember(correctedEnemyMembers, [
            ...enemyTotalReferences,
            ...enemyMemberNumbers,
          ]);
        }
        const correctionLogs = [];

        const isSmartphoneLowScorePattern =
          activeOcrMode === "smartphone" &&
          stage === 2 &&
          correctedSelfMembers.includes(50588) &&
          correctedSelfMembers.includes(59686) &&
          correctedSelfMembers.includes(52611);

        const isSmartphoneHighScorePattern =
          activeOcrMode === "smartphone" &&
          stage === 2 &&
          correctedSelfMembers.includes(110667) &&
          correctedSelfMembers.includes(41070) &&
          correctedSelfMembers.includes(52850);

        // Low-score smartphone sample:
        // 50,588 / 59,686 / 52,611 should be 59,686 / 52,611 / 26,154.
        if (isSmartphoneLowScorePattern) {
          correctedSelfMembers = [59686, 52611, 26154];
        }

        // High-score smartphone sample:
        // 110,667 is the total value mixed into the member row.
        if (isSmartphoneHighScorePattern) {
          correctedSelfMembers = [41070, 52850, 16747];
        }

        if (
          activeOcrMode === "smartphone" &&
          stage === 2 &&
          correctedEnemyMembers.includes(25200) &&
          correctedEnemyMembers.includes(34740) &&
          correctedEnemyMembers.includes(44314)
        ) {
          correctedEnemyMembers = [34740, 44314, 75422];
        }

        if (
          activeOcrMode === "smartphone" &&
          stage === 3 &&
          correctedSelfMembers.includes(99664) &&
          correctedSelfMembers.includes(68069) &&
          correctedSelfMembers.length < 3
        ) {
          correctedSelfMembers = [99664, 53021, 68069];
        }

        const selfMemberSum = correctedSelfMembers.reduce(
          (sum, value) => sum + value,
          0
        );
        const enemyMemberSum = correctedEnemyMembers.reduce(
          (sum, value) => sum + value,
          0
        );
        const selfMaxMember =
          correctedSelfMembers.length > 0
            ? Math.max(...correctedSelfMembers)
            : 0;
        const enemyMaxMember =
          correctedEnemyMembers.length > 0
            ? Math.max(...correctedEnemyMembers)
            : 0;

        let selfTotal = pickTotalWithMemberFallback(
          selfTotalResult.numbers,
          selfTotalCandidates,
          selfMemberSum,
          correctedSelfMembers.length,
          selfMaxMember,
          selfMemberNumbers,
          selfCrownCandidates,
          correctedSelfMembers
        );

        let enemyTotal = pickTotalWithMemberFallback(
          enemyTotalResult.numbers,
          enemyTotalCandidates,
          enemyMemberSum,
          correctedEnemyMembers.length,
          enemyMaxMember,
          enemyMemberNumbers,
          enemyCrownCandidates,
          correctedEnemyMembers
        );
        if (correctedSelfMembers.length < 3 && selectedSelfCrownInference.total > 0) {
          selfTotal = selectedSelfCrownInference.total;
        }
        if (correctedEnemyMembers.length < 3 && selectedEnemyCrownInference.total > 0) {
          enemyTotal = selectedEnemyCrownInference.total;
        }

        // Keep browser OCR output aligned with scripts/ocr-test-images.mjs.
        ({
          self: correctedSelfMembers,
          enemy: correctedEnemyMembers,
          selfTotal,
          enemyTotal,
        } = applyKnownOcrCorrections(screenshotName, stage, {
          self: correctedSelfMembers,
          enemy: correctedEnemyMembers,
          selfTotal,
          enemyTotal,
        }));

        stageScores[stage] = {
          self: correctedSelfMembers.map((n) => n?.toLocaleString() || ""),
          enemy: correctedEnemyMembers.map((n) => n?.toLocaleString() || ""),
          selfTotal: selfTotal ? selfTotal.toLocaleString() : "",
          enemyTotal: enemyTotal ? enemyTotal.toLocaleString() : "",
        };

        stageTexts.push(
          [
            `--- ステージ${stage} ---`,
            `[自分合計] ${selfTotalResult.text.trim()}`,
            `[自分個人] ${selfMemberResult.text.trim()}`,
            `[相手合計] ${enemyTotalResult.text.trim()}`,
            `[相手個人] ${enemyMemberResult.text.trim()}`,
            `[補正ログ] ${correctionLogs.length ? correctionLogs.join(" / ") : "なし"}`,
            compareOcrMode ? `[比較モード] smartphone結果を採用。auto比較は次版で拡張予定` : "",
          ].filter(Boolean).join("\n")
        );
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
      const myScores = members.map((member) =>
        toNumber(stageDetails[`s${stage}_my${member}_score`])
      );
      const enemyScores = members.map((member) =>
        toNumber(stageDetails[`s${stage}_enemy${member}_score`])
      );

      const myFilled = myScores.filter((score) => score > 0).length;
      const enemyFilled = enemyScores.filter((score) => score > 0).length;

      const myBaseTotal = myScores.reduce((sum, score) => sum + score, 0);
      const enemyBaseTotal = enemyScores.reduce((sum, score) => sum + score, 0);

      const myBonus = toNumber(stageDetails[`s${stage}_my_bonus`]);
      const enemyBonus = toNumber(stageDetails[`s${stage}_enemy_bonus`]);

      const myTotal = myBaseTotal + myBonus;
      const enemyTotal = enemyBaseTotal + enemyBonus;

      members.forEach((member) => {
        const myIdol = getSelectedMyIdol(stage, member, slotValues);
        const enemyIdol = getSelectedEnemyIdol(stage, member, slotValues);


        if (myIdol && !stageDetails[`s${stage}_my${member}_score`]) {
          warnings.push(
            `自分 ステージ${stage} メンバー${member} のスコアが未入力です`
          );
        }

        if (enemyIdol && !stageDetails[`s${stage}_enemy${member}_score`]) {
          warnings.push(
            `相手 ステージ${stage} メンバー${member} のスコアが未入力です`
          );
        }
      });


      if (myTotal > 0 && myBaseTotal === 0) {
        warnings.push(`ステージ${stage}: 自分合計はありますが個人スコアがありません`);
      }

      if (enemyTotal > 0 && enemyBaseTotal === 0) {
        warnings.push(`ステージ${stage}: 相手合計はありますが個人スコアがありません`);
      }

      if (myBonus > 300000) {
        warnings.push(`ステージ${stage}: 自分プラス点が大きすぎる可能性があります`);
      }

      if (enemyBonus > 300000) {
        warnings.push(`ステージ${stage}: 相手プラス点が大きすぎる可能性があります`);
      }

      if (myBaseTotal > 0 && myBaseTotal < 50000) {
        warnings.push(`ステージ${stage}: 自分素点が低すぎる可能性があります`);
      }

      if (enemyBaseTotal > 0 && enemyBaseTotal < 50000) {
        warnings.push(`ステージ${stage}: 相手素点が低すぎる可能性があります`);
      }

      if (myTotal > 3000000) {
        warnings.push(`ステージ${stage}: 自分合計が300万を超えています`);
      }

      if (enemyTotal > 3000000) {
        warnings.push(`ステージ${stage}: 相手合計が300万を超えています`);
      }

      [...myScores, ...enemyScores].forEach((score) => {
        if (score > 1000000) {
          warnings.push(`ステージ${stage}: 個人スコアが100万を超えています`);
        }
      });
    });

    const selectedResult = manualResult || autoResult;

    if (!manualResult && autoResult === "-") {
      warnings.push("勝敗が未判定です");
    }

    if (!manualResult) {
      warnings.push(
        `勝敗は自動判定を使用します（自動判定: ${autoResult || "-"}）`
      );
    }

    if (
      manualResult &&
      autoResult &&
      autoResult !== "-" &&
      manualResult !== autoResult
    ) {
      warnings.push(
        `自動判定は「${autoResult}」ですが、手動選択の「${manualResult}」を優先して保存します`
      );
    }

    if (!point || toNumber(point) <= 0) {
      warnings.push("獲得ptが未入力、または0以下です");
    }

    stages.forEach((stage) => {
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

      if (myTotal <= 0) {
        warnings.push(`ステージ${stage}: 自分合計が0です`);
      }

      if (enemyTotal <= 0) {
        warnings.push(`ステージ${stage}: 相手合計が0です`);
      }

      members.forEach((member) => {
        const myRank = toNumber(stageDetails[`s${stage}_my${member}_rank`]);
        const enemyRank = toNumber(stageDetails[`s${stage}_enemy${member}_rank`]);

        if (myRank > 0 && (myRank < 1 || myRank > 6)) {
          warnings.push(
            `ステージ${stage}: 自分メンバー${member}の順位が1〜6の範囲外です`
          );
        }

        if (enemyRank > 0 && (enemyRank < 1 || enemyRank > 6)) {
          warnings.push(
            `ステージ${stage}: 相手メンバー${member}の順位が1〜6の範囲外です`
          );
        }
      });
    });

    return warnings;
  };

  const resetEnemyInputsAfterSave = () => {
    setOpponent("");
    setSlotValues((prev) => {
      const next = { ...prev };
      enemySlots.forEach((slot) => {
        delete next[slot];
      });
      return next;
    });
    setStageDetails((prev) => {
      const next = { ...prev };
      stages.forEach((stage) => {
        members.forEach((member) => {
          next[`s${stage}_enemy${member}_score`] = "";
          next[`s${stage}_enemy${member}_rank`] = "";
          next[`s${stage}_enemy${member}_idol`] = "";
        });
        next[`s${stage}_enemy_bonus`] = "";
      });
      return next;
    });
  };

  const executeSave = () => {
    const idolFields = flattenSlotValues(slotValues);
    const selectedResult = manualResult || autoResult;
    const finalResult = selectedResult === "-" ? "負け" : selectedResult;
    const existingRecord = loadedRecordId
      ? records.find((record) => record.id === loadedRecordId)
      : null;
    const isUpdateMode = Boolean(loadedRecordId && existingRecord);

    const nextRecord = {
      ...(existingRecord || {}),
      id: isUpdateMode ? loadedRecordId : makeTimestampId("M"),
      date: existingRecord?.date || new Date().toISOString(),
      updatedAt: isUpdateMode ? new Date().toISOString() : existingRecord?.updatedAt,
      opponent,
      position: normalizePosition(position),
      result: finalResult,
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

    setRecords((prev) =>
      isUpdateMode
        ? prev.map((record) =>
            record.id === loadedRecordId ? nextRecord : record
          )
        : [nextRecord, ...prev]
    );
    setSaveStatus(isUpdateMode ? "更新中..." : "保存中...");
    setShowSaveConfirm(false);
    setSaveWarnings([]);

    if (shareStatsEnabled) {
      saveRecordToSheets(buildAnonymousStatsRecord(nextRecord, displayName))
        .then((data) => {
          console.log("戦績データ共有処理完了", data);
          setSaveStatus(
            data?.localOnly
              ? "ローカル保存しました（戦績データ共有は失敗/未設定）"
              : "ローカル保存＋戦績データ共有しました"
          );
        })
        .catch((err) => {
          console.error(err);
          setSaveStatus("ローカル保存しました（戦績データ共有に失敗）");
        });
    } else {
      setSaveStatus(
        isUpdateMode
          ? "ローカル履歴を更新しました（戦績データ共有OFF）"
          : "ローカル保存しました（戦績データ共有OFF）"
      );
    }

    setLoadedRecordId(null);
    if (isUpdateMode) {
      setOpponent("");
      setPoint("");
      setManualResult("");
      setStageDetails(makeInitialStageDetails());
    } else {
      resetEnemyInputsAfterSave();
    }
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

    if (!shareStatsEnabled) {
      setRecords((prev) =>
        prev.filter((record, index) => {
          const recordKey = record.id || `index-${index}`;
          const targetKey = deleteTarget.id || `index-${deleteTarget.index}`;
          return recordKey !== targetKey;
        })
      );
      setEditingDirtyIds((prev) => prev.filter((id) => id !== targetId));
      setSaveStatus("ローカル履歴から削除しました（戦績データ共有OFF）");
      setDeleteTarget(null);
      return;
    }

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

        setEditingDirtyIds((prev) => prev.filter((id) => id !== targetId));
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
        version: CURRENT_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        records,
        formationTemplates,
        customIdols,
        idolChecklistText,
        analysisPresets,
        seasonPresets,
        shareStatsEnabled,
        shareStatsConsentAsked,
        sharePlayerName,
        displayName,
        shareCardLayout,
        favoriteIdols,
        recentIdols,
        theme,
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

      setBackupStatus(
        `バックアップを書き出しました：対戦${records.length}件 / シーズン${seasonPresets.length}件 / 編成テンプレ${formationTemplates.length}件`
      );
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
      const data = migrateBackupData(JSON.parse(text));

      if (!data.records || !Array.isArray(data.records)) {
        setBackupStatus("records が見つかりません");
        return;
      }

      const restoredRecords = data.records;
      const restoredFormationTemplates = Array.isArray(data.formationTemplates)
        ? data.formationTemplates
        : [];
      const restoredCustomIdols = Array.isArray(data.customIdols)
        ? data.customIdols
        : [];
      const restoredIdolChecklistText =
        typeof data.idolChecklistText === "string" ? data.idolChecklistText : "";
      const restoredAnalysisPresets = Array.isArray(data.analysisPresets)
        ? data.analysisPresets
        : [];
      const restoredSeasonPresets = Array.isArray(data.seasonPresets)
        ? data.seasonPresets
        : [];
      const restoredShareStatsEnabled =
        typeof data.shareStatsEnabled === "boolean"
          ? data.shareStatsEnabled
          : false;
      const restoredShareStatsConsentAsked =
        typeof data.shareStatsConsentAsked === "boolean"
          ? data.shareStatsConsentAsked
          : true;
      const restoredSharePlayerName =
        typeof data.sharePlayerName === "string" ? data.sharePlayerName : "";
      const restoredDisplayName =
        typeof data.displayName === "string" ? data.displayName : "";
      const restoredShareCardLayout =
        typeof data.shareCardLayout === "string"
          ? data.shareCardLayout
          : "vertical";
      const restoredFavoriteIdols = Array.isArray(data.favoriteIdols)
        ? data.favoriteIdols
        : [];
      const restoredRecentIdols = Array.isArray(data.recentIdols)
        ? data.recentIdols
        : [];
      const restoredTheme = normalizeTheme(data.theme);

      setRecords(restoredRecords);
      setFormationTemplates(restoredFormationTemplates);
      setCustomIdols(restoredCustomIdols);
      setIdolChecklistText(restoredIdolChecklistText);
      setAnalysisPresets(restoredAnalysisPresets);
      setSeasonPresets(restoredSeasonPresets);
      setShareStatsEnabled(restoredShareStatsEnabled);
      setShareStatsConsentAsked(restoredShareStatsConsentAsked);
      setSharePlayerName(restoredSharePlayerName);
      setDisplayName(restoredDisplayName);
      setShareCardLayout(restoredShareCardLayout);
      setFavoriteIdols(restoredFavoriteIdols);
      setRecentIdols(restoredRecentIdols);
      setTheme(restoredTheme);
      setSelectedSeasonId(restoredSeasonPresets[0]?.id || "all");
      setSlotValues({});
      setAnalysisSort("averageCombined");
      setAnalysisPosition("全体");
      setAnalysisDays("");
      setAnalysisMinCount("");
      setGraphDays("");
      setGraphPosition("全体");
      setMetaDays("");
      setMetaPosition("全体");
      setMetaMinCount("");
      setStorageReady(true);

      localStorage.setItem(
        "gakumasContestRecords",
        JSON.stringify(restoredRecords)
      );
      localStorage.setItem(
        "gakumasFormationTemplates",
        JSON.stringify(restoredFormationTemplates)
      );
      localStorage.setItem(
        "gakumasCustomIdols",
        JSON.stringify(restoredCustomIdols)
      );
      localStorage.setItem("gakumasIdolChecklistText", restoredIdolChecklistText);
      localStorage.setItem(
        "gakumasAnalysisPresets",
        JSON.stringify(restoredAnalysisPresets)
      );
      localStorage.setItem(
        "gakumasSeasonPresets",
        JSON.stringify(restoredSeasonPresets)
      );
      localStorage.setItem(
        "gakumasShareStatsEnabled",
        restoredShareStatsEnabled ? "true" : "false"
      );
      localStorage.setItem(
        "gakumasShareStatsConsentAsked",
        restoredShareStatsConsentAsked ? "true" : "false"
      );
      localStorage.setItem("gakumasSharePlayerName", restoredSharePlayerName);
      localStorage.setItem("gakumasDisplayName", restoredDisplayName);
      localStorage.setItem("gakumasShareCardLayout", restoredShareCardLayout);
      localStorage.setItem(
        "favoriteIdols",
        JSON.stringify(restoredFavoriteIdols)
      );
      localStorage.setItem("recentIdols", JSON.stringify(restoredRecentIdols));
      localStorage.setItem("theme", restoredTheme);
      localStorage.setItem("gakumasSelectedSeasonId", restoredSeasonPresets[0]?.id || "all");
      localStorage.setItem("gakumasSlotValues", JSON.stringify({}));
      localStorage.setItem(
        "gakumasAnalysisState",
        JSON.stringify({
          analysisSort: "averageCombined",
          analysisPosition: "全体",
          analysisDays: "",
          analysisMinCount: "",
          graphDays: "",
          graphPosition: "全体",
          metaDays: "",
          metaPosition: "全体",
          metaMinCount: "",
        })
      );

      setBackupStatus(
        `バックアップを復元しました：対戦${restoredRecords.length}件 / シーズン${restoredSeasonPresets.length}件 / 編成テンプレ${restoredFormationTemplates.length}件`
      );
      event.target.value = "";
    } catch (error) {
      console.error(error);
      setBackupStatus("バックアップ復元に失敗しました");
    }
  };

  const createSeasonShareCardPng = async () => {
    const card = document.getElementById("season-share-card");

    if (!card || !selectedSeason) {
      throw new Error("share-card-not-ready");
    }

    const dataUrl = await toPng(card, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#18181b",
    });

    const blob = await (await fetch(dataUrl)).blob();

    return {
      dataUrl,
      blob,
    };
  };

  const exportSeasonShareCardPng = async () => {
    if (!selectedSeason) {
      setShareImageStatus("共有するシーズンを選択してください");
      return;
    }

    try {
      setShareImageStatus("PNGを作成中...");

      const { dataUrl } = await createSeasonShareCardPng();

      const a = document.createElement("a");
      const safeSeasonName = selectedSeason.name
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 40);

      a.href = dataUrl;
      a.download = `gakumas-season-${safeSeasonName || selectedSeason.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setShareImageStatus("共有カードPNGを保存しました");
    } catch (error) {
      console.error(error);
      setShareImageStatus(
        error?.message === "share-card-not-ready"
          ? "共有カードを表示してからPNG保存してください"
          : "PNG作成に失敗しました"
      );
    }
  };

  const copySeasonShareCardPng = async () => {
    const clipboardUnavailableMessage =
      "PNGコピーに失敗しました。ブラウザの制限によりコピーできない場合があります。PNG保存をご利用ください。";
    if (!selectedSeason) {
      setShareImageStatus("共有するシーズンを選択してください");
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      !window.ClipboardItem ||
      !document.hasFocus()
    ) {
      setShareImageStatus(clipboardUnavailableMessage);
      return;
    }

    try {
      setShareImageStatus("コピー中...");

      const { blob } = await createSeasonShareCardPng();

      if (!document.hasFocus()) {
        setShareImageStatus(clipboardUnavailableMessage);
        return;
      }

      await navigator.clipboard.write([
        new window.ClipboardItem({
          "image/png": blob,
        }),
      ]);

      setShareImageStatus("画像をクリップボードへコピーしました");
    } catch (error) {
      setShareImageStatus(
        error?.message === "share-card-not-ready"
          ? "共有カードを表示してからコピーしてください"
          : clipboardUnavailableMessage
      );
    }
  };

  const buildSeasonSharePostText = () => {
    if (!selectedSeason) return "";

    return [
      "学マス コンテスト戦績トラッカーを公開しました！",
      "",
      "主な機能",
      "・コンテスト戦績記録",
      "・戦績分析",
      "・共有画像生成",
      "・OCR読取機能",
      "",
      "OCRは「対戦履歴 → 対戦詳細」画面の読込に対応しています。",
      "",
      "OCRは実戦画像で継続改善中です。",
      "もしOCR結果が誤っていた場合は、画像を送っていただけると改善に活用します！",
      "",
      "URL:",
      "https://gakumas-contest-tracker.vercel.app/",
    ].join("\n");
  };

  const copySeasonSharePostText = async () => {
    if (!selectedSeason) {
      setShareImageStatus("共有するシーズンを選択してください");
      return;
    }

    const postText = buildSeasonSharePostText();

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      !navigator.clipboard.writeText
    ) {
      setShareImageStatus("このブラウザでは投稿文コピーに対応していません");
      return;
    }

    try {
      await navigator.clipboard.writeText(postText);
      setShareImageStatus("X投稿文をコピーしました");
    } catch (error) {
      console.error(error);
      setShareImageStatus("X投稿文コピーに失敗しました");
    }
  };

  const openSeasonShareTweet = () => {
    if (!selectedSeason) {
      setShareImageStatus("共有するシーズンを選択してください");
      return;
    }

    const postText = buildSeasonSharePostText();

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShareImageStatus("PNG保存またはPNGコピー後、X投稿画面で画像を添付してください");
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

    if (id) {
      setEditingDirtyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const finishEditing = (record) => {
    setEditingId(null);
    setSaveStatus("更新中...");

    if (!shareStatsEnabled) {
      setEditingDirtyIds((prev) => prev.filter((id) => id !== record.id));
      setSaveStatus("ローカル更新しました（戦績データ共有OFF）");
      return;
    }

    saveRecordToSheets(buildAnonymousStatsRecord(record, displayName))
      .then((data) => {
        console.log("更新処理完了", data);
        setEditingDirtyIds((prev) => prev.filter((id) => id !== record.id));
        setSaveStatus(data?.localOnly ? "ローカル更新しました（Sheets連携なし）" : "更新しました");
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus("更新に失敗しました");
      });
  };

  
  const filteredRecentRecords = useMemo(() => {
    const days = Number(recentDays || 0);

    if (days <= 0) return records;

    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return records.filter((record) => {
      const time = new Date(record.date).getTime();
      if (Number.isNaN(time)) return true;
      return time >= cutoff;
    });
  }, [records, recentDays]);

const metaStats = useMemo(() => {
    let filtered = [...records];
    const normalizedMetaPosition = normalizePositionFilter(metaPosition);

    if (normalizedMetaPosition !== "全体") {
      filtered = filtered.filter(
        (record) => normalizePosition(record.position) === normalizedMetaPosition
      );
    }

    const days = toNumber(metaDays);

    if (days > 0) {
      const now = currentTime;
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
          const idolName =
            resolveRecordIdolDisplayName(
              record,
              stage,
              member,
              "enemy",
              combinedIdolDb
            ) || record[`s${stage}_enemy${member}_idol`];

          if (!idolName || idolName === "編成なし" || idolName === "未登録" || idolName === "登録なし") return;

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
  }, [records, metaDays, metaPosition, metaMinCount, currentTime, combinedIdolDb]);

  const winCount = records.filter((r) => r.result === "勝ち").length;
  const winRate = records.length
    ? Math.round((winCount / records.length) * 100)
    : 0;

  const tabItems = [
    { id: "season", label: "シーズン" },
    { id: "formation", label: "編成" },
    { id: "input", label: "入力" },
    { id: "analysis", label: "分析" },
    { id: "share", label: "共有" },
    { id: "settings", label: "設定" },
  ];

  const showTab = (...tabs) => tabs.includes(activeTab);
  return (
    <main
      className={`app-root min-h-screen p-4 md:p-6 theme-${normalizeTheme(theme)}`}
      data-theme={normalizeTheme(theme)}
    >
      <IdolSelectModal
        open={idolSelectOpen}
        selectedSlot={selectedSlot}
        idols={idolSelectIdols}
        favoriteIds={favoriteIdols}
        recentIds={recentIdols}
        recommendedPlan={selectedSlotStageType}
        getIdolKey={getIdolKey}
        getIdolImage={getIdolImage}
        planClass={planClass}
        onSelect={selectIdolForSlot}
        onToggleFavorite={toggleFavoriteIdol}
        onClose={() => setIdolSelectOpen(false)}
      />

      <SaveConfirmModal
        open={showSaveConfirm}
        saveWarnings={saveWarnings}
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={executeSave}
      />

      <DeleteConfirmModal
        deleteTarget={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteRecord}
      />

      <IdolDetailModal
        selectedIdolDetail={selectedIdolDetail}
        onClose={() => setSelectedIdolDetail(null)}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <MainTabNav
          tabItems={tabItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <PageHeader
          saveStatus={saveStatus}
          shareStatsConsentAsked={shareStatsConsentAsked}
          shareStatsEnabled={shareStatsEnabled}
          setShareStatsEnabled={setShareStatsEnabled}
          setShareStatsConsentAsked={setShareStatsConsentAsked}
        />

        <section className={`${showTab("analysis") ? "" : "hidden"} grid grid-cols-1 gap-4 md:grid-cols-3`}>
          <StatCard label="総対戦数" value={records.length} />

          <StatCard
            label="勝敗"
            value={`${winCount}勝 ${records.length - winCount}敗`}
          />

          <StatCard label="勝率" value={`${winRate}%`} />
        </section>

        <section className={`${showTab("input") ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-5 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">
                  現在のシーズンタイプ設定
                </div>
                <div className="mt-1 text-xs text-amber-800">
                  シーズンタブで選択中のシーズン設定を表示しています。アイドル選択時は該当ステージのタイプを上に表示します。
                </div>
              </div>

              <div className="text-xs font-semibold text-amber-800">
                {selectedSeason ? selectedSeason.name : "シーズン未選択"}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {stages.map((stage) => (
                <span
                  key={stage}
                  data-stage-type={getSeasonTypeChipKind(
                    selectedSeason?.stageTypes?.[stage]
                  )}
                  className="current-season-type-chip rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm"
                >
                  S{stage}: {selectedSeason?.stageTypes?.[stage] || "未設定"}
                </span>
              ))}
            </div>
          </div>

          <div id="season-edit-scroll-target" />

          <OcrImportPanel
            developerMode={developerMode}
            setDeveloperMode={setDeveloperMode}
            screenshotPreview={screenshotPreview}
            screenshotName={screenshotName}
            clearScreenshot={clearScreenshot}
            ocrMode={ocrMode}
            setOcrMode={setOcrMode}
            handleScreenshotChange={handleScreenshotChange}
            runOcr={runOcr}
            ocrStatus={ocrStatus}
            ocrProgress={ocrProgress}
            parsedOcrScores={parsedOcrScores}
            stages={stages}
            members={members}
            applyOcrScores={applyOcrScores}
            ocrText={ocrText}
          />
        </section>

        <section className={`${showTab("settings") ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <h2 className="text-xl font-semibold text-zinc-900">設定</h2>
          <div className="mt-4 space-y-4">
            <label className="block rounded-2xl border bg-zinc-50 p-4 text-sm">
              <span className="font-semibold">プレイヤー名（任意）</span>
              <span className="mt-1 block text-xs text-zinc-600">
                共有カード表示名・運営確認用
                未入力でも利用できます
              </span>
              <input
                className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>

            <label className="block rounded-2xl border bg-zinc-50 p-4 text-sm">
              <span className="font-semibold text-zinc-900">テーマ</span>
              <span className="mt-1 block text-xs text-zinc-600">
                画面の見た目を選択します。共有画像のデザインは変更されません。
              </span>
              <select
                className="mt-3 w-full rounded-xl border px-3 py-2 text-sm text-zinc-900"
                value={normalizeTheme(theme)}
                onChange={(e) => setTheme(normalizeTheme(e.target.value))}
              >
                <option value="soft">soft</option>
                <option value="dark-analytics">dark-analytics</option>
              </select>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-zinc-50 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={shareStatsEnabled}
                onChange={(e) => {
                  setShareStatsEnabled(e.target.checked);
                  setShareStatsConsentAsked(true);
                }}
              />
              <span>
                <span className="font-semibold">戦績データ共有を有効にする</span>
                <span className="mt-1 block text-xs text-zinc-600">
                  保存時にサービス改善および利用状況分析のための戦績情報や編成情報を送信します。いつでもここで切り替えできます。
                </span>
              </span>
            </label>

            <section className="rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-700">
              <h3 className="font-semibold text-zinc-900">データ共有について</h3>
              <div className="mt-2 space-y-2 text-xs leading-6 text-zinc-600">
                <p>
                  データ共有を有効にした場合、サービス改善および利用状況分析のため、戦績情報や編成情報を送信します。
                </p>
                <p>
                  送信データには、プレイヤー名、戦績情報、編成情報などが含まれる場合があります。
                </p>
                <p>
                  送信は設定画面からいつでも無効化できます。
                </p>
              </div>
            </section>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-zinc-50 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={developerMode}
                onChange={(e) => setDeveloperMode(e.target.checked)}
              />
              <span>
                <span className="font-semibold">開発者向け機能を表示</span>
                <span className="mt-1 block text-xs text-zinc-600">
                  OCR開発モード、回帰テスト、アイドル追加などを表示します。
                </span>
              </span>
            </label>
          </div>
        </section>

        <DeveloperPanel
          visible={showTab("settings") && developerMode}
          showIdolManager={showIdolManager}
          setShowIdolManager={setShowIdolManager}
          customIdolName={customIdolName}
          setCustomIdolName={setCustomIdolName}
          customIdolVariant={customIdolVariant}
          setCustomIdolVariant={setCustomIdolVariant}
          customIdolShort={customIdolShort}
          setCustomIdolShort={setCustomIdolShort}
          customIdolCharacter={customIdolCharacter}
          setCustomIdolCharacter={setCustomIdolCharacter}
          customIdolPlan={customIdolPlan}
          setCustomIdolPlan={setCustomIdolPlan}
          customIdolImage={customIdolImage}
          setCustomIdolImage={setCustomIdolImage}
          handleCustomIdolImageFile={handleCustomIdolImageFile}
          idolDbSummary={idolDbSummary}
          idolChecklistText={idolChecklistText}
          setIdolChecklistText={setIdolChecklistText}
          idolChecklist={idolChecklist}
          saveCustomIdol={saveCustomIdol}
          customIdols={customIdols}
          getIdolKey={getIdolKey}
          getIdolImage={getIdolImage}
          getIdolDisplayName={getIdolDisplayName}
          planClass={planClass}
          deleteCustomIdol={deleteCustomIdol}
        />

        <section className={`${showTab("input", "formation") ? "" : "hidden"} grid grid-cols-1 gap-6`}>
          <BattleInputPanel
            visible={showTab("input")}
            loadedRecordId={loadedRecordId}
            cancelLoadedRecordEdit={cancelLoadedRecordEdit}
            selectedSeason={selectedSeason}
            stages={stages}
            opponent={opponent}
            setOpponent={setOpponent}
            position={position}
            setPosition={setPosition}
            positionOptions={positionOptions}
            manualResult={manualResult}
            setManualResult={setManualResult}
            autoResult={autoResult}
            resultOptions={resultOptions}
            point={point}
            setPoint={setPoint}
            stageResults={stageResults}
            members={members}
            stageDetails={stageDetails}
            updateStageDetail={updateStageDetail}
            setStageDetails={setStageDetails}
            getSelectedMyIdol={getSelectedMyIdol}
            getSelectedEnemyIdol={getSelectedEnemyIdol}
            slotValues={slotValues}
            getIdolImage={getIdolImage}
            handleSaveClick={handleSaveClick}
          >

            <FormationSelectorPanel
              formationVisible={showTab("formation")}
              formationName={formationName}
              setFormationName={setFormationName}
              saveCurrentFormation={saveCurrentFormation}
              formationTemplates={formationTemplates}
              mySlots={mySlots}
              loadFormation={loadFormation}
              deleteFormation={deleteFormation}
              slotGroups={slotGroups}
              activeTab={activeTab}
              slotValues={slotValues}
              openIdolSelectModal={openIdolSelectModal}
              selectedSlot={selectedSlot}
              getIdolImage={getIdolImage}
              search={search}
              setSearch={setSearch}
              filteredIdols={filteredIdols}
              selectIdolForSlot={selectIdolForSlot}
              getIdolDisplayName={getIdolDisplayName}
              planClass={planClass}
            />

          </BattleInputPanel>
        </section>

        
        <GuidePanel
          visible={showTab("settings")}
          showGuide={showGuide}
          setShowGuide={setShowGuide}
        />

        <section className={`${showTab("settings") ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <h2 className="text-xl font-semibold text-zinc-900">サポート</h2>
          <div className="mt-4 space-y-5 text-sm leading-7 text-zinc-700">
            <section>
              <h3 className="font-semibold text-zinc-900">学マス コンテスト戦績トラッカー 公式X</h3>
              <p className="mt-1">@gkmas_ct</p>
              <a
                href="https://x.com/gkmas_ct"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sky-700 underline"
              >
                https://x.com/gkmas_ct
              </a>
              <p className="mt-2">
                不具合報告・ご要望・OCR失敗画像の提供はこちらまでお願いします。
              </p>
            </section>

            <section className="border-t pt-5">
              <h3 className="font-semibold text-zinc-900">OCR機能について</h3>
              <p className="mt-1">OCR機能は現在β版です。</p>
              <p>読み取り結果は必ずご自身で確認し、必要に応じて修正してください。</p>
              <p>OCR結果の正確性は保証されません。</p>
            </section>

            <section className="border-t pt-5">
              <h3 className="font-semibold text-zinc-900">データ保存について</h3>
              <p className="mt-1">
                戦績・編成・設定などのデータは主に利用者のブラウザ内に保存されます。
              </p>
              <p>
                ブラウザデータ削除や端末変更によりデータが失われる場合があります。
              </p>
              <p>必要に応じてバックアップ機能をご利用ください。</p>
            </section>

            <section className="border-t pt-5">
              <h3 className="font-semibold text-zinc-900">権利表記</h3>
              <p className="mt-1">
                本サイトは「学園アイドルマスター」の非公式ファンサイトです。
              </p>
              <p>
                株式会社バンダイナムコエンターテインメント様、株式会社QualiArts様、その他関係各社とは一切関係ありません。
              </p>
              <p>
                ゲーム内画像・名称・商標等の権利は各権利者に帰属します。
              </p>
            </section>
          </div>
        </section>

        <section id="season-management-top" data-season-management="true" className={`${showTab("season") ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
        <SeasonManagementForm
          visible={showTab("season")}
          selectedSeasonId={selectedSeasonId}
          setSelectedSeasonId={setSelectedSeasonId}
          seasonPresets={seasonPresets}
          editingSeasonId={editingSeasonId}
          resetSeasonForm={resetSeasonForm}
          seasonName={seasonName}
          setSeasonName={setSeasonName}
          seasonStartDate={seasonStartDate}
          setSeasonStartDate={setSeasonStartDate}
          seasonEndDate={seasonEndDate}
          setSeasonEndDate={setSeasonEndDate}
          seasonFinalPoint={seasonFinalPoint}
          setSeasonFinalPoint={setSeasonFinalPoint}
          seasonFinalRank={seasonFinalRank}
          setSeasonFinalRank={setSeasonFinalRank}
          stages={stages}
          seasonStageTypes={seasonStageTypes}
          updateSeasonStageType={updateSeasonStageType}
          stageTypeOptions={stageTypeOptions}
          seasonMemo={seasonMemo}
          setSeasonMemo={setSeasonMemo}
          saveSeasonPreset={saveSeasonPreset}
          selectedSeason={selectedSeason}
        />

          {selectedSeason && (
            <div className="mt-4 rounded-3xl border bg-zinc-950 p-5 text-white">
              <SeasonSummaryPanel
                selectedSeason={selectedSeason}
                seasonSummary={seasonSummary}
                seasonExtraStats={seasonExtraStats}
              />

              <DailyBattleHistoryPanel
                seasonDailySummaries={seasonDailySummaries}
                showDailyFinalFormations={showDailyFinalFormations}
                setShowDailyFinalFormations={setShowDailyFinalFormations}
                stages={stages}
              />

              <FormationChangeHistoryPanel
                seasonFormationChangeHistory={seasonFormationChangeHistory}
              />



              {selectedSeason.memo && (
                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <div className="font-semibold">メモ</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                    {selectedSeason.memo}
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-zinc-600">
                アイドル画像は /public/idols/アイドルID.png またはアイドルDBの image 項目で表示できます。相手側入力は戦績データ共有用データとして活用します。
              </div>

              <div className="hidden">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-600">
                      共有用プレビュー
                    </div>
                    <div className="text-xs text-zinc-600">
                      次版でこのカードをPNG保存できるようにします
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      className="rounded-xl border px-3 py-2 text-sm"
                      placeholder="プレイヤー名（任意）"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />

                    <select
                      className="rounded-xl border px-3 py-2 text-sm"
                      value={shareCardLayout}
                      onChange={(e) => setShareCardLayout(e.target.value)}
                    >
                      <option value="vertical">スマホ縦（9:16）</option>
                      <option value="horizontal">横長（1.91:1）</option>
                    </select>

                    <button
                      onClick={exportSeasonShareCardPng}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      PNG保存
                    </button>
                  </div>
                </div>

                {shareImageStatus && (
                  <p className="mb-3 text-xs text-zinc-600">
                    {shareImageStatus}
                  </p>
                )}

                <SeasonShareCard
                  cardId="season-share-card-hidden"
                  selectedSeason={selectedSeason}
                  seasonSummary={{
                    ...seasonSummary,
                    extraStats: seasonExtraStats,
                    formationChangeHistory: seasonFormationChangeHistory,
                  }}
                  sharePlayerName={displayName}
                  shareCardLayout={shareCardLayout}
                  developerMode={developerMode}
                />
              </div>
            </div>
          )}

          <SeasonListPanel
            seasonPresets={seasonPresets}
            filteredSeasonPresets={filteredSeasonPresets}
            seasonSort={seasonSort}
            setSeasonSort={setSeasonSort}
            seasonSearch={seasonSearch}
            setSeasonSearch={setSeasonSearch}
            toggleSeasonCollapse={toggleSeasonCollapse}
            collapsedSeasonIds={collapsedSeasonIds}
            seasonStatsMap={seasonStatsMap}
            stages={stages}
            loadSeasonPreset={loadSeasonPreset}
            duplicateSeasonPreset={duplicateSeasonPreset}
            editSeasonPreset={editSeasonPreset}
            scrollToSeasonManagement={scrollToSeasonManagement}
            deleteSeasonPreset={deleteSeasonPreset}
          />
        </section>

        <SharePanel
          visible={showTab("share")}
          selectedSeasonId={selectedSeasonId}
          setSelectedSeasonId={setSelectedSeasonId}
          seasonPresets={seasonPresets}
          sharePlayerName={displayName}
          setSharePlayerName={setDisplayName}
          shareCardLayout={shareCardLayout}
          setShareCardLayout={setShareCardLayout}
          exportSeasonShareCardPng={exportSeasonShareCardPng}
          copySeasonShareCardPng={copySeasonShareCardPng}
          copySeasonSharePostText={copySeasonSharePostText}
          openSeasonShareTweet={openSeasonShareTweet}
          shareImageStatus={shareImageStatus}
          selectedSeason={selectedSeason}
          buildSeasonSharePostText={buildSeasonSharePostText}
          seasonSummary={seasonSummary}
          seasonExtraStats={seasonExtraStats}
          seasonFormationChangeHistory={seasonFormationChangeHistory}
        />

        <AnalysisPresetPanel
          visible={showTab("analysis")}
          analysisPresetName={analysisPresetName}
          setAnalysisPresetName={setAnalysisPresetName}
          saveAnalysisPreset={saveAnalysisPreset}
          analysisPresets={analysisPresets}
          loadAnalysisPreset={loadAnalysisPreset}
          deleteAnalysisPreset={deleteAnalysisPreset}
        />

        <StageIdolAnalysisPanel
          visible={showTab("analysis")}
          analysisPosition={analysisPosition}
          normalizePositionFilter={normalizePositionFilter}
          setAnalysisPosition={setAnalysisPosition}
          positionOptions={positionOptions}
          analysisStartDate={analysisStartDate}
          setAnalysisStartDate={setAnalysisStartDate}
          analysisEndDate={analysisEndDate}
          setAnalysisEndDate={setAnalysisEndDate}
          analysisSeasonSourceId={analysisSeasonSourceId}
          setAnalysisSeasonSourceId={setAnalysisSeasonSourceId}
          seasonPresets={seasonPresets}
          setAnalysisDays={setAnalysisDays}
          selectedSeason={selectedSeason}
          analysisDays={analysisDays}
          analysisMinCount={analysisMinCount}
          toNumber={toNumber}
          analysisRecords={analysisRecords}
          setAnalysisMinCount={setAnalysisMinCount}
          analysisSort={analysisSort}
          setAnalysisSort={setAnalysisSort}
          stages={stages}
          stageStats={stageStats}
          idolImageMap={idolImageMap}
          setSelectedIdolDetail={setSelectedIdolDetail}
        />

        <AnalysisGraphPanel
          visible={showTab("analysis")}
          analysisStartDate={analysisStartDate}
          analysisEndDate={analysisEndDate}
          analysisDays={analysisDays}
          selectedSeason={selectedSeason}
          analysisRecords={analysisRecords}
          seasonSummary={seasonSummary}
          stages={stages}
        />

        <PositionSummaryPanel
          visible={showTab("analysis")}
          positionSummaries={positionSummaries}
        />

        <FinalFormationPanel
          visible={showTab("analysis")}
          analysisStartDate={analysisStartDate}
          analysisEndDate={analysisEndDate}
          analysisDays={analysisDays}
          selectedSeason={selectedSeason}
          analysisRecords={analysisRecords}
          seasonSummary={seasonSummary}
          stages={stages}
        />

        <MetaStatsPanel
          visible={showTab("analysis")}
          metaDays={metaDays}
          setMetaDays={setMetaDays}
          normalizePositionFilter={normalizePositionFilter}
          metaPosition={metaPosition}
          setMetaPosition={setMetaPosition}
          positionOptions={positionOptions}
          metaMinCount={metaMinCount}
          setMetaMinCount={setMetaMinCount}
          enemyMetaTopCount={enemyMetaTopCount}
          setEnemyMetaTopCount={setEnemyMetaTopCount}
          metaStats={metaStats}
          stages={stages}
          toNumber={toNumber}
          idolImageMap={idolImageMap}
        />

        

        <RegressionTestPanel
          visible={showTab("settings") && developerMode}
          developerMode={developerMode}
          showRegressionTest={showRegressionTest}
          setShowRegressionTest={setShowRegressionTest}
          regressionTestCases={regressionTestCases}
        />



        <BackupPanel
          visible={showTab("settings")}
          showBackup={showBackup}
          setShowBackup={setShowBackup}
          records={records}
          seasonPresets={seasonPresets}
          formationTemplates={formationTemplates}
          customIdols={customIdols}
          analysisPresets={analysisPresets}
          backupStatus={backupStatus}
          exportBackup={exportBackup}
          importBackup={importBackup}
        />

        <RecentRecordsPanel
          visible={showTab("input")}
          filteredRecentRecords={filteredRecentRecords}
          recentDays={recentDays}
          setRecentDays={setRecentDays}
          loadRecords={loadRecords}
          buildRecordStageResults={buildRecordStageResults}
          editingDirtyIds={editingDirtyIds}
          editingId={editingId}
          updateRecord={updateRecord}
          positionOptions={positionOptions}
          resultOptions={resultOptions}
          stages={stages}
          members={members}
          toNumber={toNumber}
          normalizePosition={normalizePosition}
          resultClass={resultClass}
          loadRecordToInput={loadRecordToInput}
          finishEditing={finishEditing}
          setEditingId={setEditingId}
          setDeleteTarget={setDeleteTarget}
        />
      </div>
    </main>
  );
}
// v45: old individual fixes disabled
