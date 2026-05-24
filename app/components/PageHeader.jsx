export default function PageHeader({
  saveStatus,
  shareStatsConsentAsked,
  shareStatsEnabled,
  setShareStatsEnabled,
  setShareStatsConsentAsked,
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold md:text-3xl">
        学マス コンテスト戦績トラッカー
      </h1>

      <p className="mt-2 text-zinc-600">
        OCR・素点/プラス点・編成テンプレ対応版
      </p>

      {saveStatus && (
        <p className="mt-3 text-sm text-zinc-500">{saveStatus}</p>
      )}

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
              <span className="font-semibold">匿名統計に協力する</span>
              <span className="mt-1 block text-xs text-zinc-500">
                ONにすると、保存時に匿名化した戦績だけを統計用に送信します。
                自分側・相手側のアイドル名と内部IDは、全体使用率や得点傾向の匿名統計用に送信します。
                個人メモ・編成テンプレ名は送信しません。
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
