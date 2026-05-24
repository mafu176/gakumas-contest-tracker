"use client";

function formatRate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(1)}%` : "0.0%";
}

function clampRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function pointBetween(center, vertex, rate) {
  const ratio = clampRate(rate) / 100;

  return {
    x: center.x + (vertex.x - center.x) * ratio,
    y: center.y + (vertex.y - center.y) * ratio,
  };
}

function getStageType(stageTypes, stage) {
  return stageTypes?.[stage] || stageTypes?.[String(stage)] || "未設定";
}

function StageLabel({ className = "", title, rate, type }) {
  return (
    <div className={`z-10 ${className}`}>
      <div className="text-[10px] font-black leading-none tracking-wide text-white">
        {title}
      </div>
      <div className="mt-0.5 text-sm font-black leading-none text-white">
        {formatRate(rate)}
      </div>
      <div className="mt-1 inline-flex rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-black text-white">
        {type}
      </div>
    </div>
  );
}

export default function SeasonWinTriangle({
  stage1WinRate = 0,
  stage2WinRate = 0,
  stage3WinRate = 0,
  totalWinRate = 0,
  stageTypes = {},
  compact = false,
}) {
  const width = compact ? 360 : 520;
  const height = compact ? 300 : 380;

  const center = { x: width / 2, y: height * 0.58 };
  const vertices = {
    stage1: { x: width / 2, y: height * 0.19 },
    stage2: { x: width * 0.18, y: height * 0.78 },
    stage3: { x: width * 0.82, y: height * 0.78 },
  };

  const p1 = pointBetween(center, vertices.stage1, stage1WinRate);
  const p2 = pointBetween(center, vertices.stage2, stage2WinRate);
  const p3 = pointBetween(center, vertices.stage3, stage3WinRate);

  const outlinePoints = `${vertices.stage1.x},${vertices.stage1.y} ${vertices.stage2.x},${vertices.stage2.y} ${vertices.stage3.x},${vertices.stage3.y}`;
  const ratePoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

  return (
    <div className="relative h-full w-full overflow-visible bg-transparent text-white">
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.22em] text-zinc-400">
            STAGE WIN RATE
          </div>
          <div className="mt-1 text-sm font-black text-white">
            ステージ勝率三角図
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 px-4 py-3 text-right">
          <div className="text-[10px] font-black text-zinc-400">全体</div>
          <div className="mt-1 text-lg font-black text-white">
            {formatRate(totalWinRate)}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[44px] top-[50px] overflow-visible">
        <div
          className={
            compact
              ? "relative mx-auto h-full min-h-[250px] w-full max-w-[420px] overflow-visible"
              : "relative mx-auto h-full min-h-[330px] w-full max-w-[560px] overflow-visible"
          }
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label="ステージ勝率三角図"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="triangleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <polygon
              points={outlinePoints}
              fill="transparent"
              stroke="rgba(255,255,255,0.38)"
              strokeWidth="2"
            />

            {[0.25, 0.5, 0.75].map((ratio) => {
              const q1 = {
                x: center.x + (vertices.stage1.x - center.x) * ratio,
                y: center.y + (vertices.stage1.y - center.y) * ratio,
              };
              const q2 = {
                x: center.x + (vertices.stage2.x - center.x) * ratio,
                y: center.y + (vertices.stage2.y - center.y) * ratio,
              };
              const q3 = {
                x: center.x + (vertices.stage3.x - center.x) * ratio,
                y: center.y + (vertices.stage3.y - center.y) * ratio,
              };

              return (
                <polygon
                  key={ratio}
                  points={`${q1.x},${q1.y} ${q2.x},${q2.y} ${q3.x},${q3.y}`}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                />
              );
            })}

            <line x1={center.x} y1={center.y} x2={vertices.stage1.x} y2={vertices.stage1.y} stroke="rgba(255,255,255,0.18)" />
            <line x1={center.x} y1={center.y} x2={vertices.stage2.x} y2={vertices.stage2.y} stroke="rgba(255,255,255,0.18)" />
            <line x1={center.x} y1={center.y} x2={vertices.stage3.x} y2={vertices.stage3.y} stroke="rgba(255,255,255,0.18)" />

            <polygon
              points={ratePoints}
              fill="rgba(250, 204, 21, 0.32)"
              stroke="#facc15"
              strokeWidth="4"
              filter="url(#triangleGlow)"
            />

            {[p1, p2, p3].map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="7"
                fill="#facc15"
                stroke="white"
                strokeWidth="3"
              />
            ))}
          </svg>

          <StageLabel
            className="absolute left-1/2 top-[0%] -translate-x-1/2 text-center"
            title="STAGE1"
            rate={stage1WinRate}
            type={getStageType(stageTypes, 1)}
          />

          <StageLabel
            className="absolute bottom-[12%] left-[0%] text-left"
            title="STAGE2"
            rate={stage2WinRate}
            type={getStageType(stageTypes, 2)}
          />

          <StageLabel
            className="absolute bottom-[12%] right-[0%] text-right"
            title="STAGE3"
            rate={stage3WinRate}
            type={getStageType(stageTypes, 3)}
          />

          <div className="absolute left-1/2 top-[57%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-black/80 shadow-2xl ring-1 ring-white/10">
            <div className="text-[9px] font-black tracking-[0.16em] text-zinc-400">
              TOTAL
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {formatRate(totalWinRate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
