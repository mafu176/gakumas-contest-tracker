import { API_URL, stages, members } from "./constants";
import { makeStableIdolKey } from "./idols";

const ANONYMOUS_CLIENT_ID_KEY = "gakumasAnonymousClientId";
const DATA_SHARING_ENABLED_KEY = "gakumasShareStatsEnabled";
const APP_VERSION = "1.0.0";

function createAnonymousClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getAnonymousClientId() {
  if (typeof window === "undefined" || !window.localStorage) {
    return createAnonymousClientId();
  }

  const savedClientId = window.localStorage.getItem(ANONYMOUS_CLIENT_ID_KEY);
  if (savedClientId) return savedClientId;

  const clientId = createAnonymousClientId();
  window.localStorage.setItem(ANONYMOUS_CLIENT_ID_KEY, clientId);
  return clientId;
}

function isDataSharingEnabled() {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  return window.localStorage.getItem(DATA_SHARING_ENABLED_KEY) === "true";
}

export function buildAnonymousStatsRecord(record, displayName = "") {
  return {
    schemaVersion: 2,
    kind: "contest_match",
    client_id: getAnonymousClientId(),
    app_version: APP_VERSION,
    sent_at: new Date().toISOString(),
    display_name: displayName || "",
    match: {
      id: record.id,
      date: record.date,
      position: record.position,
      result: record.result,
      point: record.point,
    },
    stages: stages.map((stage) => ({
      stage,
      my: buildAnonymousStageSide(record, stage, "my"),
      enemy: buildAnonymousStageSide(record, stage, "enemy"),
    })),
  };
}

function buildAnonymousStageSide(record, stage, side) {
  return {
    baseTotal: record[`s${stage}_${side}_base_total`] || "",
    bonus: record[`s${stage}_${side}_bonus`] || "",
    members: members.map((member) => {
      const idolDisplay = record[`s${stage}_${side}${member}_idol`] || "";

      return {
        slot: member,
        idolId:
          record[`s${stage}_${side}${member}_idol_id`] ||
          makeStableIdolKey(idolDisplay),
        idolName: record[`s${stage}_${side}${member}_idol_name`] || idolDisplay,
        idolVariant: record[`s${stage}_${side}${member}_idol_variant`] || "",
        score: record[`s${stage}_${side}${member}_score`] || "",
        rank: record[`s${stage}_${side}${member}_rank`] || "",
      };
    }),
  };
}

export function saveRecordToSheets(record) {
  if (!isDataSharingEnabled()) {
    return Promise.resolve({
      success: false,
      localOnly: true,
      skipped: "data-sharing-disabled",
    });
  }

  if (record?.schemaVersion !== 2) {
    return Promise.resolve({
      success: false,
      localOnly: true,
      skipped: "unsupported-payload",
    });
  }

  if (!API_URL || API_URL.trim() === "") {
    console.warn("Sheets連携未設定のため、ローカル保存のみ行います");

    return Promise.resolve({
      success: false,
      localOnly: true,
    });
  }

  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(record),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error(err);

      return {
        success: false,
        localOnly: true,
      };
    });
}
