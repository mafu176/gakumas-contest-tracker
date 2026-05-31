"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

const planFilters = ["全て", "センス", "ロジック", "アノマリー"];

const characterFilters = [
  "全員",
  "咲季",
  "手毬",
  "ことね",
  "麻央",
  "リーリヤ",
  "千奈",
  "広",
  "清夏",
  "莉波",
  "佑芽",
  "星南",
  "美鈴",
  "燕",
];

function getCardName(idol) {
  return idol?.variant || idol?.title || idol?.cardName || idol?.style || "";
}

function getCharacterLabel(idol) {
  return idol?.character || idol?.name || idol?.short || "";
}

function matchesCharacter(idol, character) {
  if (character === "全員") return true;

  return `${idol?.character || ""} ${idol?.name || ""} ${idol?.short || ""}`
    .toLowerCase()
    .includes(character.toLowerCase());
}

function FavoriteButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "お気に入り解除" : "お気に入り追加"}
      className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

function IdolCard({
  idol,
  isFavorite,
  getIdolKey,
  getIdolImage,
  planClass,
  onSelect,
  onToggleFavorite,
}) {
  const idolKey = getIdolKey(idol);
  const image = getIdolImage(idol);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(idol)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(idol);
        }
      }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300"
    >
      <FavoriteButton
        active={isFavorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(idolKey);
        }}
      />

      <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100">
        {image ? (
          <img
            src={image}
            alt={idol?.name || idol?.short || "idol"}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-zinc-600">
            {idol?.short || idol?.name || "No Image"}
          </div>
        )}
      </div>

      <div className="mt-3 min-w-0">
        <div className="truncate text-sm font-bold text-zinc-900">
          {getCharacterLabel(idol)}
        </div>
        <div className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-600">
          {getCardName(idol) || idol?.short || "カード名未設定"}
        </div>
        <div
          className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planClass(
            idol?.plan
          )}`}
        >
          {idol?.plan || "未設定"}
        </div>
      </div>
    </div>
  );
}

function IdolSection({
  title,
  note,
  idols,
  favoriteIds,
  getIdolKey,
  getIdolImage,
  planClass,
  onSelect,
  onToggleFavorite,
}) {
  if (idols.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
          {note && <p className="mt-0.5 text-xs text-zinc-600">{note}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {idols.map((idol) => {
          const idolKey = getIdolKey(idol);

          return (
            <IdolCard
              key={idolKey}
              idol={idol}
              isFavorite={favoriteIds.includes(idolKey)}
              getIdolKey={getIdolKey}
              getIdolImage={getIdolImage}
              planClass={planClass}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function IdolSelectModal({
  open,
  selectedSlot,
  idols,
  favoriteIds,
  recentIds,
  recommendedPlan,
  getIdolKey,
  getIdolImage,
  planClass,
  onSelect,
  onToggleFavorite,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("全て");
  const [character, setCharacter] = useState("全員");
  const [useRecommendedPlanOnly, setUseRecommendedPlanOnly] = useState(true);

  const hasRecommendedPlan =
    recommendedPlan &&
    recommendedPlan !== "未設定" &&
    recommendedPlan !== "全て";

  const activePlanFilter =
    hasRecommendedPlan && useRecommendedPlanOnly ? recommendedPlan : plan;

  const filteredIdols = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return idols.filter((idol) => {
      const haystack =
        `${idol?.name || ""} ${idol?.short || ""} ${idol?.character || ""} ${
          idol?.plan || ""
        } ${getCardName(idol)} ${idol?.id || ""}`.toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (activePlanFilter !== "全て" && idol?.plan !== activePlanFilter) {
        return false;
      }
      if (!matchesCharacter(idol, character)) return false;

      return true;
    });
  }, [activePlanFilter, character, idols, search]);

  const idolById = useMemo(() => {
    return new Map(idols.map((idol) => [getIdolKey(idol), idol]));
  }, [getIdolKey, idols]);

  const filteredIdSet = useMemo(
    () => new Set(filteredIdols.map((idol) => getIdolKey(idol))),
    [filteredIdols, getIdolKey]
  );

  const favoriteIdols = favoriteIds
    .map((id) => idolById.get(id))
    .filter((idol) => idol && filteredIdSet.has(getIdolKey(idol)));

  const recentIdols = recentIds
    .map((id) => idolById.get(id))
    .filter(
      (idol) =>
        idol &&
        filteredIdSet.has(getIdolKey(idol)) &&
        !favoriteIds.includes(getIdolKey(idol))
    );

  const normalIdols = filteredIdols.filter((idol) => {
    const idolKey = getIdolKey(idol);
    return !favoriteIds.includes(idolKey) && !recentIds.includes(idolKey);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:p-4">
      <button
        type="button"
        aria-label="アイドル選択を閉じる"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow sm:rounded-3xl">
        <header className="border-b border-zinc-200 bg-white px-4 pb-3 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-600">
                ★お気に入り / 最近使った
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-900">
                アイドル選択
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                選択中: {selectedSlot}
              </p>
              {hasRecommendedPlan && (
                <p className="mt-1 text-xs font-semibold text-zinc-700">
                  このステージのタイプ: {recommendedPlan}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-xl font-semibold text-zinc-700"
            >
              ×
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {hasRecommendedPlan && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-800">
                  <span>
                    {recommendedPlan}のみ表示
                    <span className="ml-2 text-xs font-normal text-zinc-600">
                      OFFで全タイプ表示
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={useRecommendedPlanOnly}
                    onChange={(event) =>
                      setUseRecommendedPlanOnly(event.target.checked)
                    }
                    className="h-5 w-5 accent-zinc-900"
                  />
                </label>
              </div>
            )}

            <input
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              placeholder="名前・カード名・略称で検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {!useRecommendedPlanOnly || !hasRecommendedPlan ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {planFilters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPlan(item)}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                      plan === item
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">
                  {recommendedPlan}
                </span>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {characterFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCharacter(item)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                    character === item
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-7">
            <IdolSection
              title="★お気に入り"
              note="よく使うカード"
              idols={favoriteIdols}
              favoriteIds={favoriteIds}
              getIdolKey={getIdolKey}
              getIdolImage={getIdolImage}
              planClass={planClass}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />

            <IdolSection
              title="最近使った"
              note="直近10件"
              idols={recentIdols}
              favoriteIds={favoriteIds}
              getIdolKey={getIdolKey}
              getIdolImage={getIdolImage}
              planClass={planClass}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />

            <IdolSection
              title="通常一覧"
              idols={normalIdols}
              favoriteIds={favoriteIds}
              getIdolKey={getIdolKey}
              getIdolImage={getIdolImage}
              planClass={planClass}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />

            {filteredIdols.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                条件に合うアイドルが見つかりません。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
