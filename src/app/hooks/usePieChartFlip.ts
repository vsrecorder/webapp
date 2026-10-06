"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import type { Chart as ChartJS } from "chart.js";

// 詳細カードの開閉アニメーションの長さ。場所取りの要素(transition-all duration-300)と揃える
export const PIE_FLIP_DURATION_MS = 300;
// Tailwind の transition の既定のイージング。場所取りの要素・凡例の動きと揃える
const PIE_FLIP_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

type Params = {
  chartRef: RefObject<ChartJS<"pie"> | null>;
  // 円グラフの入れ物。開閉後の最終の寸法をすぐに持つ(幅・高さをアニメさせない)
  boxRef: RefObject<HTMLElement | null>;
  // キャンバスの親。ここに transform をかけて開閉の動きを見せる
  flipRef: RefObject<HTMLElement | null>;
  // 詳細カードを表示中か
  isDetail: boolean;
};

type Circle = { x: number; y: number; r: number };

// 円の中心と半径(キャンバス内の CSS px)
function circleOf(chart: ChartJS<"pie">): Circle | null {
  const arc = chart.getDatasetMeta(0)?.data[0] as unknown as
    | { x: number; y: number; outerRadius: number }
    | undefined;
  if (!arc || !(arc.outerRadius > 0)) return null;
  return { x: arc.x, y: arc.y, r: arc.outerRadius };
}

// 要素に今かかっている transform(translate + 等倍の scale のみを想定)。途中で開閉し直したとき用
function currentTransform(el: HTMLElement): { s: number; tx: number; ty: number } {
  const value = getComputedStyle(el).transform;
  const m = value && value !== "none" ? value.match(/^matrix\(([^)]+)\)$/) : null;
  if (!m) return { s: 1, tx: 0, ty: 0 };
  const [a, , , , e, f] = m[1].split(",").map(Number);
  return { s: a, tx: e, ty: f };
}

/*
 * 詳細カードの開閉で円グラフの大きさ・位置が変わるのを、transform のアニメーションで見せるフック
 * (FLIP: 最終の状態で描いてから、元の見た目に合わせた transform をかけ、それを外していく)。
 *
 * 以前はキャンバスを包む要素の幅・高さそのものを CSS の transition(300ms)で動かしていた。
 * キャンバスの寸法が毎フレーム変わるので、そのたびにキャンバスの作り直しと chart.js の
 * 再計算・描き直しが走り、iPhone SE など CPU の遅い端末では開閉中にフレームが落ちていた
 * (CPU を4倍に絞った実測で、300ms の間に 33ms を超えるフレームが 7〜10 回)。
 *
 * ここでは開閉した瞬間(描画前の useLayoutEffect)に最終の寸法で1回だけ描き直し、
 * 「開閉前の円の中心と半径」に重なるよう translate + scale をかけてから、それを外していく。
 * transform はコンポジタで処理されるので、アニメーション中に円グラフを描き直すことは無い。
 * 外周バッジは寸法が落ち着くまで描かない(pieSlicesSpritePlugin の startSettleLoop が
 * transform を含む実寸の変化を見ていて、動き終わってから描き直す)。
 *
 * 動いている間は入れ物へのタップを受けない(pointer-events: none)。入れ物は最終の寸法を
 * すぐに持つので、閉じた直後は詳細表示より背の高い入れ物が、まだ下がりきっていない凡例の上に
 * 最大 96px かぶさる。そのままだと凡例へのタップを円グラフ側で判定してしまい、
 * 見えていない位置の扇形が選ばれて詳細が開き直ることがある。
 */
export default function usePieChartFlip({ chartRef, boxRef, flipRef, isDetail }: Params): void {
  // 前回動かしたときの開閉状態。初回マウント時(と、effect が同じ値で再実行されたとき)は
  // 開閉の動き自体が無いので何もしない
  const prevIsDetailRef = useRef(isDetail);
  // 動いている間タップを止めておき、終わったら戻すタイマー
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (prevIsDetailRef.current === isDetail) return;
    prevIsDetailRef.current = isDetail;

    const chart = chartRef.current;
    const box = boxRef.current;
    const flip = flipRef.current;
    if (!chart || !box || !flip) return;

    const before = circleOf(chart);

    // 開閉前に見えていた円。前の開閉の動きの途中なら、その時点の transform も含める
    const t = currentTransform(flip);
    const visible = before && {
      x: t.tx + t.s * before.x,
      y: t.ty + t.s * before.y,
      r: t.s * before.r,
    };

    // 最終の寸法で今すぐ描き直す。chart.js 自身のリサイズ検知(ResizeObserver)を待つと
    // 数フレーム遅れるうえ、アニメーション中(タップ位置のホバー表示など)はリサイズが
    // 次の描画まで先送りされるので、止めてから寸法を明示して呼ぶ。
    // 寸法は transform を含まない値で渡す(getBoundingClientRect は祖先の transform、
    // たとえば開いている途中のモーダルの拡大縮小まで含んでしまう)。入れ物は padding・border を
    // 持たないので、算出済みの width/height がそのまま chart.js の測る寸法(contentRect)になる。
    const style = getComputedStyle(box);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    // 表示されていない(display: none など)ときは測れない。表示されたときに chart.js 自身が合わせる
    if (!(width > 0 && height > 0)) return;
    chart.stop();
    chart.resize(width, height);

    const after = circleOf(chart);
    if (!visible || !after) return;

    const s = visible.r / after.r;
    const tx = visible.x - s * after.x;
    const ty = visible.y - s * after.y;

    // 開閉前の見た目に合わせた位置から、何もかけない状態まで動かす
    flip.style.transition = "none";
    flip.style.transformOrigin = "0 0";
    flip.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    // 開始位置を確定させてから transition を付け直す(付けたまま書き換えると開始位置が飛ぶ)
    void flip.getBoundingClientRect();
    flip.style.transition = `transform ${PIE_FLIP_DURATION_MS}ms ${PIE_FLIP_EASING}`;
    flip.style.transform = "";

    // 動いている間はタップを受けない(冒頭のコメント参照)
    box.style.pointerEvents = "none";
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => {
      releaseTimerRef.current = null;
      box.style.pointerEvents = "";
    }, PIE_FLIP_DURATION_MS);
  }, [isDetail, chartRef, boxRef, flipRef]);
}
