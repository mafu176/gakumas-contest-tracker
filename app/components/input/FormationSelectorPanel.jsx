export default function FormationSelectorPanel({
  formationVisible,
  formationName,
  setFormationName,
  saveCurrentFormation,
  formationTemplates,
  mySlots,
  loadFormation,
  deleteFormation,
  slotGroups,
  activeTab,
  slotValues,
  openIdolSelectModal,
  selectedSlot,
  getIdolImage,
  search,
  setSearch,
  filteredIdols,
  selectIdolForSlot,
  getIdolDisplayName,
  planClass,
}) {
  return (
    <>
      <section className={`${formationVisible ? "" : "hidden"} rounded-3xl border bg-zinc-50 p-4`}>
        <h3 className="font-semibold">自分編成テンプレ</h3>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border px-3 py-2"
            placeholder="編成名を入力"
            value={formationName}
            onChange={(e) => setFormationName(e.target.value)}
          />

          <button
            onClick={saveCurrentFormation}
            className="rounded-2xl bg-zinc-900 px-5 py-2 font-semibold text-white"
          >
            現在の自分編成を保存
          </button>
        </div>

        {formationTemplates.length === 0 ? (
          <div className="mt-4 text-sm text-zinc-500">
            保存済みの編成テンプレはまだありません。
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {formationTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border bg-white p-4"
              >
                <div className="font-semibold">{template.name}</div>

                <div className="mt-2 text-xs text-zinc-500">
                  {mySlots
                    .map((slot) => template.slots?.[slot])
                    .filter(Boolean)
                    .join(" / ") || "未登録"}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => loadFormation(template)}
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    読み込み
                  </button>

                  <button
                    onClick={() => deleteFormation(template.id)}
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {slotGroups
          .filter((group) => activeTab !== "formation" || group.slots === mySlots)
          .map((group) => (
          <div key={group.title} className="rounded-3xl border p-4">
            <h3 className="mb-3 font-semibold">{group.title}</h3>

            <div className="space-y-3">
              {group.slots.map((slot) => {
                const idol = slotValues[slot];

                return (
                  <button
                    key={slot}
                    onClick={() => openIdolSelectModal(slot)}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selectedSlot === slot ? "ring-2 ring-zinc-900" : ""
                    }`}
                  >
                    <div className="text-sm text-zinc-500">{slot}</div>

                    {idol ? (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                          {getIdolImage(idol) ? (
                            <img
                              src={getIdolImage(idol)}
                              alt={idol.name || idol.short || "idol"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {idol.name}
                          </div>
                          <div className="truncate text-sm text-zinc-500">
                            {idol.short} / {idol.plan}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-zinc-400">未選択</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden">
        <h2 className="text-xl font-semibold">アイドル選択</h2>

        <p className="mt-1 text-sm text-zinc-500">
          選択中：{selectedSlot}
        </p>

        <input
          className="my-4 w-full rounded-2xl border px-3 py-2"
          placeholder="名前・略称で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="grid max-h-[650px] grid-cols-2 gap-3 overflow-y-auto">
          {filteredIdols.map((idol) => (
            <button
              key={idol.id}
              onClick={() => selectIdolForSlot(idol)}
              className="rounded-2xl border p-3 text-left hover:bg-zinc-50"
            >
              <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-zinc-200 text-center text-sm text-zinc-600">
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
                  <span className="p-2">{idol.short}</span>
                )}
              </div>

              <div className="mt-2 text-sm font-semibold">
                {getIdolDisplayName(idol)}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {idol.character}
              </div>

              <div
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planClass(
                  idol.plan
                )}`}
              >
                {idol.plan}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
