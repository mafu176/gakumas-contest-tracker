export const CURRENT_BACKUP_VERSION = 2;

export function migrateBackupData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("invalid backup data");
  }

  const version = Number(data.version ?? 0);

  // 将来versionも許容
  if (version > CURRENT_BACKUP_VERSION) {
    console.warn(
      `future backup version detected: ${version}, trying compatibility import`
    );
  }

  return {
    version: CURRENT_BACKUP_VERSION,

    records: data.records ?? [],

    formationTemplates: data.formationTemplates ?? [],

    analysisPresets: data.analysisPresets ?? [],

    seasonPresets:
      data.seasonPresets ??
      data.seasons ??
      [],

    customIdols: data.customIdols ?? [],

    idolChecklistText:
      data.idolChecklistText ??
      "",

    shareStatsEnabled:
      data.shareStatsEnabled ??
      false,

    shareStatsConsentAsked:
      data.shareStatsConsentAsked ??
      false,

    sharePlayerName:
      data.sharePlayerName ??
      "",

    displayName:
      data.displayName ??
      "",

    shareCardLayout:
      data.shareCardLayout ??
      "vertical",

    favoriteIdols:
      data.favoriteIdols ??
      [],

    recentIdols:
      data.recentIdols ??
      [],

    // 将来用
    ...data,

    theme:
      data.theme === "dark-analytics" ? "dark-analytics" : "soft",
  };
}
