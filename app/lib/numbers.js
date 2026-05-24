export function toNumber(value) {
  const normalized = String(value ?? "")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .replace(/[^\d.-]/g, "");

  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}
