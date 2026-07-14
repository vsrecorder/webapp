"use client";

import type { KizunaMetric } from "@app/utils/kizuna";

type Props = {
  metrics: KizunaMetric[];
};

// ── 図形の定数 ────────────────────────────────────────────────
// viewBox は軸ラベル（最長「逆境ロイヤルティ」）が収まる幅を確保している。
const VIEW_W = 300;
const VIEW_H = 202;
const CX = VIEW_W / 2;
const CY = 96;
const RADIUS = 66;
// 目盛りリング（25 / 50 / 75 / 100%）
const RINGS = [0.25, 0.5, 0.75, 1];

// i番目の軸の座標。頂点を真上から時計回りに配置する。
function axisPoint(index: number, total: number, ratio: number) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  return {
    x: CX + Math.cos(angle) * RADIUS * ratio,
    y: CY + Math.sin(angle) * RADIUS * ratio,
  };
}

// 軸ラベルの位置と揃え方。左右の軸は外側へ逃がす。
function labelAnchor(index: number, total: number) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  const x = CX + Math.cos(angle) * (RADIUS + 16);
  const y = CY + Math.sin(angle) * (RADIUS + 16);
  const cos = Math.cos(angle);

  return {
    x,
    // 上下の軸はラベルが図形に被らないよう、縦方向に少しずらす
    y: y + (Math.abs(cos) < 0.1 ? (y < CY ? -4 : 12) : 4),
    anchor: Math.abs(cos) < 0.1 ? "middle" : cos > 0 ? "start" : "end",
  } as const;
}

/*
 * きずなLv.の内訳をあらわす六角形のレーダー。
 *
 * canvas（chart.js）ではなく、素の SVG で描くこと。
 * captureThemedPng は cloneNode で DOM の静的スナップショットを取るため、
 * <canvas> をクローンしても描画内容（ビットマップ）は複製されず、シェア画像では
 * 真っ白になる。SVG はDOMそのものなのでクローンしても欠けない。
 *
 * 単一系列のため凡例は置かない。正確な値は隣の一覧（数値）が担うので、
 * 頂点に数値ラベルは打たない（図が読めなくなるため）。
 */
export default function KizunaRadarChart({ metrics }: Props) {
  const total = metrics.length;

  const valuePoints = metrics
    .map((m, i) => {
      const p = axisPoint(i, total, Math.max(0.02, m.value));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full"
      role="img"
      aria-label={`きずなLv.の内訳: ${metrics
        .map((m) => `${m.label} ${Math.round(m.value * 100)}`)
        .join("、")}`}
    >
      <defs>
        <linearGradient id="kizuna-radar-fill" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="kizuna-radar-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* 目盛りリング（控えめに） */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={metrics
            .map((_, i) => {
              const p = axisPoint(i, total, ring);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
      ))}

      {/* 軸（スポーク） */}
      {metrics.map((m, i) => {
        const p = axisPoint(i, total, 1);
        return (
          <line
            key={m.key}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        );
      })}

      {/* 値の多角形 */}
      <polygon
        points={valuePoints}
        fill="url(#kizuna-radar-fill)"
        stroke="url(#kizuna-radar-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 頂点 */}
      {metrics.map((m, i) => {
        const p = axisPoint(i, total, Math.max(0.02, m.value));
        return (
          <circle
            key={m.key}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#FBBF24"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
        );
      })}

      {/* 軸ラベル。数値は打たない（一覧側で正確な値を読ませる） */}
      {metrics.map((m, i) => {
        const l = labelAnchor(i, total);
        return (
          <text
            key={m.key}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            fontSize="10"
            fontWeight="700"
            fill="rgba(255,255,255,0.72)"
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}
