// 円グラフの外側に確保する余白（左右 x / 上下 y）
export type PieChartPadding = { x: number; y: number };

// 通常表示・詳細カード表示それぞれの「余白」と「キャンバスを包む要素の高さ」
export type PieChartBox = { padding: PieChartPadding; height: number };

/*
 * デッキ使用率・対戦相手のデッキ分布で使う円グラフの寸法。
 *
 * 実データのグラフ(DeckUsagePanel / OpponentDeckDistributionChart)、データが無いときの
 * ダミーグラフ(DeckUsageEmptyState)、読み込み中のプレースホルダは、すべてここの値を使う。
 * 別々に持つと、データの有無が切り替わった瞬間に円の中心が上下へ飛んでちらつく。
 */

// 円グラフ本体の高さ。外側スプライト分の余白はこれとは別にコンテナ側で確保し、
// 円自体の大きさはこの値のまま変えない。
export const CHART_SIZE = 192;
// 詳細カード表示中は外周バッジを描画せず円の中心に情報をまとめるため、外側の余白を
// 小さくできる分、円自体を一回り大きくして見やすくする
export const CHART_SIZE_DETAIL = 216;
// 円の外側にスプライトバッジを表示するための左右の余白（コンテナのmin-widthと合わせる。
// スプライト2体分のバッジが横向きになった場合でも見切れない最低限の値を確保する）
export const EXTERNAL_SPRITE_PADDING_X = 64;
// 詳細カード表示中は外周バッジ自体を描画しないため、見た目の余白程度の小さい値でよい
export const EXTERNAL_SPRITE_PADDING_X_NARROW = 28;
// 円の外側にスプライトバッジを表示するための上下の余白（コンテナの高さと合わせる）。
// バッジは上下方向にも同じ分だけ張り出すため、左右よりさらに余裕を持たせて見切れを防ぐ
export const EXTERNAL_SPRITE_PADDING_Y = 88;
// 詳細カード表示中は外周バッジ自体を描画しないため、見た目の余白程度の小さい値でよい
export const EXTERNAL_SPRITE_PADDING_Y_NARROW = 28;

// 通常表示・詳細カード表示それぞれの余白と、キャンバスを包む要素の高さ。
// 余白はキャンバスの高さに合わせて決める（paddingByChartHeight を参照）
export const CHART_BOX_NORMAL: PieChartBox = {
  padding: { x: EXTERNAL_SPRITE_PADDING_X, y: EXTERNAL_SPRITE_PADDING_Y },
  height: CHART_SIZE + EXTERNAL_SPRITE_PADDING_Y * 2,
};
export const CHART_BOX_DETAIL: PieChartBox = {
  padding: {
    x: EXTERNAL_SPRITE_PADDING_X_NARROW,
    y: EXTERNAL_SPRITE_PADDING_Y_NARROW,
  },
  height: CHART_SIZE_DETAIL + EXTERNAL_SPRITE_PADDING_Y_NARROW * 2,
};

// chart.js の layout.padding に渡す形。x/y を四辺に展開する
export function toChartPadding(box: PieChartBox) {
  return {
    top: box.padding.y,
    bottom: box.padding.y,
    left: box.padding.x,
    right: box.padding.x,
  };
}

function lerp(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}

/*
 * 詳細カードの開閉に対応する円グラフの layout.padding。chart.js の options に関数のまま渡す
 * (layout.padding は scriptable で、chart.js はレイアウトを計算するたびにこれを呼ぶ)。
 *
 * 余白を「詳細カードを表示中か」から直接決めると、余白は切り替えた瞬間に新しい値になるのに
 * キャンバスの寸法は遅れて追従するため、その間だけ「狭いキャンバスに広い余白」
 * 「広いキャンバスに狭い余白」になり、円が目標と逆向きに大きく振れる
 * (chart.js は描画領域の短辺から半径を決める。実測: 閉じたとき半径 66→53→94px)。
 * キャンバス自身の高さ(chart.height)から決めれば、いつ更新されても余白と寸法は食い違わない。
 *
 * 開閉では寸法を最終の値へ一度に変え、動きは transform で見せる(usePieChartFlip)ので、
 * 実際に使うのは両端の値だけ。途中の高さでは間を補間する(ウインドウの幅を変えたときなど、
 * 開閉以外でキャンバスの寸法が動いても破綻しないように)。
 */
export function paddingByChartHeight({ chart }: { chart: { height: number } }) {
  const span = CHART_BOX_NORMAL.height - CHART_BOX_DETAIL.height;
  const progress =
    span === 0
      ? 1
      : Math.min(1, Math.max(0, (chart.height - CHART_BOX_DETAIL.height) / span));
  const x = lerp(CHART_BOX_DETAIL.padding.x, CHART_BOX_NORMAL.padding.x, progress);
  const y = lerp(CHART_BOX_DETAIL.padding.y, CHART_BOX_NORMAL.padding.y, progress);
  return { top: y, bottom: y, left: x, right: x };
}
