"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { Chart as ChartJS, TRBL } from "chart.js";

// 円グラフの外側に確保する余白（左右 x / 上下 y）
export type PieChartPadding = { x: number; y: number };

// 通常表示・詳細カード表示それぞれの「余白」と「キャンバスを包む要素の高さ」
export type PieChartBox = { padding: PieChartPadding; height: number };

type Params = {
  // キャンバスを包む要素。詳細カードの開閉に合わせて幅・高さがCSSのtransitionで変化する
  containerRef: RefObject<HTMLElement | null>;
  chartRef: RefObject<ChartJS<"pie"> | null>;
  // 詳細カードを表示中か
  isDetail: boolean;
  normal: PieChartBox;
  detail: PieChartBox;
};

// 高さがこのフレーム数動かなければ、CSSのtransitionが終わったとみなす
const SETTLED_FRAMES = 3;

function lerp(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}

function applyPadding(chart: ChartJS<"pie"> | null, padding: PieChartPadding) {
  if (!chart) return;

  const layout = chart.options.layout ?? (chart.options.layout = {});
  // 値が変わらないフレームでは chart.update を呼ばず、無駄な再描画を避ける
  const current = layout.padding as Partial<TRBL> | undefined;
  if (current?.top === padding.y && current?.left === padding.x) return;

  layout.padding = {
    top: padding.y,
    bottom: padding.y,
    left: padding.x,
    right: padding.x,
  };
  // 既定の更新アニメ(1000ms)に載せると、余白の変化がCSSのtransition(300ms)より
  // ずっと遅れて効いてくる。ここでは寸法に同期させたいので即座に反映する。
  chart.update("none");
}

/*
 * 詳細カードの開閉アニメーションの間、円グラフの余白(layout.padding)を
 * キャンバスの実寸に追従させるフック。
 *
 * 余白を「詳細カードを表示中か」から直接決めてしまうと、余白は切り替えた瞬間に
 * 新しい値になるのに、キャンバスの寸法はCSSのtransition(300ms)で遅れて追従するため、
 * その間だけ「狭いキャンバスに広い余白」「広いキャンバスに狭い余白」という不整合が起きる。
 * chart.jsは描画領域(chartArea)の短辺から円の半径を決めるので、円が目標と逆向きに
 * 大きく振れてから戻る動きになり、ちらついて見える
 * （実測: 閉じたとき半径 66→53→94px、開いたとき 94→106→66px）。
 * さらにchart.jsの既定の更新アニメ(1000ms)はCSSのtransition(300ms)より長いため、
 * 寸法が確定した後も円だけが膨らみ／縮み続けて収束が1秒近く遅れる。
 *
 * そこで、transitionの進行度を実測して余白を同じ進行度で補間し、即座に反映する。
 * 円の大きさは開始値から目標値まで単調に変化し、CSSのtransitionと同時に収まる。
 *
 * 進行度はコンテナの実寸ではなく chart.height（chart.jsが認識しているキャンバスの高さ）
 * から求める。chart.jsのリサイズ検知はResizeObserver経由で数フレーム遅れるため、
 * コンテナの実寸に合わせると「まだ広いキャンバスに狭い余白」の食い違いがその分だけ残り、
 * 円が一度膨らんでしまう。chart.js自身が見ている寸法に合わせれば食い違いは生じない。
 */
export default function usePieChartPadding({
  containerRef,
  chartRef,
  isDetail,
  normal,
  detail,
}: Params): void {
  // 初回マウント時は開閉アニメーション自体が無い。ここでchart.update("none")を呼ぶと
  // chart.jsの入場アニメ(円を描くスイープ)を打ち切ってしまうため何もしない。
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const target = isDetail ? detail.padding : normal.padding;
    const heightSpan = normal.height - detail.height;

    // 高さが変わらない構成では進行度を測れないので、そのまま目標値を使う
    if (heightSpan === 0) {
      applyPadding(chartRef.current, target);
      return;
    }

    let rafId = 0;
    let prevCanvasHeight = Number.NaN;
    let prevContainerHeight = Number.NaN;
    let stableFrames = 0;

    const tick = () => {
      const container = containerRef.current;
      const chart = chartRef.current;
      if (!container || !chart) {
        rafId = 0;
        return;
      }

      // キャンバスの高さは通常表示・詳細表示のどちらかで決まり、その間をCSSのtransitionが
      // 補間する。今どこまで進んだかが、そのままtransitionの進行度になる。
      const canvasHeight = chart.height;
      const progress = Math.min(
        1,
        Math.max(0, (canvasHeight - detail.height) / heightSpan),
      );
      applyPadding(chart, {
        x: lerp(detail.padding.x, normal.padding.x, progress),
        y: lerp(detail.padding.y, normal.padding.y, progress),
      });

      // キャンバス側はchart.jsのリサイズ検知の分だけ遅れて追従するため、
      // コンテナと両方が動かなくなって初めてtransitionが終わったといえる
      const containerHeight = container.getBoundingClientRect().height;
      stableFrames =
        Math.abs(canvasHeight - prevCanvasHeight) < 0.5 &&
        Math.abs(containerHeight - prevContainerHeight) < 0.5
          ? stableFrames + 1
          : 0;
      prevCanvasHeight = canvasHeight;
      prevContainerHeight = containerHeight;

      // 端数を残さないよう、収まったら目標値で締める
      if (stableFrames >= SETTLED_FRAMES) {
        rafId = 0;
        applyPadding(chart, target);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDetail, normal, detail, chartRef, containerRef]);
}
