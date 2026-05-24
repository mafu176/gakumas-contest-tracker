import SeasonWinTriangle from "../SeasonWinTriangle";

export default function AnalysisGraphPanel({
  visible,
  analysisStartDate,
  analysisEndDate,
  analysisDays,
  selectedSeason,
  analysisRecords,
  seasonSummary,
  stages,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">勝率三角図</h2>
              <p className="mt-1 text-sm text-zinc-500">
                ステージ1/2/3の勝率を三角形で比較します。中央は全体勝率です。
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                対象：{analysisStartDate || analysisEndDate
                  ? `${analysisStartDate || "開始未指定"}～${analysisEndDate || "終了未指定"}`
                  : analysisDays
                    ? `直近${analysisDays}日`
                    : selectedSeason
                      ? selectedSeason.name
                      : "全期間"} / {analysisRecords.length}戦
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-zinc-950 p-3 text-white">
            <div className="relative mx-auto min-h-[340px] w-full max-w-[680px] overflow-visible">
              <SeasonWinTriangle
                stage1WinRate={seasonSummary.stageWinRates?.[1] || 0}
                stage2WinRate={seasonSummary.stageWinRates?.[2] || 0}
                stage3WinRate={seasonSummary.stageWinRates?.[3] || 0}
                totalWinRate={seasonSummary.winRate}
                stageTypes={seasonSummary.stageTypes}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {stages.map((stage) => {
              const summary = seasonSummary.stageSummaries?.[stage] || {
                total: 0,
                winCount: 0,
                loseCount: 0,
                drawCount: 0,
                winRate: 0,
              };

              return (
                <div
                  key={stage}
                  className="rounded-2xl border bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">ステージ{stage}</div>
                    <div className="text-lg font-black text-zinc-900">
                      {summary.winRate.toFixed(1)}%
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    {summary.winCount}勝 {summary.loseCount}敗
                  </div>
                </div>
              );
            })}
          </div>
        </section>
  );
}
