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

// アニメーションを控える設定(OS のアクセシビリティ設定)かどうか
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    // 目的地はコンテンツ基準の絶対位置になる(要素の位置とスクロール位置は同じだけ動くため)。
    // スクロールの途中で測り直しても同じ値が出るので、キーボードのアニメーション中に
    // 何度呼ばれても目的地がぶれず、滑らかなスクロールが途中で飛ばない。
    container.scrollTo({
      top: container.scrollTop + delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  // キーボードは段階的に開くため、変化のたびに合わせ直す
  const onViewportResize = () => {
    resizedByKeyboard = true;
    align(true);
  };
  viewport?.addEventListener("resize", onViewportResize);

  // キーボードが既に出ている(= resize が発火しない)場合は、隠れているときだけ引き上げる
  setTimeout(() => align(false), 250);

  // キーボードが出そろうころに最終位置へ合わせ、後片付けする。
  // 監視を短く切りすぎると、キーボードの表示が遅い端末で取りこぼす
  setTimeout(() => {
    viewport?.removeEventListener("resize", onViewportResize);
    align(resizedByKeyboard);
  }, 1000);
}

/*
 * ソフトウェアキーボードが出たあと、対象の要素がスクロール領域の見える範囲に入るよう、
 * スクロール親だけを動かす。モーダルの中で使える。
 *
 * タップではなくプログラムからフォーカスした入力欄(ボタンを押すと現れて autoFocus する欄)向け。
 * HeroUI の autoFocus は preventScroll 付きでフォーカスするので、ブラウザは入力欄を見せる
 * スクロールをしない。キーボードでシートが縮んだあとは入力欄が下へ隠れたままになる
 * (Android で実際に起きた: タグ名の変更)。タップした入力欄では起きない。
 *
 * 既定では「隠れているぶんだけ」動かし、見えていれば何もしない。
 * toEnd を渡すと、見えていてもスクロール領域の一番下まで送る。入力欄の下に続く操作
 * (保存ボタンなど)が領域の末尾にあるとき、それらをまとめて見せるために使う。
 * どちらの場合も、対象の上端を見える範囲の上へ追い出すところまでは送らない。
 *
 * scrollIntoView は使わない(iOS ではレイアウトビューポートごと動き、fixed のシートが
 * ずれたまま戻らなくなる。scrollIntoViewAfterKeyboard のコメント参照)。
 *
 *   <Input autoFocus onFocus={(e) => revealAfterKeyboard(e.currentTarget, { toEnd: true })} />
 */
export function revealAfterKeyboard(
  element: Element | null,
  { toEnd = false, margin = 8 }: { toEnd?: boolean; margin?: number } = {},
) {
  if (typeof window === "undefined" || !element) return;

  const viewport = window.visualViewport;

  const align = () => {
    // フォーカスが外れているなら、ユーザーは次の操作に移っている。割り込まない
    if (!element.contains(document.activeElement)) return;

    // スクロール親は測るたびに探す。キーボードが出る前は中身が収まっていて
    // スクロール領域になっておらず、縮んで初めて溢れることがある
    const container = findScrollContainer(element);
    if (!container) return;

    const box = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    // 見える範囲はスクロール領域とキーボードを除いた画面の重なり。シートの高さは
    // キーボードに合わせて縮むが、その反映がこの呼び出しより後になることがあるので両方で見る
    const visibleTop = Math.max(box.top, viewport?.offsetTop ?? 0);
    const visibleBottom = Math.min(
      box.bottom,
      viewport ? viewport.offsetTop + viewport.height : window.innerHeight,
    );

    // 対象の上端が見える範囲の上端(+余白)に来るまでの量。これより先へは送らない
    const untilTop = rect.top - (visibleTop + margin);

    let delta = 0;
    if (toEnd) {
      // 一番下まで。行き先はスクロールの途中で測り直しても同じ値になる
      const untilEnd = container.scrollHeight - container.clientHeight - container.scrollTop;
      delta = Math.min(untilEnd, untilTop);
    } else if (rect.bottom > visibleBottom - margin) {
      // 下が隠れている: 下端が見えるところまで送る
      delta = Math.min(rect.bottom - (visibleBottom - margin), untilTop);
    } else if (untilTop < 0) {
      // 上が隠れている: 上端が見えるところまで戻す
      delta = untilTop;
    }

    if (Math.abs(delta) < 2) return;

    container.scrollTo({
      top: container.scrollTop + delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  /*
   * キーボードは段階的に開くため、変化のたびに合わせ直す。
   *
   * ただし resize の通知を受けたその場では測らない。シートの高さは HeroUI が同じ通知を受けて
   * CSS 変数(--visual-viewport-height)へ書き直すが、その反映は React の描画を挟むぶん遅れる。
   * その場で測ると「画面は縮んだのにシートは縮む前」の配置から行き先を出してしまい、
   * いったん行き過ぎてから戻る(実測: 913px へ向かい、32ms 後に 805px へ戻った)。
   * 描画を 2 フレーム待ってから測り、シートの大きさが変わったときにも測り直す。
   */
  let frame = 0;
  const alignSoon = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(align);
    });
  };

  viewport?.addEventListener("resize", alignSoon);

  const watched =
    element.closest<HTMLElement>("[data-keyboard-scroll-container]") ??
    findScrollContainer(element);
  const observer =
    watched && typeof ResizeObserver !== "undefined" ? new ResizeObserver(alignSoon) : null;
  if (watched) observer?.observe(watched);

  // キーボードが既に出ている(= resize が発火しない)場合の分
  setTimeout(align, 250);

  // キーボードが出そろうころに最終位置へ合わせ、後片付けする
  setTimeout(() => {
    viewport?.removeEventListener("resize", alignSoon);
    observer?.disconnect();
    cancelAnimationFrame(frame);
    align();
  }, 1000);
}
