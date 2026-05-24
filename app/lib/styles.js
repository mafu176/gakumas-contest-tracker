export function planClass(plan) {
  if (plan === "センス") return "bg-rose-100 text-rose-700";
  if (plan === "ロジック") return "bg-sky-100 text-sky-700";
  if (plan === "アノマリー") return "bg-violet-100 text-violet-700";
  return "bg-zinc-100 text-zinc-700";
}

export function resultClass(result) {
  if (result === "勝ち") return "bg-emerald-100 text-emerald-700";
  if (result === "負け") return "bg-rose-100 text-rose-700";
  if (result === "引き分け") return "bg-zinc-100 text-zinc-700";
  return "bg-zinc-100 text-zinc-600";
}
