/*
 * 画面下に出る帯(登録時アンケート・ホーム画面に追加・通知の許諾・記録中)の高さを、
 * 画面のほうへ知らせるための受け渡し。
 *
 * 帯は position:fixed で浮いているので、そのままでは本文の末尾やフローティング
 * ボタンに被る。実寸をここへ載せて、場所を空ける側が足せるようにする。
 *
 * 帯は同時に1枚しか出さない(PwaBanners が決める)ので、値も常に1枚ぶん。
 */

/*
 * 高さを載せる CSS 変数。出ていないときは 0。
 *
 * 本文の下余白・フローティングボタン・カードのクリアランスが --mobile-nav-height に
 * これを足して場所を空ける。名前は記録中バーのために作ったときのままだが、
 * いまは画面下に出る帯すべてで使う。
 *
 * 値は実寸(px)で入れること。クリアランスの計算(FloatingButtonClearance)が JS から
 * 読むので、rem のままだと換算が要る。
 */
const BOTTOM_BANNER_HEIGHT_VAR = "--recording-bar-height";

/*
 * 高さが変わったことを知らせるイベント。
 *
 * 変数が変わったことを CSS から知る手立てが無いので、測り直しが要る側
 * (FloatingButtonClearance)へ自分で知らせる。
 *
 * window の resize は使わない。画面幅の変化を見ている箇所が他に7つほどあり
 * (デッキ一覧の列数・固定バーの位置合わせなど)、帯が出入りするたびに全部が
 * 無駄に測り直すことになる。実際には画面の大きさは変わっていない。
 */
export const BOTTOM_BANNER_RESIZE_EVENT = "vsrecorder:bottom-banner-resize";

export function setBottomBannerHeight(px: number): void {
  if (typeof document === "undefined") return;

  document.documentElement.style.setProperty(BOTTOM_BANNER_HEIGHT_VAR, `${px}px`);
  window.dispatchEvent(new Event(BOTTOM_BANNER_RESIZE_EVENT));
}

// いま設定されている帯の高さ(px)。読めなければ 0
export function readBottomBannerHeight(): number {
  if (typeof document === "undefined") return 0;

  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    BOTTOM_BANNER_HEIGHT_VAR,
  );
  const px = parseFloat(raw);

  return Number.isNaN(px) ? 0 : px;
}
