"use client";

import { useId } from "react";

/*
 * シェア画像用の勝率の折れ線グラフ（SVG + DOM）。
 *
 * 画面の月毎の勝率推移は chart.js の <canvas> で描いているが、書き出し(captureThemedPng)は
 * DOM の複製から画像を作るため、<canvas> の描画内容は写らず真っ白になる
 * （SharePieChart のコメントも参照）。そこでシェア画像では同じ見た目を SVG で描き直す。
 *
 * 文字（軸の目盛り・点の上の勝率）は SVG の <text> ではなく DOM で重ねる。書き出しは
 * <svg> の子要素へ計算済みスタイルを写さないため、<text> だとフォントや色がアプリの
 * 指定から外れてしまう。DOM の文字は画面と同じ指定のまま写る。
 *
 * 線・点・塗りの配色と曲線の張り(tension)は画面のグラフ（UserStatHistoryChart）に合わせてある。
 */

export type ShareWinRatePoint = {
  // x 軸のラベル（例: 「7月」「25/12」）
  label: string;
  // 勝率(0〜100)
  value: number;
};

type Props = {
  points: ShareWinRatePoint[];
  // グラフの幅(px)
  width: number;
  // 点の上に勝率を添えるか。点が多いと隣と重なるため、呼び出し側で決める
  showValues: boolean;
};

// グラフ全体の高さ(px)
const HEIGHT = 200;
// 左の目盛り(「100%」)の幅
const Y_AXIS_WIDTH = 34;
// 上端の余白。100% の点の上に添える勝率が収まるだけ空ける
const TOP_PADDING = 22;
// 下の月ラベルの帯の高さ
const X_AXIS_HEIGHT = 20;
// 描画領域の左右の内側の余白。端の点の上の勝率がはみ出さないよう、点を内側へ寄せる
const X_INSET = 16;
// 目盛りの刻み(画面のグラフの stepSize: 25 と同じ)
const Y_TICKS = [0, 25, 50, 75, 100];
// 曲線の張り。画面のグラフ(chart.js の tension: 0.3)と同じ
const TENSION = 0.3;
// 月ラベル同士の最小の間隔(px)。「25/12」がおよそ 28px なので、並べて読める幅を取る。
// 点がこれより詰まるときは、画面のグラフ(chart.js の目盛りの自動間引き)と同じくラベルを間引く
const MIN_LABEL_SPACING = 36;
const POINT_RADIUS = 4;
const LINE_WIDTH = 2;
// 点に添える勝率の札の高さ(文字 10px + 上下の余白 2px ずつ)と、点との間隔
const VALUE_LABEL_HEIGHT = 14;
const VALUE_LABEL_GAP = 3;

// ブランドのグラデーション(globals.css の --brand-gradient / utils/chartBrandGradient と同じ
// blue-600 → indigo-600 → violet-700)。SVG の子要素は CSS 変数を解決できない環境があるため値で持つ
const GRADIENT_STOPS = [
  { offset: "0%", color: "#2563eb" },
  { offset: "50%", color: "#4f46e5" },
  { offset: "100%", color: "#6d28d9" },
];

type Point = { x: number; y: number };

/*
 * 谷の点か(前後の点がどちらもこの点以上で、少なくとも一方は高い)。
 * 谷の点の上に勝率を置くと、両側から下りてくる線が文字を横切るので、点の下へ回す。
 * 端の点は隣の1点だけで判断する。
 */
export function isValleyPoint(values: number[], index: number): boolean {
  const neighbors = [values[index - 1], values[index + 1]].filter(
    (v): v is number => v !== undefined,
  );
  if (neighbors.length === 0) return false;
  return (
    neighbors.every((v) => v >= values[index]) && neighbors.some((v) => v > values[index])
  );
}

// 座標は小数第2位までに丸める(属性値を短くするため。見た目には影響しない桁)
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/*
 * 各点の前後の制御点を求める。chart.js の splineCurve と同じ式で、画面のグラフと同じ曲がり方にする。
 * 制御点は描画領域の上下に収める(chart.js の capBezierPoints と同じ扱い。0% や 100% の付近で
 * 曲線が領域の外へ膨らまないようにする)。
 */
function controlPoints(
  prev: Point,
  cur: Point,
  next: Point,
  minY: number,
  maxY: number,
): { before: Point; after: Point } {
  const d01 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
  const d12 = Math.hypot(next.x - cur.x, next.y - cur.y);
  const total = d01 + d12;
  const s01 = total > 0 ? d01 / total : 0;
  const s12 = total > 0 ? d12 / total : 0;
  const fa = TENSION * s01;
  const fb = TENSION * s12;
  const clampY = (y: number) => Math.max(minY, Math.min(maxY, y));

  return {
    before: {
      x: cur.x - fa * (next.x - prev.x),
      y: clampY(cur.y - fa * (next.y - prev.y)),
    },
    after: {
      x: cur.x + fb * (next.x - prev.x),
      y: clampY(cur.y + fb * (next.y - prev.y)),
    },
  };
}

// 点を順に結ぶ曲線のパス(M から始まる)
function linePath(points: Point[], minY: number, maxY: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

  const controls = points.map((cur, i) =>
    controlPoints(points[i - 1] ?? cur, cur, points[i + 1] ?? cur, minY, maxY),
  );

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const c1 = controls[i - 1].after;
    const c2 = controls[i].before;
    const p = points[i];
    d += ` C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p.x)} ${round(p.y)}`;
  }
  return d;
}

