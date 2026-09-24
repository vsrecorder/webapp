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
// スプラッシュの地色と同じ値にする。
//
// アプリ表示中のステータスバー(通知バー)も同じ色にする。WebAPK はページの
// <meta name="theme-color"> を反映せず manifest の theme_color で塗り続ける(実機で確認)ため、
// Android ではそもそもこの色から動かせない。iOS の standalone も同じ色を meta で指定して
// 両 OS を1色に揃え、ヘッダーの上端をこの色から溶かして境目を消す(Header.tsx)。
// 通知バーは OS が単色で塗るので、グラデーションにはできない。

/** スプラッシュの地色。manifest の background_color / theme_color と、manifest 用アイコンの地色 */
export function getSplashBackgroundColor(): string {
  return isDevEnv() ? "#FB7A06" : "#0779F6";
}

/**
 * アプリ表示中のステータスバー(通知バー)の色。スプラッシュの地色と同じ(上の説明を参照)。
 * ヘッダー上端の溶かし込みと、iOS の最下端のセーフエリアを塗る body の地色もこれに合わせる。
 */
export function getStatusBarColor(): string {
  return getSplashBackgroundColor();
}
