export function formatSeasonTypeLabel(value) {
  if (value === "sense") return "センス";
  if (value === "logic") return "ロジック";
  if (value === "anomaly") return "アノマリー";
  return value || "未設定";
}
