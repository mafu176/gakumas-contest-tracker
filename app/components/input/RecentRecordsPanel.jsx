import { Fragment } from "react";

export default function RecentRecordsPanel({
  visible,
  filteredRecentRecords,
  recentDays,
  setRecentDays,
  loadRecords,
  buildRecordStageResults,
  editingDirtyIds,
  editingId,
  updateRecord,
  positionOptions,
  resultOptions,
  stages,
  members,
  toNumber,
  normalizePosition,
  resultClass,
  loadRecordToInput,
  finishEditing,
  setEditingId,
  setDeleteTarget,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">最近の対戦</h2>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">
                {filteredRecentRecords.length}件
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">日以内</span>

              <input
                type="number"
                min="0"
                className="w-20 rounded-xl border px-3 py-2 text-sm"
                value={recentDays}
                onChange={(e) => setRecentDays(e.target.value)}
                placeholder="30"
              />

              <button
                type="button"
                onClick={() => setRecentDays("0")}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                全件
              </button>
            </div>

            <button
              onClick={loadRecords}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Sheetsから読み込み
            </button>
          </div>

          {filteredRecentRecords.length === 0 ? (
            <div className="text-zinc-500">まだ保存された対戦はありません。</div>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {filteredRecentRecords.map((record, index) => {
                  const recordStages = buildRecordStageResults(record);
                  const showDetail = index < 3;
                  const isEditingDirty = editingDirtyIds.includes(record.id);

                  return (
                    <div
                      key={record.id || index}
                      className="rounded-3xl border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>{record.id || `#${index + 1}`}</span>
                            {isEditingDirty && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                                未保存
                              </span>
                            )}
                          </div>
                          <div className="font-semibold">
                            {record.opponent || "相手未入力"}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            位置：{normalizePosition(record.position)} / pt：
                            {record.point || "-"}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${resultClass(
                            record.result
                          )}`}
                        >
                          {record.result || "-"}
                        </span>
                      </div>

                      {editingId === record.id && (
                        <div className="mt-4 space-y-4 rounded-2xl bg-zinc-50 p-3 text-sm">
                          {isEditingDirty && (
                            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                              変更があります。下の「変更を保存」を押すまで保存されません。
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              className="rounded-xl border bg-white px-3 py-2"
                              value={record.opponent || ""}
                              onChange={(e) =>
                                updateRecord(record.id, "opponent", e.target.value)
                              }
                              placeholder="相手プレイヤー名"
                            />

                            <select
                              className="rounded-xl border bg-white px-3 py-2"
                              value={normalizePosition(record.position)}
                              onChange={(e) =>
                                updateRecord(record.id, "position", e.target.value)
                              }
                            >
                              {positionOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>

                            <select
                              className="rounded-xl border bg-white px-3 py-2"
                              value={record.result || ""}
                              onChange={(e) =>
                                updateRecord(record.id, "result", e.target.value)
                              }
                            >
                              <option value="">未設定</option>
                              {resultOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>

                            <input
                              className="rounded-xl border bg-white px-3 py-2"
                              value={record.point || ""}
                              onChange={(e) =>
                                updateRecord(record.id, "point", e.target.value)
                              }
                              placeholder="獲得pt"
                            />
                          </div>

                          <div className="space-y-3">
                            {stages.map((stage) => {
                              const myBaseKey = `s${stage}_my_base_total`;
                              const enemyBaseKey = `s${stage}_enemy_base_total`;
                              const myBonusKey = `s${stage}_my_bonus`;
                              const enemyBonusKey = `s${stage}_enemy_bonus`;
                              const myTotal =
                                toNumber(record[myBaseKey]) +
                                toNumber(record[myBonusKey]);
                              const enemyTotal =
                                toNumber(record[enemyBaseKey]) +
                                toNumber(record[enemyBonusKey]);

                              return (
                                <div
                                  key={stage}
                                  className="rounded-3xl border bg-white p-4"
                                >
                                  <div className="mb-3 flex items-center justify-between gap-2">
                                    <div className="font-semibold">
                                      ステージ{stage}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      差分：{(myTotal - enemyTotal).toLocaleString()}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-zinc-500">
                                      自分素点合計
                                      <input
                                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                        value={record[myBaseKey] || ""}
                                        onChange={(e) =>
                                          updateRecord(
                                            record.id,
                                            myBaseKey,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </label>

                                    <label className="text-xs font-semibold text-zinc-500">
                                      相手素点合計
                                      <input
                                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                        value={record[enemyBaseKey] || ""}
                                        onChange={(e) =>
                                          updateRecord(
                                            record.id,
                                            enemyBaseKey,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </label>

                                    <label className="text-xs font-semibold text-zinc-500">
                                      自分プラス点
                                      <input
                                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                        value={record[myBonusKey] || ""}
                                        onChange={(e) =>
                                          updateRecord(
                                            record.id,
                                            myBonusKey,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </label>

                                    <label className="text-xs font-semibold text-zinc-500">
                                      相手プラス点
                                      <input
                                        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                        value={record[enemyBonusKey] || ""}
                                        onChange={(e) =>
                                          updateRecord(
                                            record.id,
                                            enemyBonusKey,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-5 space-y-4">
                                    <div className="text-xs font-bold tracking-wide text-zinc-500">
                                      個人スコア / 順位
                                    </div>

                                    {members.map((member) => {
                                      const myScoreKey = `s${stage}_my${member}_score`;
                                      const enemyScoreKey = `s${stage}_enemy${member}_score`;
                                      const myRankKey = `s${stage}_my${member}_rank`;
                                      const enemyRankKey = `s${stage}_enemy${member}_rank`;

                                      return (
                                        <div
                                          key={member}
                                          className="rounded-2xl bg-zinc-50 p-3"
                                        >
                                          <div className="mb-3 text-sm font-semibold text-zinc-700">
                                            メンバー{member}
                                          </div>

                                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label className="text-xs font-semibold text-zinc-500">
                                              自分スコア
                                              <input
                                                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                                value={record[myScoreKey] || ""}
                                                onChange={(e) =>
                                                  updateRecord(
                                                    record.id,
                                                    myScoreKey,
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </label>

                                            <label className="text-xs font-semibold text-zinc-500">
                                              相手スコア
                                              <input
                                                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                                value={record[enemyScoreKey] || ""}
                                                onChange={(e) =>
                                                  updateRecord(
                                                    record.id,
                                                    enemyScoreKey,
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </label>

                                            <label className="text-xs font-semibold text-zinc-500">
                                              自分順位
                                              <input
                                                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                                value={record[myRankKey] || ""}
                                                onChange={(e) =>
                                                  updateRecord(
                                                    record.id,
                                                    myRankKey,
                                                    e.target.value
                                                  )
                                                }
                                              />
                                            </label>

                                            <label className="text-xs font-semibold text-zinc-500">
                                              相手順位
                                              <input
                                                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                                value={record[enemyRankKey] || ""}
                                                onChange={(e) =>
                                                  updateRecord(
                                                    record.id,
                                                    enemyRankKey,
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

                                  <div className="mt-4 text-xs text-zinc-500">
                                    表示合計：自分 {myTotal.toLocaleString()} / 相手 {enemyTotal.toLocaleString()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {showDetail && (
                        <div className="mt-4 space-y-3">
                          {recordStages.map((item) => (
                          <div
                            key={item.stage}
                            className="rounded-2xl bg-zinc-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="font-semibold">
                                ステージ{item.stage}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${resultClass(
                                  item.result
                                )}`}
                              >
                                {item.result}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-zinc-500">
                                  自分合計
                                </div>
                                <div className="font-semibold">
                                  {item.myTotal.toLocaleString()}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-500">
                                  相手合計
                                </div>
                                <div className="font-semibold">
                                  {item.enemyTotal.toLocaleString()}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-500">
                                  差分
                                </div>
                                <div className="font-semibold">
                                  {item.diff.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => loadRecordToInput(record)}
                          className="min-w-24 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-800"
                        >
                          読込
                        </button>

                        <button
                          onClick={() => {
                            if (editingId === record.id) {
                              finishEditing(record);
                            } else {
                              setEditingId(record.id);
                            }
                          }}
                          className="min-w-24 rounded-xl bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white"
                        >
                          {editingId === record.id ? "保存" : "編集"}
                        </button>

                        <button
                          onClick={() => setDeleteTarget({ ...record, index })}
                          className="min-w-24 rounded-xl border border-rose-200 bg-white px-4 py-2 text-center text-sm font-semibold text-rose-600"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="py-2">対戦</th>
                      <th>結果</th>
                      <th>ステージ1</th>
                      <th>ステージ2</th>
                      <th>ステージ3</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecentRecords.map((record, index) => {
                      const isEditingDirty = editingDirtyIds.includes(record.id);
                      const recordStages = buildRecordStageResults(record);
                      const showDetail = index < 3;

                      return (
                      <Fragment key={record.id || index}>
                      <tr className="border-b">
                        <td className="py-2">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold">
                              {editingId === record.id ? (
                                <input
                                  className="rounded border px-2 py-1"
                                  value={record.opponent || ""}
                                  onChange={(e) =>
                                    updateRecord(
                                      record.id,
                                      "opponent",
                                      e.target.value
                                    )
                                  }
                                  placeholder="相手"
                                />
                              ) : (
                                record.opponent || "未入力"
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              <span>{record.id}</span>
                              <span>{normalizePosition(record.position)}</span>
                              {record.point && <span>{record.point}pt</span>}
                              {isEditingDirty && (
                                <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  未保存
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-col gap-2">
                            {editingId === record.id ? (
                              <>
                                <select
                                  className="rounded border px-2 py-1"
                                  value={normalizePosition(record.position)}
                                  onChange={(e) =>
                                    updateRecord(
                                      record.id,
                                      "position",
                                      e.target.value
                                    )
                                  }
                                >
                                  {positionOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  className="rounded border px-2 py-1"
                                  value={record.result || ""}
                                  onChange={(e) =>
                                    updateRecord(
                                      record.id,
                                      "result",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">未設定</option>
                                  {resultOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  className="w-20 rounded border px-2 py-1"
                                  value={record.point || ""}
                                  onChange={(e) =>
                                    updateRecord(record.id, "point", e.target.value)
                                  }
                                  placeholder="pt"
                                />
                              </>
                            ) : (
                              <span
                                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${resultClass(
                                  record.result
                                )}`}
                              >
                                {record.result || "-"}
                              </span>
                            )}
                          </div>
                        </td>

                        {stages.map((stage) => {
                          const summary = recordStages.find(
                            (item) => item.stage === stage
                          );
                          const myBaseKey = `s${stage}_my_base_total`;
                          const enemyBaseKey = `s${stage}_enemy_base_total`;
                          const myBonusKey = `s${stage}_my_bonus`;
                          const enemyBonusKey = `s${stage}_enemy_bonus`;
                          const myTotal =
                            toNumber(record[myBaseKey]) +
                            toNumber(record[myBonusKey]);
                          const enemyTotal =
                            toNumber(record[enemyBaseKey]) +
                            toNumber(record[enemyBonusKey]);

                          return (
                            <td key={stage} className="min-w-44 text-xs text-zinc-600">
                              <div className="font-semibold">
                                {summary?.result || "-"} / 差分：
                                {summary?.diff.toLocaleString() || "0"}
                              </div>
                              <div>
                                自分 {summary?.myTotal.toLocaleString() || "0"} /
                                相手 {summary?.enemyTotal.toLocaleString() || "0"}
                              </div>
                              {editingId === record.id && (
                                <div className="mt-1 rounded-lg bg-zinc-50 px-2 py-1 text-[11px] text-zinc-500">
                                  詳細は下の編集欄で変更
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => loadRecordToInput(record)}
                              className="min-w-16 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-xs font-semibold text-amber-800"
                            >
                              読込
                            </button>

                            <button
                              onClick={() => {
                                if (editingId === record.id) {
                                  finishEditing(record);
                                } else {
                                  setEditingId(record.id);
                                }
                              }}
                              className="min-w-16 rounded-lg bg-zinc-900 px-3 py-1.5 text-center text-xs font-semibold text-white"
                            >
                              {editingId === record.id ? "保存" : "編集"}
                            </button>

                            <button
                              onClick={() =>
                                setDeleteTarget({ ...record, index })
                              }
                              className="min-w-16 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-rose-600"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>

                      {showDetail && (
                        <tr className="border-b bg-zinc-50/50">
                          <td colSpan={6} className="px-3 py-3">
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                            {recordStages.map((item) => (
                              <div
                                key={`desktop-stage-detail-${record.id || index}-${item.stage}`}
                                className="rounded-2xl border bg-white p-3"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="font-semibold">
                                    ステージ{item.stage}
                                  </div>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${resultClass(
                                      item.result
                                    )}`}
                                  >
                                    {item.result}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-xl bg-zinc-50 p-2">
                                    <div className="text-zinc-500">自分合計</div>
                                    <div className="mt-1 text-sm font-bold text-zinc-900">
                                      {item.myTotal.toLocaleString()}
                                    </div>
                                  </div>

                                  <div className="rounded-xl bg-zinc-50 p-2">
                                    <div className="text-zinc-500">相手合計</div>
                                    <div className="mt-1 text-sm font-bold text-zinc-900">
                                      {item.enemyTotal.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center justify-between rounded-xl border bg-white px-2 py-1 text-xs">
                                  <span className="font-semibold text-zinc-500">
                                    差分
                                  </span>
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
                              </div>
                            ))}
                          </div>
                          </td>
                        </tr>
                      )}

                      {editingId === record.id && (
                        <tr className="border-b bg-zinc-50/80">
                          <td colSpan={6} className="p-4">
                            <div className="rounded-3xl border bg-white p-5">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-base font-semibold">
                                    対戦詳細を編集
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    ステージ別の合計、プラス点、個人スコア、順位を編集できます。
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-500">
                                  ID: {record.id}
                                </div>
                              </div>

                              <div className="grid gap-5">
                                {stages.map((stage) => {
                                  const myBaseKey = `s${stage}_my_base_total`;
                                  const enemyBaseKey = `s${stage}_enemy_base_total`;
                                  const myBonusKey = `s${stage}_my_bonus`;
                                  const enemyBonusKey = `s${stage}_enemy_bonus`;

                                  const myTotal =
                                    toNumber(record[myBaseKey]) +
                                    toNumber(record[myBonusKey]);
                                  const enemyTotal =
                                    toNumber(record[enemyBaseKey]) +
                                    toNumber(record[enemyBonusKey]);

                                  return (
                                    <div
                                      key={stage}
                                      className="rounded-3xl border bg-zinc-50 p-4"
                                    >
                                      <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="text-lg font-semibold">
                                          ステージ{stage}
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                          差分：{(myTotal - enemyTotal).toLocaleString()}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-3">
                                        <label className="text-xs font-semibold text-zinc-500">
                                          自分素点合計
                                          <input
                                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                            value={record[myBaseKey] || ""}
                                            onChange={(e) =>
                                              updateRecord(
                                                record.id,
                                                myBaseKey,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </label>

                                        <label className="text-xs font-semibold text-zinc-500">
                                          相手素点合計
                                          <input
                                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                            value={record[enemyBaseKey] || ""}
                                            onChange={(e) =>
                                              updateRecord(
                                                record.id,
                                                enemyBaseKey,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </label>

                                        <label className="text-xs font-semibold text-zinc-500">
                                          自分プラス点
                                          <input
                                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                            value={record[myBonusKey] || ""}
                                            onChange={(e) =>
                                              updateRecord(
                                                record.id,
                                                myBonusKey,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </label>

                                        <label className="text-xs font-semibold text-zinc-500">
                                          相手プラス点
                                          <input
                                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900"
                                            value={record[enemyBonusKey] || ""}
                                            onChange={(e) =>
                                              updateRecord(
                                                record.id,
                                                enemyBonusKey,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </label>
                                      </div>

                                      <div className="mt-4 grid grid-cols-3 gap-3">
                                        {members.map((member) => {
                                          const myScoreKey = `s${stage}_my${member}_score`;
                                          const enemyScoreKey = `s${stage}_enemy${member}_score`;
                                          const myRankKey = `s${stage}_my${member}_rank`;
                                          const enemyRankKey = `s${stage}_enemy${member}_rank`;

                                          return (
                                            <div
                                              key={member}
                                              className="rounded-2xl border bg-white p-3"
                                            >
                                              <div className="mb-3 text-sm font-semibold text-zinc-700">
                                                メンバー{member}
                                              </div>

                                              <div className="grid grid-cols-2 gap-2">
                                                <label className="text-xs font-semibold text-zinc-500">
                                                  自分スコア
                                                  <input
                                                    className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-sm text-zinc-900"
                                                    value={record[myScoreKey] || ""}
                                                    onChange={(e) =>
                                                      updateRecord(
                                                        record.id,
                                                        myScoreKey,
                                                        e.target.value
                                                      )
                                                    }
                                                  />
                                                </label>

                                                <label className="text-xs font-semibold text-zinc-500">
                                                  相手スコア
                                                  <input
                                                    className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-sm text-zinc-900"
                                                    value={record[enemyScoreKey] || ""}
                                                    onChange={(e) =>
                                                      updateRecord(
                                                        record.id,
                                                        enemyScoreKey,
                                                        e.target.value
                                                      )
                                                    }
                                                  />
                                                </label>

                                                <label className="text-xs font-semibold text-zinc-500">
                                                  自分順位
                                                  <input
                                                    className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-sm text-zinc-900"
                                                    value={record[myRankKey] || ""}
                                                    onChange={(e) =>
                                                      updateRecord(
                                                        record.id,
                                                        myRankKey,
                                                        e.target.value
                                                      )
                                                    }
                                                  />
                                                </label>

                                                <label className="text-xs font-semibold text-zinc-500">
                                                  相手順位
                                                  <input
                                                    className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-sm text-zinc-900"
                                                    value={record[enemyRankKey] || ""}
                                                    onChange={(e) =>
                                                      updateRecord(
                                                        record.id,
                                                        enemyRankKey,
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

                                      <div className="mt-3 text-xs text-zinc-500">
                                        表示合計：自分 {myTotal.toLocaleString()} / 相手{" "}
                                        {enemyTotal.toLocaleString()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
  );
}
