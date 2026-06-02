export default function PageHeader({
  saveStatus,
  shareStatsConsentAsked,
  shareStatsEnabled,
  setShareStatsEnabled,
  setShareStatsConsentAsked,
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold md:text-3xl text-zinc-900">
        学マス コンテスト戦績トラッカー
      </h1>

      {!shareStatsConsentAsked && (
        <div className="mt-4 rounded-2xl border bg-zinc-50 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={shareStatsEnabled}
              onChange={(e) => {
                setShareStatsEnabled(e.target.checked);
                setShareStatsConsentAsked(true);
              }}
            />
            <span>
              <span className="font-semibold">戦績データ共有に協力する</span>
              <span className="mt-1 block text-xs text-zinc-600">
                ONにすると、保存時にサービス改善および利用状況分析のための戦績情報や編成情報を送信します。
                送信は設定画面からいつでも無効化できます。
              </span>
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              setShareStatsEnabled(false);
              setShareStatsConsentAsked(true);
            }}
            className="mt-3 rounded-xl border px-3 py-2 text-sm font-semibold"
          >
            今は協力しない
          </button>
        </div>
      )}
    </section>
  );
}
