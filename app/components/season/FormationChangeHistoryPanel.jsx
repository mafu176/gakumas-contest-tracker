export default function FormationChangeHistoryPanel({
  seasonFormationChangeHistory,
}) {
  if (seasonFormationChangeHistory.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl bg-white/10 p-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-semibold">編成変更履歴</div>
          <div className="mt-1 text-xs text-zinc-600">
            日別最終編成の変化から自動で作成します。ステージ別比較ではなく、変更点だけを表示します。
          </div>
        </div>
        <div className="text-xs font-semibold text-zinc-600">
          {seasonFormationChangeHistory.length}件
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {seasonFormationChangeHistory.map((item, index) => (
          <div
            key={`${item.date}-${index}`}
            className="rounded-2xl bg-black/20 p-3 text-sm"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="font-semibold text-white">
                {item.date}
              </div>
              <div className="text-xs text-zinc-600">
                {item.type === "initial"
                  ? "初回記録の編成"
                  : `${item.changes.length}枠変更`}
              </div>
            </div>

            {item.type === "initial" ? (
              <div className="mt-2 text-xs text-zinc-200">
                この日の最終編成を基準にします。
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {item.changes.slice(0, 6).map((change) => (
                  <div
                    key={`${change.stage}-${change.member}`}
                    className="rounded-xl bg-black/20 p-3 text-xs text-zinc-200"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-white">
                        S{change.stage}-{change.member}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {change.beforePlan && change.afterPlan
                          ? `${change.beforePlan} → ${change.afterPlan}`
                          : change.afterPlan || change.beforePlan || ""}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-600">変更前</div>
                        <div className="truncate font-semibold text-zinc-600">
                          {change.before}
                        </div>
                      </div>

                      <div className="font-black text-amber-300">→</div>

                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-600">変更後</div>
                        <div className="truncate font-semibold text-white">
                          {change.after}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {item.changes.length > 6 && (
                  <div className="rounded-xl bg-black/20 p-3 text-xs text-zinc-600">
                    他 {item.changes.length - 6}件
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
