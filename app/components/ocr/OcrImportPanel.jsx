import { OCR_PARSER_VERSION } from "../../lib/ocr";

export default function OcrImportPanel({
  developerMode,
  setDeveloperMode,
  screenshotPreview,
  screenshotName,
  clearScreenshot,
  ocrMode,
  setOcrMode,
  handleScreenshotChange,
  runOcr,
  ocrStatus,
  ocrProgress,
  parsedOcrScores,
  stages,
  members,
  applyOcrScores,
  ocrText,
  ipadArithmeticDiagnostics,
}) {
  const debugOcrText = ocrText?.startsWith("[OCR_PARSER_VERSION]")
    ? ocrText
    : `[OCR_PARSER_VERSION] ${OCR_PARSER_VERSION}\n\n${ocrText}`;
  const exportIpadArithmeticDiagnostics = () => {
    if (!ipadArithmeticDiagnostics || typeof document === "undefined") return;
    const blob = new Blob([JSON.stringify(ipadArithmeticDiagnostics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (ipadArithmeticDiagnostics.imageIdentifier || screenshotName || "ipad")
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 80);
    a.href = url;
    a.download = `${safeName || "ipad"}-ipad-arithmetic-diagnostics.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">スクショ取り込み</h2>
          <p className="mt-1 text-sm text-zinc-600">
            iPhoneアプリ版スクリーンショットを正式対応しています。PCは参考対応（保証外）です。
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            OCR読み込みを行う際は、対戦履歴の対戦詳細の画面を読み取りさせてください。
          </p>
          <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            OCR読み込みは現在β版です。読み取り結果は必ず目視で確認し、必要に応じて手修正してください。
          </p>

          <p className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            OCRは標準的な3人編成の対戦詳細スクリーンショットを前提に調整中です。0〜2人編成の画像は読み取り後に手修正してください。
          </p>

          <label className="hidden">
            <input
              type="checkbox"
              checked={developerMode}
              onChange={(e) => setDeveloperMode(e.target.checked)}
            />
            OCR開発モードを表示
          </label>
        </div>

        {screenshotPreview && (
          <button
            onClick={clearScreenshot}
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            画像をクリア
          </button>
        )}
      </div>

      <div className="mt-5 rounded-3xl border bg-zinc-50 p-4">
        <div className="mb-2 text-sm font-semibold text-zinc-900">
          OCRモード
        </div>

        <select
          className="w-full rounded-2xl border bg-white px-3 py-3"
          value={ocrMode}
          onChange={(e) => setOcrMode(e.target.value)}
        >
          <option value="smartphone">iPhoneアプリ版（推奨）</option>
          <option value="pc">PCブラウザ版（保証外）</option>
          {developerMode && (
            <option value="compare">開発用: 比較モード</option>
          )}
        </select>

        <p className="mt-2 text-xs text-zinc-600">
          iPhoneアプリ版が正式対応です。PCブラウザ版は参考対応（保証外）です。
        </p>
      </div>

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center hover:bg-zinc-100 md:p-8">
        <div className="text-base font-semibold text-zinc-900">
          スクリーンショットを選択
        </div>
        <div className="mt-2 text-sm text-zinc-600">
          PCではファイル選択またはCtrl+V、スマホでは写真ライブラリやカメラから選べます
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="ocr-screenshot-file-input"
          onChange={handleScreenshotChange}
        />
      </label>

      {screenshotName && (
        <div className="mt-3 text-sm text-zinc-600">
          選択中：{screenshotName}
        </div>
      )}

      {screenshotPreview && (
        <div className="mt-5 space-y-4">
          <div className="overflow-hidden rounded-3xl border bg-zinc-100">
            <img
              src={screenshotPreview}
              alt="スクリーンショットプレビュー"
              className="max-h-[720px] w-full object-contain"
            />
          </div>

          <button
            onClick={runOcr}
            data-testid="run-ocr-button"
            className="w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white md:w-auto md:px-6"
          >
            OCRで読み取る
          </button>

          {ocrStatus && (
            <div className="text-sm text-zinc-600">
              {ocrStatus}
              {ocrProgress > 0 ? ` ${ocrProgress}%` : ""}
            </div>
          )}


          {parsedOcrScores && (
            <div className="rounded-2xl border bg-zinc-50 p-3">
              <div className="mb-1 font-semibold text-zinc-900">OCRスコア抽出結果</div>
              <p className="mb-3 text-xs text-zinc-600">
                内容を確認してから「入力欄へ反映」を押してください。保存は下の通常フォームで行います。
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {stages.map((stage) => {
                  const stageOcr = parsedOcrScores.stages[stage] || {
                    self: [],
                    enemy: [],
                    selfTotal: "",
                    enemyTotal: "",
                  };

                  return (
                    <div key={stage} className="rounded-xl bg-white p-3">
                      <div className="mb-3 font-medium">ステージ{stage}</div>

                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <div className="mb-2 text-xs font-bold text-zinc-600">
                            自分
                          </div>

                          {members.map((member, index) => (
                            <div
                              key={`ocr-self-${stage}-${member}`}
                              className="flex items-center justify-between gap-2 border-b border-zinc-200 py-1 last:border-b-0"
                            >
                              <span className="text-xs text-zinc-600">
                                メンバー{member}
                              </span>
                              <span className="font-semibold text-zinc-800">
                                {stageOcr.self?.[index] || "-"}
                              </span>
                            </div>
                          ))}

                          <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-2 py-1">
                            <span className="text-xs font-bold text-zinc-600">
                              合計
                            </span>
                            <span className="font-bold text-zinc-900">
                              {stageOcr.selfTotal || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-zinc-50 p-3">
                          <div className="mb-2 text-xs font-bold text-zinc-600">
                            相手
                          </div>

                          {members.map((member, index) => (
                            <div
                              key={`ocr-enemy-${stage}-${member}`}
                              className="flex items-center justify-between gap-2 border-b border-zinc-200 py-1 last:border-b-0"
                            >
                              <span className="text-xs text-zinc-600">
                                メンバー{member}
                              </span>
                              <span className="font-semibold text-zinc-800">
                                {stageOcr.enemy?.[index] || "-"}
                              </span>
                            </div>
                          ))}

                          <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-2 py-1">
                            <span className="text-xs font-bold text-zinc-600">
                              合計
                            </span>
                            <span className="font-bold text-zinc-900">
                              {stageOcr.enemyTotal || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={applyOcrScores}
                className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                入力欄へ反映（保存はしません）
              </button>
            </div>
          )}

          {ipadArithmeticDiagnostics && (
            <div
              className="rounded-2xl border border-sky-200 bg-sky-50 p-4"
              data-testid="ipad-arithmetic-diagnostics-panel"
              data-ipad-arithmetic-diagnostics-ready="true"
            >
              <div className="mb-2 font-semibold text-sky-950">
                iPad arithmetic diagnostics
              </div>
              <p className="mb-3 text-xs text-sky-800">
                Developer-only output from <code>?ipadArithmeticDebug=1</code>. Proposals are not
                applied to the displayed OCR result.
              </p>
              <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-sky-900 md:grid-cols-4">
                <div className="rounded-lg bg-white px-3 py-2">
                  detected: {ipadArithmeticDiagnostics.detection?.detected ? "yes" : "no"}
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  accepted: {ipadArithmeticDiagnostics.acceptedCases?.length || 0}
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  output changed: {ipadArithmeticDiagnostics.productionOutputChanged ? "yes" : "no"}
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  template: {ipadArithmeticDiagnostics.template?.version || "-"}
                </div>
              </div>
              <button
                onClick={exportIpadArithmeticDiagnostics}
                data-testid="export-ipad-arithmetic-diagnostics"
                className="rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Export iPad arithmetic diagnostics
              </button>
              <textarea
                readOnly
                data-testid="ipad-arithmetic-diagnostics-json"
                className="hidden"
                value={JSON.stringify(ipadArithmeticDiagnostics)}
              />
              {developerMode && (
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-zinc-700">
                  {JSON.stringify(
                    {
                      imageIdentifier: ipadArithmeticDiagnostics.imageIdentifier,
                      detection: ipadArithmeticDiagnostics.detection,
                      acceptedCases: (ipadArithmeticDiagnostics.acceptedCases || []).map(
                        ({ stage, side, currentPrimary, selectedTuple, wouldApply, blockReason }) => ({
                          stage,
                          side,
                          currentPrimary,
                          selectedTuple,
                          wouldApply,
                          blockReason,
                        })
                      ),
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          )}

          {developerMode && ocrText && (
            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="mb-2 font-semibold text-zinc-900">OCR読み取り結果・補正ログ</div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm text-zinc-700">
                {debugOcrText}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}
