import { isDevEnv } from "@app/utils/appIcon";

// PWA の起動画面とステータスバーの色。manifest.ts と layout.tsx の両方から参照し、
// 値がバラけて起動画面がちらつくのを防ぐ。
//
// Android の WebAPK は起動時に次の順で画面が出る(2026-09-09 の実機動画をフレーム解析して確定)。
//   1. WebAPK シェル自身のスプラッシュ … 地色 background_color、ステータスバーは theme_color、
//      ナビゲーションバーはシェルのテーマ既定の黒。
//   2. Chrome のスプラッシュ … 1 のスクリーンショットを半透明ウィンドウで 1 の上に重ね、
//      全画面(edge-to-edge)に描く。バーの領域も地色になる。
//   3. Chrome がスプラッシュを消す直前に半透明を解除し(Window#setFormat)、描画バッファが
//      作り直される 1 フレームだけ下敷きの 1 が露出する。ここで 1 と 2 の見た目が違うと
//      「起動画面が揺らぐ」。
// ページ側で揃えられるのはステータスバー色だけなので、manifest の theme_color は
// スプラッシュの地色と同じ値にし、アプリ表示中のステータスバー色は Android の standalone 表示に
// 限って <meta name="theme-color">(getStatusBarColor)で別途ヘッダー色に上書きする。
// Chrome は manifest の theme_color をページ読み込み前の既定色として使い、ページに
// theme-color の meta があればそちらを優先する。

/** スプラッシュの地色。manifest の background_color / theme_color と、manifest 用アイコンの地色 */
export function getSplashBackgroundColor(): string {
  return isDevEnv() ? "#FB7A06" : "#0779F6";
}

/**
 * アプリ表示中のステータスバー色。ヘッダーのグラデーション始点(本番は blue-600)に合わせる。
 * dev 環境は一目で区別できるようオレンジにする。
 */
export function getStatusBarColor(): string {
  return isDevEnv() ? "#EA580C" : "#2563EB";
}
