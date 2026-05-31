export default function DailyBattleHistoryPanel({
  seasonDailySummaries,
  showDailyFinalFormations,
  setShowDailyFinalFormations,
  stages,
}) {
  if (seasonDailySummaries.length === 0) return null;

  return (
    <div className="daily-history-panel mt-5 rounded-2xl bg-white/10 p-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-semibold">日別戦績</div>
          <div className="mt-1 text-xs text-zinc-600">
            シーズン内の対戦を日付ごとに集計します。
          </div>
        </div>
        <div className="text-xs font-semibold text-zinc-600">
          {seasonDailySummaries.length}日分
        </div>
      </div>

      <div className="daily-history-info mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/20 p-3">
        <div className="text-xs font-semibold text-zinc-200">
          各日の戦績の下に、その日の最後に記録した自分編成を表示できます。
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-200">
          <input
            type="checkbox"
            checked={showDailyFinalFormations}
            onChange={(e) =>
              setShowDailyFinalFormations(e.target.checked)
            }
            className="h-4 w-4 accent-amber-400"
          />
          日別最終編成を表示
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {seasonDailySummaries.map((summary) => (
          <div
            key={summary.date}
            className="daily-history-row rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-7">
              <div>
                <div className="text-zinc-600">日付</div>
                <div className="mt-1 font-semibold text-white">
                  {summary.date}
                </div>
              </div>
              <div>
                <div className="text-zinc-600">試合</div>
                <div className="mt-1 font-semibold text-zinc-200">
                  {summary.totalMatches}
                </div>
              </div>
              <div>
                <div className="text-zinc-600">勝敗</div>
                <div className="mt-1 font-semibold text-zinc-200">
                  {summary.winCount}-{summary.loseCount}
                </div>
              </div>
              <div>
                <div className="text-zinc-600">pt</div>
                <div className="mt-1 font-semibold text-zinc-200">
                  {summary.totalPoint.toLocaleString()}
                </div>
              </div>
              {stages.map((stage) => (
                <div key={stage}>
                  <div className="text-zinc-600">S{stage}勝敗</div>
                  <div className="mt-1 font-semibold text-zinc-200">
                    {summary.stageWinCounts[stage] || 0}-
                    {summary.stageLoseCounts[stage] || 0}
                  </div>
                </div>
              ))}
            </div>

            {showDailyFinalFormations && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-semibold text-white">
                    その日の最終使用編成
                  </div>
                  <div className="text-xs text-zinc-600">
                    最後に記録した対戦の自分編成です
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
                  {summary.finalFormation.map((slot) => (
                    <div
                      key={`${summary.date}-${slot.stage}-${slot.member}`}
                      className="daily-history-formation-card rounded-xl bg-white/10 p-1.5"
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-white/10">
                        {slot.image ? (
                          <img
                            src={slot.image}
                            alt={slot.idol || "idol"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-[10px] font-semibold text-zinc-600">
                        S{slot.stage}-{slot.member}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                        {slot.idol || "未登録"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
