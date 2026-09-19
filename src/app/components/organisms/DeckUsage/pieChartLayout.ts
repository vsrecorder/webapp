import type { PieChartBox } from "@app/hooks/usePieChartPadding";

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
// 開閉アニメーションの最中は、この2つの間をキャンバスの実寸に合わせて補間する
// （切り替えた瞬間に余白だけ新しい値にすると円の大きさが逆向きに振れる。
//   usePieChartPadding のコメント参照）
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
