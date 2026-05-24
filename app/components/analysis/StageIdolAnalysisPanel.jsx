function getIdolIconSrc(stat, idolImageMap = {}) {
  return (
    idolImageMap[stat?.idolName] ||
    stat?.image ||
    stat?.icon ||
    stat?.idolImage ||
    stat?.idolIcon ||
    stat?.cardImage ||
    stat?.imageUrl ||
    stat?.thumbnail ||
    stat?.thumbnailUrl ||
    ""
  );
}

function IdolNameWithIcon({ stat, idolImageMap, onClick }) {
  const iconSrc = getIdolIconSrc(stat, idolImageMap);

  return (
    <button
      onClick={onClick}
      className="flex min-w-0 items-center gap-3 text-left underline-offset-2 hover:underline"
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={stat.idolName}
          className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-[10px] font-bold text-zinc-400">
          NO IMG
        </div>
      )}

      <span className="min-w-0 font-semibold">
        {stat.idolName}
      </span>
    </button>
  );
}

export default function StageIdolAnalysisPanel({
  visible,
  analysisPosition,
  normalizePositionFilter,
  setAnalysisPosition,
  positionOptions,
  analysisStartDate,
  setAnalysisStartDate,
  analysisEndDate,
  setAnalysisEndDate,
  analysisSeasonSourceId,
  setAnalysisSeasonSourceId,
  seasonPresets,
  setAnalysisDays,
  selectedSeason,
  analysisDays,
  analysisMinCount,
  toNumber,
  analysisRecords,
  setAnalysisMinCount,
  analysisSort,
  setAnalysisSort,
  stages,
  stageStats,
  idolImageMap,
  setSelectedIdolDetail,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">ステージ別アイドル分析</h2>
              <p className="mt-1 text-sm text-zinc-500">
                現在の対象：{analysisPosition} /{" "}
                {analysisStartDate || analysisEndDate
                  ? `${analysisStartDate || "開始未指定"}～${analysisEndDate || "終了未指定"} / `
                  : selectedSeason
                    ? `${selectedSeason.name} (${selectedSeason.startDate}～${selectedSeason.endDate}) / `
                    : analysisDays
                      ? `直近${analysisDays}日 / `
                      : "全期間 / "}
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

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={normalizePositionFilter(analysisPosition)}
                  onChange={(e) => setAnalysisPosition(e.target.value)}
                >
                  <option value="全体">全体</option>
                  {positionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={analysisStartDate}
                  onChange={(e) => setAnalysisStartDate(e.target.value)}
                  title="開始日"
                />

                <input
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={analysisEndDate}
                  onChange={(e) => setAnalysisEndDate(e.target.value)}
                  title="終了日"
                />

                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={analysisSeasonSourceId}
                  onChange={(e) => {
                    const sourceId = e.target.value;
                    setAnalysisSeasonSourceId(sourceId);

                    const sourceSeason = seasonPresets.find(
                      (season) => season.id === sourceId
                    );

                    if (sourceSeason) {
                      setAnalysisStartDate(sourceSeason.startDate || "");
                      setAnalysisEndDate(sourceSeason.endDate || "");
                      setAnalysisDays("");
                    }
                  }}
                >
                  <option value="">シーズンから引用</option>
                  {seasonPresets.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="日数指定（任意）"
                  value={analysisDays}
                  onChange={(e) => {
                    setAnalysisDays(e.target.value);
                    if (e.target.value) {
                      setAnalysisStartDate("");
                      setAnalysisEndDate("");
                      setAnalysisSeasonSourceId("");
                    }
                  }}
                />

                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="最低採用数"
                  value={analysisMinCount || ""}
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

                <button
                  type="button"
                  onClick={() => {
                    setAnalysisStartDate("");
                    setAnalysisEndDate("");
                    setAnalysisSeasonSourceId("");
                    setAnalysisDays("");
                  }}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  期間クリア
                </button>
              </div>
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
                              <IdolNameWithIcon
                                stat={stat}
                                idolImageMap={idolImageMap}
                                onClick={() => setSelectedIdolDetail(stat)}
                              />
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
                                <IdolNameWithIcon
                                  stat={stat}
                                  idolImageMap={idolImageMap}
                                  onClick={() => setSelectedIdolDetail(stat)}
                                />
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
  );
}
