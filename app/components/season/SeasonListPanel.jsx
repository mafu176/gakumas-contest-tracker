export default function SeasonListPanel({
  seasonPresets,
  filteredSeasonPresets,
  seasonSort,
  setSeasonSort,
  seasonSearch,
  setSeasonSearch,
  toggleSeasonCollapse,
  collapsedSeasonIds,
  seasonStatsMap,
  stages,
  loadSeasonPreset,
  duplicateSeasonPreset,
  editSeasonPreset,
  scrollToSeasonManagement,
  deleteSeasonPreset,
}) {
  if (seasonPresets.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-zinc-600">
          シーズン一覧：{filteredSeasonPresets.length} / {seasonPresets.length}件
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={seasonSort}
            onChange={(e) => setSeasonSort(e.target.value)}
          >
            <option value="startDesc">開始日が新しい順</option>
            <option value="startAsc">開始日が古い順</option>
          </select>

          <input
            className="rounded-xl border px-3 py-2 text-sm md:w-80"
            placeholder="シーズン検索（名前・期間・メモ）"
            value={seasonSearch}
            onChange={(e) => setSeasonSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredSeasonPresets.length === 0 ? (
        <div className="rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-500">
          条件に一致するシーズンはありません。
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSeasonPresets.map((season) => (
        <div key={season.id} className="rounded-2xl border bg-zinc-50 p-4">
          <button
            type="button"
            onClick={() => toggleSeasonCollapse(season.id)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <div className="font-semibold">{season.name}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {season.startDate} ～ {season.endDate}
              </div>
            </div>

            <div className="shrink-0 text-sm font-semibold text-zinc-500">
              {collapsedSeasonIds.includes(season.id) ? "▶" : "▼"}
            </div>
          </button>

          {!collapsedSeasonIds.includes(season.id) && (
            <div className="mt-3">
              <div className="flex gap-3 text-xs font-semibold text-zinc-600">
                <span>
                  試合数 {seasonStatsMap[season.id]?.count ?? 0}
                </span>

                <span>
                  勝率 {seasonStatsMap[season.id]?.winRate ?? 0}%
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {stages.map((stage) => (
                  <span
                    key={stage}
                    className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                  >
                    S{stage}: {season.stageTypes?.[stage] || "未設定"}
                  </span>
                ))}
              </div>

              {(season.finalPoint || season.finalRank) && (
                <div className="mt-1 text-xs text-zinc-500">
                  {season.finalPoint ? `${season.finalPoint}pt` : "pt未入力"} /{" "}
                  {season.finalRank ? `${season.finalRank}位` : "順位未入力"}
                </div>
              )}

              {season.memo && (
                <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                  {season.memo}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => loadSeasonPreset(season)}
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  分析対象にする
                </button>

                <button
                  onClick={() => duplicateSeasonPreset(season)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  複製
                </button>

                <button
                  onClick={() => {
                    editSeasonPreset(season);
                    scrollToSeasonManagement();
                  }}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  編集
                </button>

                <button
                  onClick={() => deleteSeasonPreset(season.id)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  削除
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
        </div>
      )}
    </div>
  );
}
