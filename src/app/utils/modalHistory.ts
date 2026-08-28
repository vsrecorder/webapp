/*
 * モーダル表示中のブラウザバックを「モーダルを閉じる操作」に変えるための、
 * 履歴エントリの目印と、他の履歴系処理から参照するための判定。
 *
 * 積む/巻き戻す本体は useCloseModalOnBack にある。ここに切り出しているのは、
 * 履歴を扱う既存処理(useReopenFlagsOnBack / RecordById / useScrollResetOnNavigation)が
 * 「モーダルの開閉に伴う履歴操作」を通常のページ遷移と取り違えないようにするため。
 */

// 遷移を投げてから、移れていなければハードナビゲーションに切り替えるまでの待ち時間。
const NAVIGATE_FALLBACK_MS = 3000;

// モーダル表示のために積んだ履歴エントリであることを示す history.state のキー。
// 値はそのエントリの時点で開いているモーダルの枚数(入れ子を数える)。
export const MODAL_HISTORY_DEPTH_KEY = "vsrModalDepth";

// history.state から積んだ枚数を読む。目印が無いエントリは 0 とみなす。
export function readModalHistoryDepth(state: unknown): number {
  if (typeof state !== "object" || state === null) return 0;

  const depth = (state as Record<string, unknown>)[MODAL_HISTORY_DEPTH_KEY];
  return typeof depth === "number" ? depth : 0;
}

/*
 * pushState の引数がモーダル表示用に積むものか。
 *
 * useReopenFlagsOnBack と RecordById は window.history.pushState を包んで
 * 「pushState が呼ばれた＝リンク遷移した」と判定し、モーダル再開フラグを捨てている。
 * モーダルを開くたびに pushState が走るようになるため、この判定で除外しないと
 * モーダルを開いただけで再開フラグが消えてしまう。
 */
export function isModalHistoryPushState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    MODAL_HISTORY_DEPTH_KEY in (state as Record<string, unknown>)
  );
}

/*
 * モーダル由来の popstate であることを示す印。
 *
 * 印はイベントオブジェクト自身に付ける。モジュール変数のフラグを
 * 「マイクロタスクで下ろす」方式にはできない: イベントリスナは1つ呼ばれるたびに
 * マイクロタスクチェックポイントを通るため、次のリスナが呼ばれる前にフラグが
 * 落ちてしまう(実測で先頭スクロールが走ってしまった)。同じイベントを受け取る
 * リスナ同士なら、イベントに付けた印は確実に共有できる。
 */
type MarkedPopStateEvent = Event & { __vsrModalHistoryPop?: boolean };

/*
 * この popstate をモーダル由来(＝ページ遷移ではない)として印を付ける。
 *
 * useScrollResetOnNavigation は popstate でページ先頭へスクロールする。モーダルを
 * 閉じるためのバックと、閉じたあとの巻き戻しでそれが走ると、背面が勝手に先頭へ飛ぶ。
 */
export function markModalHistoryPop(event: Event): void {
  (event as MarkedPopStateEvent).__vsrModalHistoryPop = true;
}

// 印が付いた popstate か。印を付ける側(useCloseModalOnBack)が先に呼ばれる必要があるため、
// Providers では CloseModalOnBack を ScrollResetOnNavigation より前に置いている。
export function isModalHistoryPop(event: Event): boolean {
  return (event as MarkedPopStateEvent).__vsrModalHistoryPop === true;
}

/*
 * モーダルを閉じた直後にページ遷移するときは、遷移をこの関数に渡す。
 *
 * モーダルを閉じると useCloseModalOnBack が、開くときに積んだ戻り先エントリを
 * history.go(-1) で取り除く。この巻き戻しを待たずに router.push すると遷移が
 * 打ち消され、元のページに残ってしまう。
 *
 *   実測(記録の削除モーダル → /records へ push):
 *     push:/devtest-... → go(-1) → popstate → replace  ← push した URL が履歴に現れない
 *
 * 巻き戻しは popstate で着地するので、それを受けてから遷移する。
 * useCloseModalOnBack は capture フェーズで着地を処理するため、こちらは
 * bubble フェーズで受け、さらに次のタスクへ回して後始末の後ろに並ぶようにする。
 *
 * 巻き戻しが起きるかどうかは、閉じる直前の履歴エントリに戻り先の目印(深さ)が
 * あるかで決まる。目印が無ければ待たずに遷移する。目印があるのに popstate が
 * 来ない場合に備え、タイムアウトでも遷移する(待ち続けて遷移しないよりはよい)。
 *
 * fallbackHref を渡すと、遷移を投げたあともそのページに留まっていた場合に
 * ハードナビゲーションで移る。削除したものを映したままページに残さないための保険。
 */
export function navigateAfterModalClose(
  navigate: () => void,
  options: { fallbackHref?: string; timeoutMs?: number } = {},
): void {
  const { fallbackHref, timeoutMs = 1000 } = options;

  const runNavigate = () => {
    // 遷移を投げる前の場所。これが変わらないままなら、遷移が始まらなかったとみなす
    const from = window.location.pathname;

    navigate();

    if (!fallbackHref) return;

    // 通常の遷移では起こりえない時間だけ待ってから、まだ移れていなければ強制的に移る。
    // 短くすると、単に遅い(RSCの取得待ち)だけの遷移を余計なリロードで潰してしまう。
    setTimeout(() => {
      // どこかへ移れているなら何もしない。遷移先とは限らず、この間に利用者が別のページへ
      // 移っていることもあるため、「遷移先に居るか」ではなく「元の場所を離れたか」で見る
      // (遷移先で判定すると、自分で移動した先から引き戻してしまう)
      if (window.location.pathname !== from) return;

      window.location.replace(new URL(fallbackHref, window.location.origin).toString());
    }, NAVIGATE_FALLBACK_MS);
  };

  // 戻り先が積まれていない = 巻き戻しは起きない。待つ理由がない
  if (readModalHistoryDepth(window.history.state) === 0) {
    runNavigate();
    return;
  }

  let navigated = false;

  const run = () => {
    if (navigated) return;
    navigated = true;

    window.removeEventListener("popstate", handlePopState);
    clearTimeout(timer);

    runNavigate();
  };

  const handlePopState = () => {
    setTimeout(run, 0);
  };

  window.addEventListener("popstate", handlePopState);

  const timer = setTimeout(run, timeoutMs);
}
