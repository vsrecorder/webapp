/*
 * モーダル表示中のブラウザバックを「モーダルを閉じる操作」に変えるための、
 * 履歴エントリの目印と、他の履歴系処理から参照するための判定。
 *
 * 積む/巻き戻す本体は useCloseModalOnBack にある。ここに切り出しているのは、
 * 履歴を扱う既存処理(useReopenFlagsOnBack / RecordById / useScrollResetOnNavigation)が
 * 「モーダルの開閉に伴う履歴操作」を通常のページ遷移と取り違えないようにするため。
 */

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
