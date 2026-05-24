export default function DeveloperPanel({
  visible,
  showIdolManager,
  setShowIdolManager,
  customIdolName,
  setCustomIdolName,
  customIdolVariant,
  setCustomIdolVariant,
  customIdolShort,
  setCustomIdolShort,
  customIdolCharacter,
  setCustomIdolCharacter,
  customIdolPlan,
  setCustomIdolPlan,
  customIdolImage,
  setCustomIdolImage,
  handleCustomIdolImageFile,
  idolDbSummary,
  idolChecklistText,
  setIdolChecklistText,
  idolChecklist,
  saveCustomIdol,
  customIdols,
  getIdolKey,
  getIdolImage,
  getIdolDisplayName,
  planClass,
  deleteCustomIdol,
}) {
  return (
    <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
      <button
        onClick={() => setShowIdolManager(!showIdolManager)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">詳細設定：アイドル追加</h2>
          <p className="mt-1 text-sm text-zinc-600">
            通常は管理者が登録した公式DBを使います。未登録Pアイドルだけ、必要に応じて追加できます。
          </p>
        </div>

        <span className="text-sm text-zinc-600">
          {showIdolManager ? "閉じる" : "開く"}
        </span>
      </button>

      {showIdolManager && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border px-3 py-2 text-sm"
              placeholder="アイドル名 例: 花海咲季"
              value={customIdolName}
              onChange={(e) => setCustomIdolName(e.target.value)}
            />

            <input
              className="rounded-xl border px-3 py-2 text-sm"
              placeholder="種類 例: Fighting My Way"
              value={customIdolVariant}
              onChange={(e) => setCustomIdolVariant(e.target.value)}
            />

            <input
              className="rounded-xl border px-3 py-2 text-sm"
              placeholder="略称（任意）"
              value={customIdolShort}
              onChange={(e) => setCustomIdolShort(e.target.value)}
            />

            <input
              className="rounded-xl border px-3 py-2 text-sm"
              placeholder="キャラ名（任意）"
              value={customIdolCharacter}
              onChange={(e) => setCustomIdolCharacter(e.target.value)}
            />

            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={customIdolPlan}
              onChange={(e) => setCustomIdolPlan(e.target.value)}
            >
              <option value="未設定">未設定</option>
              <option value="センス">センス</option>
              <option value="ロジック">ロジック</option>
              <option value="アノマリー">アノマリー</option>
            </select>

            <div className="space-y-2">
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="画像パス/URL（任意）"
                value={customIdolImage.startsWith("data:") ? "画像ファイル登録済み" : customIdolImage}
                onChange={(e) => setCustomIdolImage(e.target.value)}
              />

              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                onChange={handleCustomIdolImageFile}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs text-zinc-600">登録合計</div>
                <div className="text-xl font-bold">{idolDbSummary.total}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">公式DB</div>
                <div className="text-xl font-bold">{idolDbSummary.officialCount}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">追加分</div>
                <div className="text-xl font-bold">{idolDbSummary.customCount}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">画像あり</div>
                <div className="text-xl font-bold">{idolDbSummary.withImage}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">画像なし</div>
                <div className="text-xl font-bold">{idolDbSummary.withoutImage}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="font-semibold">登録チェック</div>
            <p className="mt-1 text-xs text-zinc-600">
              確認したいキャラ名を改行区切りで入力すると、登録有無を確認できます。新アイドル追加時の確認用です。
            </p>

            <textarea
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
              rows={4}
              placeholder={"花海咲季\n月村手毬\n藤田ことね"}
              value={idolChecklistText}
              onChange={(e) => setIdolChecklistText(e.target.value)}
            />

            {idolChecklist.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {idolChecklist.map((item) => (
                  <div
                    key={item.name}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      item.registered
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    <div className="font-semibold">
                      {item.registered ? "OK" : "未登録"}：{item.name}
                    </div>
                    <div className="text-xs opacity-80">
                      登録種類数：{item.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <button
              onClick={saveCustomIdol}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white md:w-fit"
            >
              アイドルを追加 / 更新
            </button>

            <p className="text-xs text-zinc-600">
              URLに頼らず、画像ファイルを直接登録できます。内部IDは「アイドル名＋種類」から自動生成します。
            </p>
          </div>

          {customIdols.length === 0 ? (
            <p className="text-sm text-zinc-600">
              追加アイドルはまだありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {customIdols.map((idol) => {
                const idolId = getIdolKey(idol);

                return (
                  <div key={idolId} className="rounded-2xl border bg-zinc-50 p-4">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-200">
                        {getIdolImage(idol) ? (
                          <img
                            src={getIdolImage(idol)}
                            alt={getIdolDisplayName(idol)}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {getIdolDisplayName(idol)}
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-600">
                          {idolId}
                        </div>
                        <div
                          className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planClass(
                            idol.plan
                          )}`}
                        >
                          {idol.plan}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteCustomIdol(idolId)}
                      className="mt-3 rounded-xl border px-3 py-2 text-sm font-semibold"
                    >
                      削除
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
