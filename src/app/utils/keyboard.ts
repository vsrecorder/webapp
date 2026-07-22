import { isAndroid } from "@app/utils/platform";

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

// スクロールを担っている祖先を探す。
// モーダル側で [data-keyboard-scroll-container] を付けておけば、それを優先する
// (overflow-x だけの横スクロール行は overflow-y が auto に計算されるため、
//  素朴に overflow-y だけを見ると誤検出しうる)。
function findScrollContainer(element: Element): HTMLElement | null {
  const marked = element.closest<HTMLElement>("[data-keyboard-scroll-container]");
  if (marked) return marked;

  let node = element.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

/*
 * 【Android 限定】ソフトウェアキーボードが出たあと、対象要素がスクロール領域の
 * 上端に来るようにする。
 *
 * モーダル内では scrollIntoViewAfterKeyboard は何もしない(documentElement が
 * overflow:hidden のため)。代わりに react-aria が「見える範囲に入る最小限」だけ
 * スクロールするので、Android では入力欄がキーボードのすぐ上に貼り付き、その下に
 * 出る履歴候補がキーボードの裏に隠れてしまう。そこで入力欄(を含むカード)を
 * 可視領域の上端へ引き上げ、下に続く候補まで見えるようにする。
 *
 * iOS は対象にしない。キーボード表示中のスクロールはレイアウトビューポートごと
 * 動く事故につながりやすく、現状 react-aria の既定挙動で問題が出ていないため。
 * (同じ理由で scrollIntoView も使わず、スクロール親の scrollTop だけを動かす)
 *
 *   <Input onFocus={(e) => scrollToTopAfterKeyboard(e.currentTarget.closest("[data-xxx]"))} />
 */
export function scrollToTopAfterKeyboard(element: Element | null, offset = 8) {
  if (typeof window === "undefined" || !element) return;

  if (!isAndroid()) return;

  const container = findScrollContainer(element);
  if (!container) return;

  const viewport = window.visualViewport;

  // キーボードでビューポートが変化したか。変化していないデスクトップでは、
  // 見えている入力欄をわざわざ動かさない(ユーザーの位置を奪わない)
  let resizedByKeyboard = false;

  const align = (force: boolean) => {
    // フォーカスが外れているなら、ユーザーは次の操作に移っている。割り込まない
    if (!container.contains(document.activeElement)) return;

    const rect = element.getBoundingClientRect();
    const box = container.getBoundingClientRect();

    const isFullyVisible = rect.top >= box.top && rect.bottom <= box.bottom;
    if (!force && isFullyVisible) return;

    const delta = rect.top - box.top - offset;
    if (Math.abs(delta) < 2) return;

    container.scrollTop += delta;
  };

  // キーボードは段階的に開くため、変化のたびに合わせ直す
  const onViewportResize = () => {
    resizedByKeyboard = true;
    align(true);
  };
  viewport?.addEventListener("resize", onViewportResize);

  // キーボードが既に出ている(= resize が発火しない)場合は、隠れているときだけ引き上げる
  setTimeout(() => align(false), 250);

  // キーボードのアニメーションが終わるころに最終位置へ合わせ、後片付けする
  setTimeout(() => {
    viewport?.removeEventListener("resize", onViewportResize);
    align(resizedByKeyboard);
  }, 700);
}
