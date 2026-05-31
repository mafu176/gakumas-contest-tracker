import SeasonShareCard from "../SeasonShareCard";

function formatValue(value, fallback = "-") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

export default function SharePanel({
  visible,
  selectedSeasonId,
  setSelectedSeasonId,
  seasonPresets,
  sharePlayerName,
  setSharePlayerName,
  shareCardLayout,
  setShareCardLayout,
  exportSeasonShareCardPng,
  copySeasonShareCardPng,
  shareImageStatus,
  selectedSeason,
  seasonSummary,
  seasonExtraStats,
  seasonFormationChangeHistory,
}) {
  const buildSeasonResultPostText = () => {
    if (!selectedSeason) return "";

    const totalMatches = seasonSummary?.totalMatches ?? 0;
    const wins = seasonSummary?.winCount ?? 0;
    const losses = seasonSummary?.loseCount ?? 0;
    const winRate = seasonSummary?.winRate ?? 0;

    return [
      "学マス コンテスト戦績",
      "",
      selectedSeason.name || "シーズン未設定",
      `期間: ${formatValue(selectedSeason.startDate)}〜${formatValue(selectedSeason.endDate)}`,
      `対戦数: ${totalMatches}`,
      `勝敗: ${wins}勝${losses}敗`,
      `勝率: ${winRate}%`,
      `最終pt: ${formatValue(selectedSeason.finalPoint)}`,
      `最終順位: ${formatValue(selectedSeason.finalRank)}位`,
      "",
      "https://gakumas-contest-tracker.vercel.app/",
      "",
      "#学マス",
      "#学マスコンテスト戦績トラッカー",
    ].join("\n");
  };

  const copySeasonResultPostText = async () => {
    const postText = buildSeasonResultPostText();
    if (!postText || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(postText);
  };

  const openSeasonResultTweet = () => {
    const postText = buildSeasonResultPostText();
    if (!postText) return;

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">共有カード</h2>
          <p className="mt-1 text-sm text-zinc-600">
            シーズンの振り返りカードをPNG保存、コピー、X投稿用テキスト作成できます。
          </p>
        </div>

        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
        >
          <option value="all">共有するシーズンを選択</option>
          {seasonPresets.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="プレイヤー名（任意）"
          value={sharePlayerName}
          onChange={(e) => setSharePlayerName(e.target.value)}
        />

        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={shareCardLayout}
          onChange={(e) => setShareCardLayout(e.target.value)}
        >
          <option value="vertical">スマホ縦（9:16）</option>
          <option value="horizontal">横長（1.91:1）</option>
          <option value="square">正方形（1:1）</option>
        </select>

        <button
          onClick={exportSeasonShareCardPng}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          PNG保存
        </button>

        <button
          onClick={copySeasonShareCardPng}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          PNGコピー
        </button>

        <button
          onClick={openSeasonResultTweet}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          Xに投稿
        </button>
      </div>

      {shareImageStatus &&
        shareImageStatus !==
          "PNG保存またはPNGコピー後、X投稿画面で画像を添付してください" && (
        <p className="mb-3 text-xs text-zinc-600">{shareImageStatus}</p>
      )}

      <p className="mb-3 text-xs text-zinc-600">
        PNG保存またはPNGコピー後、X投稿画面で画像を添付してください。
      </p>

      {selectedSeason && (
        <div className="mb-4 rounded-2xl border bg-zinc-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">X投稿文プレビュー</div>
            <button
              onClick={copySeasonResultPostText}
              className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm"
            >
              コピー
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-relaxed text-zinc-700">
            {buildSeasonResultPostText()}
          </pre>
        </div>
      )}

      {selectedSeason ? (
        <div className="max-w-full overflow-x-auto rounded-3xl bg-zinc-100 p-3">
          <SeasonShareCard
            selectedSeason={selectedSeason}
            seasonSummary={{
              ...seasonSummary,
              extraStats: seasonExtraStats,
              formationChangeHistory: seasonFormationChangeHistory,
            }}
            sharePlayerName={sharePlayerName}
            shareCardLayout={shareCardLayout}
          />
        </div>
      ) : (
        <div className="rounded-2xl border bg-zinc-50 p-5 text-sm text-zinc-600">
          シーズンタブでシーズンを作成してから、共有するシーズンを選択してください。
        </div>
      )}
    </section>
  );
}