export default function ShareWinRateLineChart({ points, width, showValues }: Props) {
  // 同じページに複数置かれてもグラデーションの id がぶつからないようにする。
  // useId の値には id に使いにくい記号が混ざるため取り除く
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const lineGradientId = `share-winrate-line-${uid}`;
  const areaGradientId = `share-winrate-area-${uid}`;

  const plotLeft = Y_AXIS_WIDTH;
  const plotRight = width;
  const plotTop = TOP_PADDING;
  const plotBottom = HEIGHT - X_AXIS_HEIGHT;
  const plotHeight = plotBottom - plotTop;

  const innerLeft = plotLeft + X_INSET;
  const innerRight = plotRight - X_INSET;

  const toY = (value: number) => plotTop + (1 - value / 100) * plotHeight;
  // 1点だけのときは中央に置く
  const toX = (index: number) =>
    points.length <= 1
      ? (innerLeft + innerRight) / 2
      : innerLeft + ((innerRight - innerLeft) * index) / (points.length - 1);

  // 何点おきに月ラベルを出すか
  const pointSpacing =
    points.length > 1 ? (innerRight - innerLeft) / (points.length - 1) : Infinity;
  const labelStep = Math.max(1, Math.ceil(MIN_LABEL_SPACING / pointSpacing));

  const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.value) }));
  const line = linePath(coords, plotTop, plotBottom);
  // 線の下の塗り。線をそのまま下端まで下ろして閉じる
  const area =
    coords.length > 1
      ? `${line} L ${round(coords[coords.length - 1].x)} ${plotBottom} L ${round(coords[0].x)} ${plotBottom} Z`
      : "";

  return (
    <div className="relative" style={{ width, height: HEIGHT }}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <defs>
          {/* 描画領域の左端から右端へ流す(画面のグラフと同じ向き)。点の色も位置で決まる */}
          <linearGradient
            id={lineGradientId}
            gradientUnits="userSpaceOnUse"
            x1={innerLeft}
            y1={0}
            x2={innerRight}
            y2={0}
          >
            {GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient
            id={areaGradientId}
            gradientUnits="userSpaceOnUse"
            x1={innerLeft}
            y1={0}
            x2={innerRight}
            y2={0}
          >
            {GRADIENT_STOPS.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                // 画面のグラフの塗り(不透明度 0.1)と同じ
                stopOpacity={0.1}
              />
            ))}
          </linearGradient>
        </defs>

        {/* 横の目盛り線。色は書き出し時に計算済みの値へ書き戻される(captureImage の inlineSvgVarPaints) */}
        {Y_TICKS.map((tick) => (
          <line
            key={tick}
            x1={plotLeft}
            x2={plotRight}
            y1={round(toY(tick))}
            y2={round(toY(tick))}
            stroke="hsl(var(--heroui-default-200))"
            strokeWidth={1}
          />
        ))}

        {area && <path d={area} fill={`url(#${areaGradientId})`} />}
        {coords.length > 1 && (
          <path
            d={line}
            fill="none"
            stroke={`url(#${lineGradientId})`}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={round(c.x)}
            cy={round(c.y)}
            r={POINT_RADIUS}
            fill={`url(#${lineGradientId})`}
          />
        ))}
      </svg>

      {/* 縦軸の目盛り(右寄せ) */}
      {Y_TICKS.map((tick) => (
        <span
          key={tick}
          className="absolute -translate-y-1/2 text-right text-[0.625rem] leading-none text-default-500 tabular-nums"
          style={{ left: 0, top: toY(tick), width: Y_AXIS_WIDTH - 6 }}
        >
          {tick}%
        </span>
      ))}

      {/* 横軸の月ラベル。詰まるときは先頭から labelStep おきに出す */}
      {points.map((p, i) =>
        i % labelStep !== 0 ? null : (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[0.625rem] leading-none text-default-500 tabular-nums"
            style={{ left: toX(i), top: plotBottom + 7 }}
          >
            {p.label}
          </span>
        ),
      )}

      {/* 点に添える勝率。ふだんは点の上、谷の点は点の下に置く(下の月ラベルに
          かかるほど低いときは上のまま)。線が文字の後ろを通っても読めるよう、札の地を
          カードと同じ色で塗って線を隠す */}
      {showValues &&
        points.map((p, i) => {
          const y = toY(p.value);
          const belowTop = y + POINT_RADIUS + VALUE_LABEL_GAP;
          const below =
            isValleyPoint(
              points.map((q) => q.value),
              i,
            ) && belowTop + VALUE_LABEL_HEIGHT <= plotBottom;
          return (
            <span
              key={i}
              className="absolute -translate-x-1/2 whitespace-nowrap rounded bg-content1 px-1 py-0.5 text-[0.625rem] font-bold leading-none text-primary tabular-nums"
              style={{
                left: toX(i),
                top: below
                  ? belowTop
                  : y - POINT_RADIUS - VALUE_LABEL_GAP - VALUE_LABEL_HEIGHT,
              }}
            >
              {p.value.toFixed(1)}%
            </span>
          );
        })}
    </div>
  );
}
