export default function PositionSummaryPanel({
  visible,
  positionSummaries,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">位置別サマリー</h2>
            <p className="mt-1 text-sm text-zinc-500">
              上殴り / 中殴り / 下殴りごとの勝率と試合数を確認できます。
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

                <div className="mt-2 text-xs text-zinc-500">
                  {summary.winCount}勝 {summary.loseCount}敗
                </div>
              </div>
            ))}
          </div>
        </section>
  );
}
