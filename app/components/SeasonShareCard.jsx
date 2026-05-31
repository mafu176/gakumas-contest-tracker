"use client";

/* eslint-disable @next/next/no-img-element */

import SeasonWinTriangle from "./SeasonWinTriangle";
import { formatSeasonTypeLabel } from "../lib/seasonTypes";

const cardSizes = {
  vertical: { width: 1080, height: 1920, label: "スマホ縦（9:16）" },
  horizontal: { width: 1200, height: 675, label: "横長（1.91:1）" },
  square: { width: 1080, height: 1080, label: "正方形（1:1）" },
};

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "-";
  const normalized = String(value).replace(/,/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num.toLocaleString() : String(value);
}

function formatRank(value) {
  if (!value) return "-";
  return `${formatNumber(value)}位`;
}

function formatRate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(1)}%` : "0.0%";
}

function groupFormationByStage(finalFormation) {
  return [1, 2, 3].map((stage) => ({
    stage,
    slots: finalFormation
      .filter((slot) => slot.stage === stage)
      .sort((a, b) => a.member - b.member),
  }));
}

function FormationSlot({ slot, compact = false, horizontal = false, wideImage = false, verticalImage = false }) {
  return (
    <div
      className={
        horizontal || verticalImage
          ? "relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-1.5"
          : "relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2"
      }
    >
      {slot?.badge && (
        <div
          className={
            horizontal
              ? "absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm shadow"
              : verticalImage
                ? "absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg shadow"
                : "absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg shadow"
          }
        >
          {slot.badge}
        </div>
      )}

      <div
        className={
          // IMPORTANT:
          // Share card image ratios are intentionally separated.
          // vertical = 1:1
          // horizontal = 2:1
          // square/default = 1:1.03
          // Do not merge verticalImage into horizontal.
          verticalImage
            ? "aspect-square overflow-hidden rounded-lg bg-white/10"
            : horizontal || wideImage
              ? "aspect-[2/1] overflow-hidden rounded-lg bg-white/10"
              : "aspect-[1/1.03] overflow-hidden rounded-xl bg-white/10"
        }
      >
        {slot?.image ? (
          <img
            src={slot.image}
            alt={slot.idol || "idol"}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] font-bold text-zinc-600">
            IMAGE
          </div>
        )}
      </div>

      <div
        className={
          horizontal
            ? "mt-0.5 text-[7px] font-bold tracking-[0.1em] text-zinc-500"
            : verticalImage
              ? "mt-0.5 text-[7px] font-bold tracking-[0.1em] text-zinc-500"
              : "mt-1 text-[8px] font-bold tracking-[0.12em] text-zinc-500"
        }
      >
        SLOT {slot?.member || "-"}
      </div>

      <div
        className={
          horizontal
            ? "mt-0.5 line-clamp-1 min-h-3 text-[8px] font-bold leading-tight text-white"
            : verticalImage
              ? "mt-0.5 line-clamp-1 min-h-3 text-[9px] font-bold leading-tight text-white"
              : compact
                ? "mt-1 min-h-8 text-[11px] font-bold leading-tight text-white"
                : "mt-1 min-h-10 text-xs font-bold leading-tight text-white"
        }
      >
        {slot?.idol || "未登録"}
      </div>
    </div>
  );
}

function HorizontalStageRows({ stageGroups, stageTypes }) {
  return (
    <div className="grid gap-1.5">
      {stageGroups.map((group) => (
        <div key={group.stage} className="rounded-2xl bg-white/[0.07] p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-base font-black">STAGE{group.stage}</div>
            <div className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-zinc-300">
              {formatSeasonTypeLabel(stageTypes?.[group.stage])}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map((member) => {
              const slot =
                group.slots.find((item) => item.member === member) || {
                  stage: group.stage,
                  member,
                };

              return (
                <FormationSlot
                  key={`${group.stage}-${member}`}
                  slot={slot}
                  compact
                  horizontal
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StagePlanLegend({ stageTypes, horizontal = false }) {
  return (
    <div
      className={
        horizontal
          ? "grid grid-cols-3 gap-1 text-[9px]"
          : "grid grid-cols-3 gap-2 text-[10px]"
      }
    >
      {[1, 2, 3].map((stage) => (
        <div
          key={stage}
          className="flex items-center justify-between gap-1 rounded-full bg-white/10 px-2.5 py-1 font-bold text-zinc-300"
        >
          <span className="text-zinc-500">S{stage}</span>
          <span className="truncate">{formatSeasonTypeLabel(stageTypes?.[stage])}</span>
        </div>
      ))}
    </div>
  );
}

export default function SeasonShareCard({
  selectedSeason,
  seasonSummary,
  sharePlayerName = "",
  shareCardLayout = "vertical",
  cardId = "season-share-card",
}) {
  if (!selectedSeason) return null;

  const safeSeasonSummary = {
    winRate: 0,
    totalMatches: 0,
    winCount: 0,
    loseCount: 0,
    drawCount: 0,
    finalFormation: [],
    stageWinRates: { 1: 0, 2: 0, 3: 0 },
    stageTypes: {},
    ...(seasonSummary || {}),
  };

  const layout = cardSizes[shareCardLayout] || cardSizes.vertical;
  const isHorizontal = shareCardLayout === "horizontal";
  const isSquare = shareCardLayout === "square";
  const isVertical = shareCardLayout === "vertical";
  const stageGroups = groupFormationByStage(safeSeasonSummary.finalFormation);
  const compact = true;

  const mainLayout = isHorizontal
    ? "grid h-full grid-cols-[0.34fr_0.66fr] gap-5 pb-10"
    : isSquare
      ? "grid h-full grid-cols-[0.95fr_1.05fr] gap-4 pb-8"
      : "grid h-full grid-cols-[0.9fr_1.1fr] gap-6 pb-16";


  if (isSquare || isVertical) {
    return (
      <div
        id={cardId}
        className="overflow-hidden rounded-[36px] bg-zinc-950 text-white shadow-2xl"
        style={{
          width: `${layout.width}px`,
          minWidth: `${layout.width}px`,
          height: `${layout.height}px`,
        }}
        data-layout={shareCardLayout}
      >
        <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_30%),linear-gradient(135deg,#09090b_0%,#18181b_52%,#27272a_100%)] p-7">
          <div className="absolute inset-x-7 top-0 h-1 bg-amber-300" />

          <div className={isVertical ? "grid h-full grid-rows-[auto_1fr] gap-6 pb-20" : "grid h-full grid-rows-[auto_1fr] gap-2 pb-12"}>
            <section className="grid grid-cols-[0.92fr_1.08fr] gap-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-3xl font-black leading-tight">
                      {selectedSeason.name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-zinc-300">
                      {selectedSeason.startDate} - {selectedSeason.endDate}
                    </p>

                    {sharePlayerName && (
                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        Producer: {sharePlayerName}
                      </p>
                    )}
                  </div>

                  <div className={isVertical ? "hidden" : "rounded-3xl bg-white/10 px-4 py-3 text-right"}>
                    <div className="text-[9px] font-black tracking-[0.2em] text-zinc-400">
                      WIN RATE
                    </div>
                    <div className="mt-0.5 text-3xl font-black text-amber-200">
                      {formatRate(safeSeasonSummary.winRate)}
                    </div>
                  </div>
                </div>

                <div className={isVertical ? "grid grid-cols-2 gap-2" : "grid grid-cols-4 gap-2"}>
                  <div className={
                      isVertical
                        ? "rounded-2xl bg-white/10 p-3 min-h-[120px] flex flex-col justify-center"
                        : "rounded-2xl bg-white/10 p-2"
                    }>
                    <div className={isVertical ? "text-[12px] font-bold text-zinc-400" : "text-[8px] font-bold text-zinc-400"}>総試合</div>
                    <div className={isVertical ? "mt-1 text-3xl font-black" : "mt-0.5 text-lg font-black"}>
                      {formatNumber(safeSeasonSummary.totalMatches)}戦
                    </div>
                  </div>

                  <div className={
                      isVertical
                        ? "rounded-2xl bg-white/10 p-3 min-h-[120px] flex flex-col justify-center"
                        : "rounded-2xl bg-white/10 p-2"
                    }>
                    <div className={isVertical ? "text-[12px] font-bold text-zinc-400" : "text-[8px] font-bold text-zinc-400"}>勝敗</div>
                    <div className={isVertical ? "mt-1 text-3xl font-black" : "mt-0.5 text-lg font-black"}>
                      {safeSeasonSummary.winCount}-{safeSeasonSummary.loseCount}
                      {safeSeasonSummary.drawCount > 0 ? `-${safeSeasonSummary.drawCount}` : ""}
                    </div>
                  </div>

                  <div className={
                      isVertical
                        ? "rounded-2xl bg-white/10 p-3 min-h-[120px] flex flex-col justify-center"
                        : "rounded-2xl bg-white/10 p-2"
                    }>
                    <div className={isVertical ? "text-[12px] font-bold text-zinc-400" : "text-[8px] font-bold text-zinc-400"}>最終pt</div>
                    <div className={isVertical ? "mt-1 text-3xl font-black" : "mt-0.5 text-lg font-black"}>
                      {formatNumber(selectedSeason.finalPoint)}
                    </div>
                  </div>

                  <div className={
                      isVertical
                        ? "rounded-2xl bg-white/10 p-3 min-h-[120px] flex flex-col justify-center"
                        : "rounded-2xl bg-white/10 p-2"
                    }>
                    <div className={isVertical ? "text-[12px] font-bold text-zinc-400" : "text-[8px] font-bold text-zinc-400"}>最終順位</div>
                    <div className={isVertical ? "mt-1 text-3xl font-black" : "mt-0.5 text-lg font-black"}>
                      {formatRank(selectedSeason.finalRank)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white/[0.08] px-3 pb-3 pt-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">
                    STAGE WIN TRIANGLE
                  </div>
                </div>

                <StagePlanLegend
                  stageTypes={safeSeasonSummary.stageTypes}
                  horizontal
                />

                <div className={isVertical ? "mt-4 h-[330px] scale-[1.05] origin-top" : "mt-2 h-[190px] scale-[0.76] origin-top -translate-y-1"}>
                  <SeasonWinTriangle
                    stage1WinRate={safeSeasonSummary.stageWinRates[1]}
                    stage2WinRate={safeSeasonSummary.stageWinRates[2]}
                    stage3WinRate={safeSeasonSummary.stageWinRates[3]}
                    totalWinRate={safeSeasonSummary.winRate}
                    stageTypes={safeSeasonSummary.stageTypes}
                    compact={compact}
                  />
                </div>
              </div>
            </section>

            <section className="min-h-0 -mt-3">
              <div className="mb-2 text-2xl font-black text-white">
                最終編成
              </div>

              {safeSeasonSummary.finalFormation.length === 0 ? (
                <div className="rounded-3xl bg-white/10 p-6 text-xl text-zinc-300">
                  このシーズン内の対戦記録がまだありません。
                </div>
              ) : isVertical ? (
                <div className="grid gap-7">
                    {stageGroups.map((group) => (
                      <div
                        key={group.stage}
                        className={
                          isVertical
                            ? "rounded-3xl bg-white/[0.07] p-6"
                            : "rounded-3xl bg-white/[0.07] p-2.5"
                        }
                      >
                        <div className={isVertical ? "mb-3 flex items-center justify-between gap-3" : "mb-3 flex items-center justify-between gap-3"}>
                          <div className="text-xl font-black">
                            STAGE{group.stage}
                          </div>
                          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                            {formatSeasonTypeLabel(safeSeasonSummary.stageTypes?.[group.stage])}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3].map((member) => {
                            const slot = group.slots.find((item) => item.member === member);
                            return (
                              <FormationSlot
                                key={`${group.stage}-${member}`}
                                slot={slot || { stage: group.stage, member }}
                                compact={isSquare ? false : true}
                                wideImage={isVertical}
                                verticalImage={isVertical}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <HorizontalStageRows
                  stageGroups={stageGroups}
                  stageTypes={safeSeasonSummary.stageTypes}
                />
              )}
            </section>
          </div>

          <div
            className={
              isVertical
                ? "absolute inset-x-7 bottom-5 flex items-center justify-between border-t border-white/10 pt-4 text-[9px] font-semibold text-zinc-500"
                : "absolute inset-x-7 bottom-1 flex items-center justify-between border-t border-white/10 pt-1 text-[9px] font-semibold text-zinc-500"
            }
          >
            <div className={isVertical ? "flex items-center gap-3" : "flex items-center gap-2"}>
              <span>学マス コンテスト戦績トラッカー</span>
              <span>🌟 総合TOP</span>
              <span>🔥 平均素点TOP</span>
              <span>👑 平均順位TOP</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={cardId}
      className="overflow-hidden rounded-[36px] bg-zinc-950 text-white shadow-2xl"
      style={{
        width: `${layout.width}px`,
        minWidth: `${layout.width}px`,
        height: `${layout.height}px`,
      }}
      data-layout={shareCardLayout}
    >
      <div
        className={
          isHorizontal
            ? "relative h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_30%),linear-gradient(135deg,#09090b_0%,#18181b_52%,#27272a_100%)] p-7"
            : isSquare
              ? "relative h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_30%),linear-gradient(135deg,#09090b_0%,#18181b_52%,#27272a_100%)] p-7"
              : "relative h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_30%),linear-gradient(135deg,#09090b_0%,#18181b_52%,#27272a_100%)] p-10"
        }
      >
        <div
          className={
            isHorizontal
              ? "absolute inset-x-7 top-0 h-1 bg-amber-300"
              : isSquare
                ? "absolute inset-x-7 top-0 h-1 bg-amber-300"
                : "absolute inset-x-10 top-0 h-1 bg-amber-300"
          }
        />

        <div className={mainLayout}>
          <section className={isHorizontal ? "flex flex-col gap-2.5" : "flex flex-col gap-3"}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={
                    isHorizontal
                      ? "mt-1.5 text-2xl font-black leading-tight"
                      : "mt-2 text-3xl font-black leading-tight"
                  }
                >
                  {selectedSeason.name}
                </h3>

                <p
                  className={
                    isHorizontal
                      ? "mt-1.5 text-xs font-semibold text-zinc-300"
                      : "mt-1 text-lg font-semibold text-zinc-300"
                  }
                >
                  {selectedSeason.startDate} - {selectedSeason.endDate}
                </p>

                {sharePlayerName && (
                  <p
                    className={
                      isHorizontal
                        ? "mt-1.5 text-xs font-bold text-zinc-200"
                        : "mt-1 text-base font-bold text-zinc-200"
                    }
                  >
                    Producer: {sharePlayerName}
                  </p>
                )}
              </div>

              <div
                className={
                  isHorizontal
                    ? "rounded-2xl bg-white/10 px-3 py-2 text-right"
                    : "rounded-3xl bg-white/10 px-5 py-4 text-right"
                }
              >
                <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">
                  WIN RATE
                </div>
                <div
                  className={
                    isHorizontal
                      ? "mt-0.5 text-2xl font-black text-amber-200"
                      : "mt-1 text-4xl font-black text-amber-200"
                  }
                >
                  {formatRate(safeSeasonSummary.winRate)}
                </div>
              </div>
            </div>

            <div className={isHorizontal ? "grid grid-cols-2 gap-1.5" : "grid grid-cols-2 gap-3"}>
              <div className={isHorizontal ? "rounded-2xl bg-white/10 p-2" : "rounded-3xl bg-white/10 p-3"}>
                <div className="text-[9px] font-bold text-zinc-400">総試合</div>
                <div className={isHorizontal ? "mt-0.5 text-lg font-black" : "mt-1 text-2xl font-black"}>
                  {formatNumber(safeSeasonSummary.totalMatches)}戦
                </div>
              </div>

              <div className={isHorizontal ? "rounded-2xl bg-white/10 p-2" : "rounded-3xl bg-white/10 p-3"}>
                <div className="text-[9px] font-bold text-zinc-400">勝敗</div>
                <div className={isHorizontal ? "mt-0.5 text-lg font-black" : "mt-1 text-2xl font-black"}>
                  {safeSeasonSummary.winCount}-{safeSeasonSummary.loseCount}
                  {safeSeasonSummary.drawCount > 0 ? `-${safeSeasonSummary.drawCount}` : ""}
                </div>
              </div>

              <div className={isHorizontal ? "rounded-2xl bg-white/10 p-2" : "rounded-3xl bg-white/10 p-3"}>
                <div className="text-[9px] font-bold text-zinc-400">最終pt</div>
                <div className={isHorizontal ? "mt-0.5 text-lg font-black" : "mt-1 text-2xl font-black"}>
                  {formatNumber(selectedSeason.finalPoint)}
                </div>
              </div>

              <div className={isHorizontal ? "rounded-2xl bg-white/10 p-2" : "rounded-3xl bg-white/10 p-3"}>
                <div className="text-[9px] font-bold text-zinc-400">最終順位</div>
                <div className={isHorizontal ? "mt-0.5 text-lg font-black" : "mt-1 text-2xl font-black"}>
                  {formatRank(selectedSeason.finalRank)}
                </div>
              </div>
            </div>

            <div className={isHorizontal ? "rounded-3xl bg-white/[0.08] px-3 pb-5 pt-3" : "rounded-3xl bg-white/[0.08] px-3 pb-6 pt-3"}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">
                  STAGE WIN TRIANGLE
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                  全体 {formatRate(safeSeasonSummary.winRate)}
                </div>
              </div>

              <StagePlanLegend
                stageTypes={safeSeasonSummary.stageTypes}
                horizontal={isHorizontal}
              />

              <div className={isHorizontal ? "mt-2 h-[260px]" : isSquare ? "mt-1 h-[270px]" : "mt-2 h-[390px]"}>
                <SeasonWinTriangle
                  stage1WinRate={safeSeasonSummary.stageWinRates[1]}
                  stage2WinRate={safeSeasonSummary.stageWinRates[2]}
                  stage3WinRate={safeSeasonSummary.stageWinRates[3]}
                  totalWinRate={safeSeasonSummary.winRate}
                  stageTypes={safeSeasonSummary.stageTypes}
                  compact={compact}
                />
              </div>
            </div>
          </section>

          <section className="min-h-0">
            <div className={isHorizontal ? "mb-2 flex items-center justify-between" : "mb-4 flex items-center justify-between"}>
              <div>
                <div className={isHorizontal ? "mt-0.5 text-xl font-black text-white" : "mt-1 text-2xl font-black text-white"}>
                  最終編成
                </div>
              </div>
            </div>

            {safeSeasonSummary.finalFormation.length === 0 ? (
              <div className="rounded-3xl bg-white/10 p-6 text-xl text-zinc-300">
                このシーズン内の対戦記録がまだありません。
              </div>
            ) : isHorizontal ? (
              <HorizontalStageRows
                stageGroups={stageGroups}
                stageTypes={safeSeasonSummary.stageTypes}
              />
            ) : (
              <div className={isSquare ? "grid gap-1" : "grid gap-2"}>
                {stageGroups.map((group) => (
                  <div
                    key={group.stage}
                    className={isSquare ? "rounded-3xl bg-white/[0.07] p-2.5" : "rounded-3xl bg-white/[0.07] p-2.5"}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-xl font-black">
                        STAGE{group.stage}
                      </div>
                      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                        {formatSeasonTypeLabel(safeSeasonSummary.stageTypes?.[group.stage])}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((member) => {
                        const slot = group.slots.find((item) => item.member === member);
                        return (
                          <FormationSlot
                            key={`${group.stage}-${member}`}
                            slot={slot || { stage: group.stage, member }}
                            compact={compact}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div
          className={
            isHorizontal
              ? "absolute inset-x-7 bottom-2 flex items-center justify-between pt-2 text-[11px] font-semibold text-zinc-500"
              : isSquare
                ? "absolute inset-x-7 bottom-2 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] font-semibold text-zinc-500"
                : "absolute inset-x-10 bottom-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold text-zinc-500"
          }
        >
          <div className="flex items-center gap-3">
            <span>学マス コンテスト戦績トラッカー</span>

            <div
              className={
                isHorizontal
                  ? "flex items-center gap-2 text-[9px] text-zinc-400"
                  : "flex items-center gap-3 text-[10px] text-zinc-400"
              }
            >
              <span>🌟 総合TOP</span>
              <span>🔥 平均素点TOP</span>
              <span>👑 平均順位TOP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
