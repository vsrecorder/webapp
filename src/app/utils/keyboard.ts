/*
 * ソフトウェアキーボードの表示が終わったあとに、隠れた入力欄を可視領域までスクロールする。
 *
 * ブラウザ既定のスクロールはフォーカス時点、つまりキーボードでビューポートが縮む前に走るため、
 * 縮んだ結果として入力欄が隠れてしまってもそのままになる。縮み終わり(visualViewport の resize)を
 * 待って、改めてスクロールし直す。
 *
 * スクロールは1回だけ実行する。resize とフォールバックタイマーの両方を残すと二重に走るうえ、
 * 未消費の resize リスナーが残ると、ユーザーのスクロール中に起きるビューポート高さ変化
 * (iOS のツールバー収縮など)で後から発火し、スクロール位置を入力欄へ引き戻してしまう。
 *
 *   <Input onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)} />
 */
export function scrollIntoViewAfterKeyboard(element: Element) {
  // HeroUI のモーダルが開いている間(react-aria の usePreventScroll が documentElement に
  // overflow:hidden を設定している間)は何もしない。react-aria がフォーカス要素を
  // スクロール親の範囲内で可視化してくれる。そこへ native scrollIntoView を重ねると、
  // iOS ではレイアウトビューポートごとスクロールされ、fixed のモーダルが画面上部へ
  // ずれたまま戻らなくなる(react-aria が scrollIntoView を使わないのはこのため)
  if (getComputedStyle(document.documentElement).overflow === "hidden") return;

  const viewport = typeof window !== "undefined" ? window.visualViewport : null;

  let timer: ReturnType<typeof setTimeout>;

  const doScroll = () => {
    clearTimeout(timer);
    viewport?.removeEventListener("resize", doScroll);

    // フォーカスが既に外れているなら、ユーザーは次の操作に移っている。割り込まない
    if (!element.contains(document.activeElement)) return;

    // 入力欄が可視領域に収まっているならスクロール不要。
    // 見えている状態で中央寄せすると、ユーザーが自分で調整したスクロール位置を奪ってしまう
    const rect = element.getBoundingClientRect();
    const visibleTop = viewport?.offsetTop ?? 0;
    const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight);
    if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (viewport) {
    viewport.addEventListener("resize", doScroll, { once: true });
    // キーボードが既に出ている(= resize が発火しない)場合のフォールバック
    timer = setTimeout(doScroll, 500);
  } else {
    timer = setTimeout(doScroll, 300);
  }
}
