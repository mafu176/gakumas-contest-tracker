export default function IdolDetailModal({
  selectedIdolDetail,
  onClose,
}) {
  if (!selectedIdolDetail) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-600">
                  ステージ{selectedIdolDetail.stage}
                </div>
                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  {selectedIdolDetail.idolName}
                </h2>
              </div>

              <button
                onClick={() => onClose()}
                className="rounded-xl border px-3 py-2 text-sm font-semibold"
              >
                閉じる
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">勝率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.adoptionWinRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  {selectedIdolDetail.winCount}勝{" "}
                  {selectedIdolDetail.loseCount}敗 / 採用
                  {selectedIdolDetail.count}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">平均素点</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.averageBaseScore.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  スコア記録 {selectedIdolDetail.scoreCount}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">平均順位</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.averageRank}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  順位記録 {selectedIdolDetail.rankCount}回
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">1位率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.firstRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  1位 {selectedIdolDetail.firstCount}回
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-zinc-100 p-4">
              <div className="mb-3 text-sm font-semibold">順位分布</div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
                {[1,2,3,4].map((rank)=> {
                  const count = selectedIdolDetail.rankDistribution?.[rank] || 0;
                  const total = selectedIdolDetail.rankCount || 0;
                  const rate = total ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={rank} className="rounded-xl bg-white p-3">
                      <div className="text-xs text-zinc-600">{rank}位率</div>
                      <div className="font-semibold">{rate}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">下位率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.lowRate}%
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  3位以下割合
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">安定度</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.stability}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  高いほど安定
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-4">
                <div className="text-xs text-zinc-600">2位以内率</div>
                <div className="mt-1 text-2xl font-bold">
                  {selectedIdolDetail.top2Rate}%
                </div>
              </div>

            </div>

            <div className="mt-4 rounded-2xl border p-4 text-sm text-zinc-600">
              現在の分析フィルタ条件に含まれる対戦だけで集計しています。
            </div>
          </div>
        </div>
  );
}
