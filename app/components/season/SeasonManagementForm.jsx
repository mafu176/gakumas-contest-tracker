export default function SeasonManagementForm({
  visible,
  selectedSeasonId,
  setSelectedSeasonId,
  seasonPresets,
  editingSeasonId,
  resetSeasonForm,
  seasonName,
  setSeasonName,
  seasonStartDate,
  setSeasonStartDate,
  seasonEndDate,
  setSeasonEndDate,
  seasonFinalPoint,
  setSeasonFinalPoint,
  seasonFinalRank,
  setSeasonFinalRank,
  stages,
  seasonStageTypes,
  updateSeasonStageType,
  stageTypeOptions,
  seasonMemo,
  setSeasonMemo,
  saveSeasonPreset,
  selectedSeason,
}) {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">シーズン管理</h2>
          <p className="mt-1 text-sm text-zinc-500">
            シーズンごとに期間とメモを保存できます。分析対象シーズンを選ぶと、その期間だけで集計します。
          </p>
        </div>

        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
        >
          <option value="all">全期間 / 日数指定</option>
          {seasonPresets.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </div>

      {editingSeasonId && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">シーズン編集中</div>
            <div className="mt-1 text-xs">
              入力欄を変更して「シーズンを更新」を押すと、選択中のシーズンを上書きします。
            </div>
          </div>

          <button
            type="button"
            onClick={resetSeasonForm}
            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold"
          >
            編集をキャンセル
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="シーズン名"
          value={seasonName}
          onChange={(e) => setSeasonName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className="rounded-xl border px-3 py-2 text-sm"
            value={seasonStartDate}
            onChange={(e) => setSeasonStartDate(e.target.value)}
          />

          <input
            type="date"
            className="rounded-xl border px-3 py-2 text-sm"
            value={seasonEndDate}
            onChange={(e) => setSeasonEndDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="最終獲得ポイント（任意）"
            value={seasonFinalPoint}
            onChange={(e) => setSeasonFinalPoint(e.target.value)}
          />

          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="最終順位（任意）"
            value={seasonFinalRank}
            onChange={(e) => setSeasonFinalRank(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:col-span-2 md:grid-cols-3">
          {stages.map((stage) => (
            <label
              key={stage}
              className="text-xs font-semibold text-zinc-500"
            >
              ステージ{stage}タイプ
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                value={seasonStageTypes[stage] || "未設定"}
                onChange={(e) =>
                  updateSeasonStageType(stage, e.target.value)
                }
              >
                {stageTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <textarea
          className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
          rows={3}
          placeholder="メモ（環境・強かった編成・反省など）"
          value={seasonMemo}
          onChange={(e) => setSeasonMemo(e.target.value)}
        />

        <button
          onClick={saveSeasonPreset}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white md:w-fit"
        >
          {editingSeasonId ? "シーズンを更新" : "シーズンを保存"}
        </button>
      </div>

      {selectedSeason && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">
            現在の分析対象：{selectedSeason.name}
          </div>
          <div className="mt-1">
            期間：{selectedSeason.startDate} ～ {selectedSeason.endDate}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span
                key={stage}
                className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-emerald-900"
              >
                S{stage}: {selectedSeason.stageTypes?.[stage] || "未設定"}
              </span>
            ))}
          </div>
          {(selectedSeason.finalPoint || selectedSeason.finalRank) && (
            <div className="mt-1">
              最終結果：
              {selectedSeason.finalPoint ? `${selectedSeason.finalPoint}pt` : "pt未入力"}
              {" / "}
              {selectedSeason.finalRank ? `${selectedSeason.finalRank}位` : "順位未入力"}
            </div>
          )}
          {selectedSeason.memo && (
            <div className="mt-2 whitespace-pre-wrap">
              メモ：{selectedSeason.memo}
            </div>
          )}
        </div>
      )}
    </>
  );
}
