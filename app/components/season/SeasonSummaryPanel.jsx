export default function SeasonSummaryPanel({
  selectedSeason,
  seasonSummary,
  seasonExtraStats,
}) {
  if (!selectedSeason) return null;

  return (
    <>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm text-zinc-400">シーズンサマリー</div>
                  <h3 className="mt-1 text-2xl font-bold">{selectedSeason.name}</h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    {selectedSeason.startDate} ～ {selectedSeason.endDate}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <div className="text-xs text-zinc-300">勝率</div>
                  <div className="text-3xl font-bold">{seasonSummary.winRate}%</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">対戦数</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonSummary.totalMatches}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">勝利</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonSummary.winCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">敗北</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonSummary.loseCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">最終pt</div>
                  <div className="mt-1 text-2xl font-bold">
                    {selectedSeason.finalPoint || "-"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">最終順位</div>
                  <div className="mt-1 text-2xl font-bold">
                    {selectedSeason.finalRank ? `${selectedSeason.finalRank}位` : "-"}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">記録日数</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonExtraStats.playedDays}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">最大連勝</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonExtraStats.longestWinStreak}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">最高pt</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonExtraStats.highestPoint
                      ? seasonExtraStats.highestPoint.toLocaleString()
                      : "-"}
                  </div>
                  {seasonExtraStats.highestPointDate && (
                    <div className="mt-1 text-xs text-zinc-400">
                      {seasonExtraStats.highestPointDate}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-zinc-300">最高日別pt</div>
                  <div className="mt-1 text-2xl font-bold">
                    {seasonExtraStats.bestPointDayTotal
                      ? seasonExtraStats.bestPointDayTotal.toLocaleString()
                      : "-"}
                  </div>
                  {seasonExtraStats.bestPointDay && (
                    <div className="mt-1 text-xs text-zinc-400">
                      {seasonExtraStats.bestPointDay}
                    </div>
                  )}
                </div>
              </div>



              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div>
                    <div className="font-semibold">平均素点TOP</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      このシーズン内の自分編成で、各ステージごとに個人素点平均が最も高いアイドルを表示します。
                    </div>
                  </div>

                  {seasonSummary.averageBaseScoreTop?.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                      {seasonSummary.averageBaseScoreTop.map((slot, index) => (
                        <div
                          key={`${slot.stage}-${slot.member}-${slot.idolId || slot.idol}-score-${index}`}
                          className="rounded-2xl bg-black/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-amber-200">
                              STAGE{slot.stage}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              メンバー{slot.member}
                            </div>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
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
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                                  No Image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="line-clamp-2 text-xs font-semibold text-white">
                                {slot.idol || "未登録"}
                              </div>
                              <div className="mt-1 text-sm font-black text-amber-200">
                                {slot.averageBaseScore.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-400">
                      スコア付きの対戦記録がまだありません。
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div>
                    <div className="font-semibold">平均順位TOP</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      このシーズン内の自分編成で、各ステージごとに平均順位が最も高いアイドルを表示します。
                    </div>
                  </div>

                  {seasonSummary.averageRankTop?.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                      {seasonSummary.averageRankTop.map((slot, index) => (
                        <div
                          key={`${slot.stage}-${slot.member}-${slot.idolId || slot.idol}-rank-${index}`}
                          className="rounded-2xl bg-black/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-emerald-200">
                              STAGE{slot.stage}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              メンバー{slot.member}
                            </div>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
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
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                                  No Image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="line-clamp-2 text-xs font-semibold text-white">
                                {slot.idol || "未登録"}
                              </div>
                              <div className="mt-1 text-sm font-black text-emerald-200">
                                平均 {Number(slot.averageRank).toFixed(2)}位
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-400">
                      順位付きの対戦記録がまだありません。
                    </p>
                  )}
                </div>
              </div>
    </>
  );
}
