export default function AnalysisPresetPanel({
  visible,
  analysisPresetName,
  setAnalysisPresetName,
  saveAnalysisPreset,
  analysisPresets,
  loadAnalysisPreset,
  deleteAnalysisPreset,
}) {
  return (
    <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">分析条件保存</h2>
          <p className="mt-1 text-sm text-zinc-500">
            日数・最低採用数・ソート・位置フィルタを保存できます。日数未入力なら全期間です。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="分析条件名"
            value={analysisPresetName}
            onChange={(e) => setAnalysisPresetName(e.target.value)}
          />

          <button
            onClick={saveAnalysisPreset}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            現在の分析条件を保存
          </button>
        </div>
      </div>

      {analysisPresets.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-500">
          保存済みの分析条件はまだありません。
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {analysisPresets.map((preset) => (
            <div key={preset.id} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="font-semibold">{preset.name}</div>

              <div className="mt-2 text-xs text-zinc-500">
                {preset.analysisPosition || "全体"} / 直近
                {preset.analysisDays ? `${preset.analysisDays}日` : "全期間"} / 最低採用
                {preset.analysisMinCount === "" ? "なし" : preset.analysisMinCount} /{" "}
                {preset.analysisSort || "averageCombined"}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => loadAnalysisPreset(preset)}
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  読み込み
                </button>

                <button
                  onClick={() => deleteAnalysisPreset(preset.id)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
