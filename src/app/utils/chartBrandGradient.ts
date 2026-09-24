/*
 * chart.js の線・点・塗りに使う、ブランドのグラデーション(globals.css の --brand-gradient と同じ
 * blue-600 → indigo-600 → violet-700)。グラフは canvas に描くので CSS 変数は使えず、
 * canvas のグラデーションを描画領域の左端から右端へ作る。
 *
 * 色の引数に渡す関数(scriptable option)から呼ぶ。描画領域が決まる前(初回のレイアウト前)は
 * chartArea が無いので、中心の藍の単色を返す。
 */

// [位置, R, G, B]。blue-600 / indigo-600 / violet-700
const STOPS: [number, number, number, number][] = [
  [0, 37, 99, 235],
  [0.5, 79, 70, 229],
  [1, 109, 40, 217],
];

type ChartLike = {
  ctx: Pick<CanvasRenderingContext2D, "createLinearGradient">;
  chartArea?: { left: number; right: number } | null;
};

export function brandChartGradient(chart: ChartLike, alpha = 1): CanvasGradient | string {
  const { ctx, chartArea } = chart;
  if (!chartArea) return `rgba(79, 70, 229, ${alpha})`;

  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  for (const [offset, r, g, b] of STOPS) {
    gradient.addColorStop(offset, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  }
  return gradient;
}
