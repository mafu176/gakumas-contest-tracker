function getSeasonTypeChipKind(stageType) {
  if (stageType === "センス") return "sense";
  if (stageType === "ロジック") return "logic";
  if (stageType === "アノマリー") return "anomaly";
  return "unset";
}

export default function BattleInputPanel({
  visible,
  loadedRecordId,
  cancelLoadedRecordEdit,
  selectedSeason,
  stages,
  opponent,
  setOpponent,
  opponentReuseOptions = [],
  onSelectPastOpponent,
  onClearPastOpponent,
  battleDate,
  setBattleDate,
  position,
  setPosition,
  positionOptions,
  manualResult,
  setManualResult,
  autoResult,
  resultOptions,
  point,
  setPoint,
  stageResults,
  children,
  members,
  stageDetails,
  updateStageDetail,
  setStageDetails,
  getSelectedMyIdol,
  getSelectedEnemyIdol,
  slotValues,
  getIdolImage,
  handleSaveClick,
}) {
  return (
    <div className="w-full space-y-6 rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">対戦入力</h2>

        {loadedRecordId && (
          <button
            type="button"
            onClick={cancelLoadedRecordEdit}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
          >
            履歴更新モードを解除
          </button>
        )}
      </div>

      {loadedRecordId && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-bold">過去履歴更新モード</div>
              <div className="mt-1 text-xs text-amber-800">
                ID: {loadedRecordId} を入力欄へ読み込み中です。「この対戦を更新」を押すと新規追加ではなく、この履歴を上書きします。
              </div>
            </div>

            <button
              type="button"
              onClick={cancelLoadedRecordEdit}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
            >
              更新モード解除
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">
              現在のシーズンタイプ設定
            </div>
            <div className="mt-1 text-xs text-amber-800">
              シーズンタブで選択中のシーズン設定を表示しています。アイドル選択時は該当ステージのタイプを上に表示します。
            </div>
          </div>

          <div className="text-xs font-semibold text-amber-800">
            {selectedSeason ? selectedSeason.name : "シーズン未選択"}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {stages.map((stage) => (
            <span
              key={stage}
              data-stage-type={getSeasonTypeChipKind(
                selectedSeason?.stageTypes?.[stage]
              )}
              className="current-season-type-chip rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm"
            >
              S{stage}: {selectedSeason?.stageTypes?.[stage] || "未設定"}
            </span>
          ))}
        </div>
      </div>

      <div className={`${visible ? "" : "hidden"} grid grid-cols-1 gap-4 md:grid-cols-5`}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-700">
            対戦日
          </span>
          <input
            type="date"
            className="w-full rounded-2xl border p-4"
            value={battleDate}
            onChange={(e) => setBattleDate(e.target.value)}
          />
          <span className="mt-1 block text-xs leading-5 text-zinc-600">
            通常は当日の日付のままでOK。過去分を入力する時だけ変更してください。
          </span>
        </label>

        <div className="space-y-2">
          <input
            className="w-full rounded-2xl border p-4"
            placeholder="相手プレイヤー名"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-2xl border px-3 py-2 text-sm"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                onSelectPastOpponent?.(e.target.value);
              }}
            >
              <option value="">過去相手を選択</option>
              {opponentReuseOptions.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClearPastOpponent}
              className="shrink-0 rounded-2xl border px-3 py-2 text-sm font-semibold text-zinc-700"
            >
              クリア
            </button>
          </div>
        </div>

        <select
          className="rounded-2xl border p-4"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          {positionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="rounded-2xl border p-4"
          value={manualResult}
          onChange={(e) => setManualResult(e.target.value)}
        >
          <option value="">自動判定: {autoResult === "-" ? "未判定" : autoResult}</option>
          {resultOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          className="rounded-2xl border p-4"
          placeholder="獲得pt"
          value={point}
          onChange={(e) => setPoint(e.target.value)}
        />
      </div>

      <section className={`${visible ? "" : "hidden"} rounded-3xl border bg-zinc-50 p-4`}>
        <h3 className="mb-3 font-semibold text-zinc-800">ステージ勝敗</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {stageResults.map((item) => (
            <div key={item.stage} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">ステージ{item.stage}</div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.result === "勝利"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.result === "敗北"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {item.result}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">
                    自分合計
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900">
                    {item.myTotal.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">
                    相手合計
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900">
                    {item.enemyTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-zinc-600">差分</span>
                <span
                  className={`font-bold ${
                    item.diff > 0
                      ? "text-emerald-700"
                      : item.diff < 0
                        ? "text-rose-700"
                        : "text-zinc-700"
                  }`}
                >
                  {item.diff > 0 ? "+" : ""}
                  {item.diff.toLocaleString()}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                <div>
                  自分 素点 {item.myBaseTotal.toLocaleString()}
                </div>
                <div>
                  相手 素点 {item.enemyBaseTotal.toLocaleString()}
                </div>
                <div>
                  自分 +{item.myBonus.toLocaleString()}
                </div>
                <div>
                  相手 +{item.enemyBonus.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {children}

      <section className={`${visible ? "" : "hidden"} rounded-3xl border bg-zinc-50 p-4`}>
        <h3 className="mb-4 font-semibold text-zinc-800">スコア・順位入力</h3>

        <div className="space-y-5">
          {stages.map((stage) => (
            <div key={`stage-score-${stage}`} className="rounded-2xl bg-white p-4">
              <div className="mb-4 border-b pb-2 text-lg font-semibold">
                ステージ{stage}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border bg-zinc-50 p-4">
                  <div className="mb-3 font-semibold">自分側</div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {members.map((member) => {
                      const idol = getSelectedMyIdol(
                        stage,
                        member,
                        slotValues
                      );

                      return (
                        <div
                          key={`stage-${stage}-my-${member}`}
                          className="rounded-2xl border bg-white p-4"
                        >
                          <div className="mb-2 text-sm font-medium">
                            {member}人目
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                              {idol && getIdolImage(idol) ? (
                                <img
                                  src={getIdolImage(idol)}
                                  alt={idol.name || idol.short || "idol"}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600">
                                  {idol ? "No Image" : "編成なし"}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 text-sm">
                              <div className="truncate font-semibold text-zinc-700">
                                {idol ? idol.short : "編成なし"}
                              </div>
                              {idol?.plan && (
                                <div className="truncate text-xs text-zinc-600">
                                  {idol.plan}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                                スコア
                              </span>
                              <input
                                className="w-full rounded-xl border px-3 py-2 text-base"
                                placeholder="例: 161,804"
                                value={stageDetails[`s${stage}_my${member}_score`]}
                                onChange={(e) =>
                                  updateStageDetail(
                                    stage,
                                    member,
                                    "score",
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                                順位
                              </span>
                              <input
                                className="w-full rounded-xl border px-3 py-2 text-base"
                                placeholder="例: 1"
                                value={stageDetails[`s${stage}_my${member}_rank`]}
                                onChange={(e) =>
                                  updateStageDetail(
                                    stage,
                                    member,
                                    "rank",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl border bg-white p-3">
                    <div className="mb-2 text-sm font-medium">
                      自分プラス点
                    </div>

                    <input
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="プラス点"
                      value={stageDetails[`s${stage}_my_bonus`]}
                      onChange={(e) =>
                        setStageDetails((prev) => ({
                          ...prev,
                          [`s${stage}_my_bonus`]: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-zinc-50 p-4">
                  <div className="mb-3 font-semibold">相手側</div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {members.map((member) => {
                      const idol = getSelectedEnemyIdol(
                        stage,
                        member,
                        slotValues
                      );

                      return (
                        <div
                          key={`stage-${stage}-enemy-${member}`}
                          className="rounded-2xl border bg-white p-4"
                        >
                          <div className="mb-2 text-sm font-medium">
                            相手{member}人目
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                              {idol && getIdolImage(idol) ? (
                                <img
                                  src={getIdolImage(idol)}
                                  alt={idol.name || idol.short || "idol"}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600">
                                  {idol ? "No Image" : "編成なし"}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 text-sm">
                              <div className="truncate font-semibold text-zinc-700">
                                {idol ? idol.short : "編成なし"}
                              </div>
                              {idol?.plan && (
                                <div className="truncate text-xs text-zinc-600">
                                  {idol.plan}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                                スコア
                              </span>
                              <input
                                className="w-full rounded-xl border px-3 py-2 text-base"
                                placeholder="例: 365,073"
                                value={
                                  stageDetails[`s${stage}_enemy${member}_score`]
                                }
                                onChange={(e) =>
                                  setStageDetails((prev) => ({
                                    ...prev,
                                    [`s${stage}_enemy${member}_score`]:
                                      e.target.value,
                                  }))
                                }
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-zinc-600">
                                順位
                              </span>
                              <input
                                className="w-full rounded-xl border px-3 py-2 text-base"
                                placeholder="例: 1"
                                value={
                                  stageDetails[`s${stage}_enemy${member}_rank`]
                                }
                                onChange={(e) =>
                                  setStageDetails((prev) => ({
                                    ...prev,
                                    [`s${stage}_enemy${member}_rank`]:
                                      e.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl border bg-white p-3">
                    <div className="mb-2 text-sm font-medium">
                      相手プラス点
                    </div>

                    <input
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="プラス点"
                      value={stageDetails[`s${stage}_enemy_bonus`]}
                      onChange={(e) =>
                        setStageDetails((prev) => ({
                          ...prev,
                          [`s${stage}_enemy_bonus`]: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={handleSaveClick}
        className={`${visible ? "" : "hidden"} w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white`}
      >
        {loadedRecordId ? "この対戦を更新" : "この対戦を保存"}
      </button>
    </div>
  );
}
