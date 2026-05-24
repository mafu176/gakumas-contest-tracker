function IdolNameWithIcon({ idolName, idolImageMap = {} }) {
  const iconSrc = idolImageMap[idolName] || "";

  return (
    <div className="flex min-w-0 items-center gap-3">
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={idolName}
          className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-[10px] font-bold text-zinc-600">
          NO IMG
        </div>
      )}

      <span className="min-w-0 font-semibold">{idolName}</span>
    </div>
  );
}

export default function MetaStatsPanel({
  visible,
  metaDays,
  setMetaDays,
  normalizePositionFilter,
  metaPosition,
  setMetaPosition,
  positionOptions,
  metaMinCount,
  setMetaMinCount,
  enemyMetaTopCount,
  setEnemyMetaTopCount,
  metaStats,
  stages,
  toNumber,
  idolImageMap,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">相手メタ分析</h2>
              <p className="mt-1 text-sm text-zinc-600">
                相手編成に登場したPアイドルをステージ別に確認できます。
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                遭遇率は「対象対戦数に対して、そのPアイドルを何回見たか」で計算しています。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="日数指定（空欄=全期間）"
                value={metaDays}
                onChange={(e) => setMetaDays(e.target.value)}
              />

              <select
                className="rounded-xl border px-3 py-2 text-sm"
                value={normalizePositionFilter(metaPosition)}
                onChange={(e) => setMetaPosition(e.target.value)}
              >
                <option value="全体">全体</option>
                {positionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="最低遭遇数"
                value={metaMinCount}
                onChange={(e) => setMetaMinCount(e.target.value)}
              />

              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Top表示数"
                value={enemyMetaTopCount}
                onChange={(e) => setEnemyMetaTopCount(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-600">表示件数</div>
              <div className="mt-1 text-2xl font-bold">{metaStats.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-600">最多遭遇</div>
              <div className="mt-1 text-lg font-bold">
                {metaStats[0]?.idolName || "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                {metaStats[0] ? `${metaStats[0].count}回` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-100 p-4">
              <div className="text-xs text-zinc-600">対象条件</div>
              <div className="mt-1 text-lg font-bold">
                {metaPosition} / {metaDays ? `直近${metaDays}日` : "全期間"}
              </div>
            </div>
          </div>

          {metaStats.length === 0 ? (
            <div className="rounded-2xl border bg-zinc-50 p-5 text-sm text-zinc-600">
              この条件の相手編成データがまだありません。
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage) => {
                const topCount = Math.max(1, toNumber(enemyMetaTopCount) || 10);
                const stageMetaStats = [...metaStats]
                  .filter((stat) => (stat.stageCounts?.[stage] || 0) > 0)
                  .sort(
                    (a, b) =>
                      (b.stageCounts?.[stage] || 0) -
                      (a.stageCounts?.[stage] || 0)
                  );
                const shownStageMetaStats = stageMetaStats.slice(0, topCount);

                return (
                  <div key={`enemy-meta-stage-${stage}`} className="rounded-2xl border bg-zinc-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="font-semibold">ステージ{stage}</div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                        Top {topCount} / {stageMetaStats.length}人
                      </div>
                    </div>

                    {shownStageMetaStats.length === 0 ? (
                      <div className="rounded-xl bg-white p-4 text-sm text-zinc-600">
                        データなし
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl bg-white">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-zinc-600">
                              <th className="px-3 py-2">順位</th>
                              <th className="px-3 py-2">相手Pアイドル</th>
                              <th className="px-3 py-2 text-right">ステージ遭遇</th>
                              <th className="px-3 py-2 text-right">全体遭遇</th>
                              <th className="px-3 py-2 text-right">遭遇率</th>
                              <th className="px-3 py-2 text-right">遭遇時勝率</th>
                              <th className="px-3 py-2 text-right">勝敗</th>
                              <th className="px-3 py-2 text-right">平均相手素点</th>
                            </tr>
                          </thead>

                          <tbody>
                            {shownStageMetaStats.map((stat, index) => (
                              <tr key={`${stage}-${stat.idolName}`} className="border-b last:border-b-0">
                                <td className="px-3 py-2 text-xs text-zinc-600">
                                  #{index + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <IdolNameWithIcon
                                    idolName={stat.idolName}
                                    idolImageMap={idolImageMap}
                                  />
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  {stat.stageCounts?.[stage] || 0}回
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {stat.count}回
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {stat.encounterRate}%
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  {stat.winRate}%
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {stat.winCount}勝 {stat.loseCount}敗
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {stat.averageEnemyScore.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
  );
}
