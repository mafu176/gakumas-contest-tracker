export default function SaveConfirmModal({
  open,
  saveWarnings,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">保存前チェック</h2>

            <p className="mt-2 text-sm text-zinc-600">
              入力漏れ・スコア異常の可能性があります。このまま保存することもできます。
            </p>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {saveWarnings.map((warning, index) => (
                <li key={index} className="rounded-xl bg-zinc-100 p-3">
                  {warning}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => onCancel()}
                className="rounded-2xl border px-5 py-3 font-semibold"
              >
                戻って修正
              </button>

              <button
                onClick={onConfirm}
                className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white"
              >
                そのまま保存
              </button>
            </div>
          </div>
        </div>
  );
}
