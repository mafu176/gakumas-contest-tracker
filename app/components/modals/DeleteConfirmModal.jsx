export default function DeleteConfirmModal({
  deleteTarget,
  onCancel,
  onConfirm,
}) {
  if (!deleteTarget) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900">履歴を削除しますか？</h2>

            <p className="mt-2 text-sm text-zinc-600">
              Sheets側とローカル履歴の両方から削除します。
            </p>

            <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm">
              <div>相手：{deleteTarget.opponent || "未入力"}</div>
              <div>位置：{deleteTarget.position || "-"}</div>
              <div>勝敗：{deleteTarget.result || "-"}</div>
              <div>pt：{deleteTarget.point || "-"}</div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => onCancel()}
                className="rounded-2xl border px-5 py-3 font-semibold"
              >
                キャンセル
              </button>

              <button
                onClick={onConfirm}
                className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
  );
}
