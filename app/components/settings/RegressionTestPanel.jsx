export default function RegressionTestPanel({
  visible,
  developerMode,
  showRegressionTest,
  setShowRegressionTest,
  regressionTestCases,
}) {
  return (
        <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
          <button
            onClick={() => setShowRegressionTest(!showRegressionTest)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">回帰テスト確認</h2>

            <span className="text-sm text-zinc-500">
              {showRegressionTest ? "閉じる" : "開く"}
            </span>
          </button>

          {showRegressionTest && !developerMode && (
            <p className="mt-4 text-sm text-zinc-500">
              回帰テスト確認は開発者向けです。スクショ取り込み欄の「OCR開発モードを表示」をONにしてください。
            </p>
          )}

          {developerMode && showRegressionTest && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-zinc-500">
                regression-test/current の画像を順番にOCRして、expected の正解値と見比べてください。
              </p>

              <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
                推奨: OCRモードは「iPhoneアプリ版」。違った画像は test-images/failed-samples に移動してください。
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4">画像</th>
                      <th className="py-2 pr-4">分類</th>
                      <th className="py-2 pr-4">ステージ1</th>
                      <th className="py-2 pr-4">ステージ2</th>
                      <th className="py-2 pr-4">ステージ3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regressionTestCases.map((test) => (
                      <tr key={test.id} className="border-b">
                        <td className="py-2 pr-4 font-medium">{test.label}</td>
                        <td className="py-2 pr-4">{test.category}</td>
                        <td className="py-2 pr-4">{test.expected.stage1}</td>
                        <td className="py-2 pr-4">{test.expected.stage2}</td>
                        <td className="py-2 pr-4">{test.expected.stage3}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                <li>open-regression-test.bat で current / expected を開く</li>
                <li>current の画像を1枚ずつOCRする</li>
                <li>上の表とOCR結果の合計値が一致するか確認する</li>
              </ol>
            </div>
          )}
        </section>
  );
}
