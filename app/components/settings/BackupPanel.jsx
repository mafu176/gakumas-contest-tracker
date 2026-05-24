export default function BackupPanel({
  visible,
  showBackup,
  setShowBackup,
  records,
  seasonPresets,
  formationTemplates,
  customIdols,
  analysisPresets,
  backupStatus,
  exportBackup,
  importBackup,
}) {
  return (
    <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
      <button
        onClick={() => setShowBackup(!showBackup)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-xl font-semibold">バックアップ / 復元</h2>

        <span className="text-sm text-zinc-500">
          {showBackup ? "閉じる" : "開く"}
        </span>
      </button>

      {showBackup && (
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              対戦履歴・編成テンプレ・分析条件をJSONで保存できます。
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="text-zinc-500">対戦</div>
                <div className="mt-1 text-lg font-bold">{records.length}件</div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="text-zinc-500">シーズン</div>
                <div className="mt-1 text-lg font-bold">{seasonPresets.length}件</div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="text-zinc-500">編成テンプレ</div>
                <div className="mt-1 text-lg font-bold">{formationTemplates.length}件</div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="text-zinc-500">カスタムアイドル</div>
                <div className="mt-1 text-lg font-bold">{customIdols.length}件</div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="text-zinc-500">分析条件</div>
                <div className="mt-1 text-lg font-bold">{analysisPresets.length}件</div>
              </div>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              書き出し時は現在の件数がそのままJSONに保存されます。復元後は件数付きで結果を表示します。
            </p>

            {backupStatus && (
              <p className="mt-2 rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
                {backupStatus}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={exportBackup}
              className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white"
            >
              バックアップを書き出し
            </button>

            <label className="cursor-pointer rounded-2xl border px-5 py-3 text-center font-semibold">
              バックアップを復元
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={importBackup}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
