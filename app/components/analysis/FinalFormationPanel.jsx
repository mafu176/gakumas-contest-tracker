import { formatSeasonTypeLabel } from "../../lib/seasonTypes";

export default function FinalFormationPanel({
  visible,
  analysisPosition,
  analysisStartDate,
  analysisEndDate,
  analysisDays,
  analysisRecords,
  analysisSummary,
  stages,
}) {
  const formatRank = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric.toFixed(3) : "-";
  };
  const targetText = analysisStartDate || analysisEndDate
    ? `${analysisStartDate || "開始未指定"}～${analysisEndDate || "終了未指定"}`
    : analysisDays
      ? `直近${analysisDays}日`
      : "全期間";

  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">最終編成</h2>
              <p className="mt-1 text-sm text-zinc-600">
                分析対象内で最後に記録した自分編成と、その平均素点・平均順位を表示します。
              </p>
            </div>

            <div className="text-xs text-zinc-600">
              対象：{analysisPosition} / {targetText} / {analysisRecords.length}戦
            </div>
          </div>

          {analysisSummary.finalFormation.length === 0 ? (
            <div className="rounded-2xl border bg-zinc-50 p-5 text-sm text-zinc-600">
              最終編成を表示できる対戦データがまだありません。
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {stages.map((stage) => {
                const slots = analysisSummary.finalFormation.filter(
                  (slot) => slot.stage === stage
                );

                return (
                  <div key={stage} className="rounded-2xl border bg-zinc-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="font-semibold">ステージ{stage}</div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                        {formatSeasonTypeLabel(analysisSummary.stageTypes?.[stage])}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <div
                          key={`${slot.stage}-${slot.member}`}
                          className={`rounded-2xl border bg-white p-2 ${
                            slot.isTopScore && slot.isTopRank
                              ? "border-yellow-300 bg-yellow-50"
                              : slot.isTopScore
                                ? "border-amber-200 bg-amber-50"
                                : slot.isTopRank
                                  ? "border-emerald-200 bg-emerald-50"
                                  : ""
                          }`}
                        >
                          <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100">
                            {slot.image ? (
                              <img
                                src={slot.image}
                                alt={slot.idol || "idol"}
                                className="h-auto w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                                {slot.idol ? "No Image" : "編成なし"}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 truncate text-xs font-semibold">
                            {slot.idol || "編成なし"}
                          </div>

                          <div className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
                            <div>
                              素点 {slot.averageBaseScore ? slot.averageBaseScore.toLocaleString() : "-"}
                            </div>
                            <div>
                              順位 {formatRank(slot.averageRank)}
                            </div>
                          </div>

                          {slot.badge && (
                            <div className="mt-1 text-xs font-bold">
                              {slot.badge}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
  );
}
