export default function PositionSummaryPanel({
  visible,
  analysisPosition,
  analysisStartDate,
  analysisEndDate,
  analysisDays,
  analysisRecords,
  positionSummaries,
}) {
  const targetText = analysisStartDate || analysisEndDate
    ? `${analysisStartDate || "開始未指定"}～${analysisEndDate || "終了未指定"}`
    : analysisDays
      ? `直近${analysisDays}日`
      : "全期間";

  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-zinc-900">位置別サマリー</h2>
            <p className="mt-1 text-sm text-zinc-600">
              上殴り / 中殴り / 下殴りごとの勝率と試合数を確認できます。
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              対象：{analysisPosition} / {targetText} / {analysisRecords.length}戦
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {positionSummaries.map((summary) => (
              <div
                key={summary.position}
                className="rounded-2xl border bg-zinc-50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{summary.position}</div>
                  <div className="text-lg font-black text-zinc-900">
                    {summary.winRate.toFixed(1)}%
                  </div>
                </div>

                <div className="mt-2 text-xs text-zinc-600">
                  {summary.winCount}勝 {summary.loseCount}敗
                </div>
              </div>
            ))}
          </div>
        </section>
  );
}
