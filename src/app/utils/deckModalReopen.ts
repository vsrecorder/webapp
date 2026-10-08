/*
 * デッキモーダル(ShowDeckModal)を戻り遷移で再開するための sessionStorage キーと、
 * 遷移直前にフラグを立てるヘルパー。
 *
 * 消費側は以下の通り:
 *   - Decks(テンプレート) … reopenDeckModalArchived を見てタブ(利用中/アーカイブ済み)を選ぶ
 *   - DeckCard           … reopenDeckModalDeckId を見てデッキモーダルを開く
 *   - ShowDeckModal      … reopenRecordsModalForDeckId を見て記録一覧モーダルも開く
 *                          (このフラグは DeckCard が reopenDeckModalWithRecords を見て立てる)
 */

import { writeReturnTarget } from "@app/utils/returnTarget";

// 再開対象のデッキ id。これが立っているとデッキモーダルが再開する。
export const REOPEN_DECK_MODAL_DECK_ID = "reopenDeckModalDeckId";
// 対象デッキがアーカイブ済みか("1"/"0")。戻り時のデッキページのタブ切り替えに使う。
export const REOPEN_DECK_MODAL_ARCHIVED = "reopenDeckModalArchived";
// デッキモーダルに加えて記録一覧モーダルまで再開するか("1")。
// 記録一覧モーダル発の遷移(DisplayRecordModal)でのみ立て、デッキモーダル発の
// 「詳細」「記録する」遷移では立てない(モーダルを二重に開かないため)。
export const REOPEN_DECK_MODAL_WITH_RECORDS = "reopenDeckModalWithRecords";

// 遷移先ページで往復させる必要があるキーの一式(useReopenFlagsOnBack に渡す)
export const DECK_MODAL_REOPEN_KEYS = [
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_ARCHIVED,
  REOPEN_DECK_MODAL_WITH_RECORDS,
] as const;

// デッキ一覧の各カードに付ける id。戻り遷移での再開時、対象デッキの位置まで
// スクロールするための目印にする。
export function deckAnchorId(deckId: string): string {
  return `deck-card-${deckId}`;
}

// 再開時のスクロール位置。画面上部に固定されたヘッダー＋タブの分だけ手前で止め、
// 対象デッキのカードがそれらに隠れないようにする。
const REOPEN_SCROLL_OFFSET = 100;

/*
 * 戻り遷移でデッキモーダルを再開するとき、対象デッキのカードの位置まで移動する。
 *
 * モーダルが開くと背面がその時点の位置で固定され、閉じたときの戻り先になるので、
 * 開く前に呼ぶこと。なめらかに動かすと固定される頃に移動が終わっていないので瞬間移動にする。
 * 利用中/アーカイブ済みのタブは両方マウントされうるので、見えている方のカードを使う。
 */
export function scrollToDeckCard(deckId: string): void {
  const el = Array.from(
    document.querySelectorAll<HTMLElement>(`[id="${deckAnchorId(deckId)}"]`),
  ).find((candidate) => candidate.getBoundingClientRect().width > 0);
  if (!el) return;

  const y = el.getBoundingClientRect().top + window.scrollY - REOPEN_SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
}

// デッキモーダルから別ページへ遷移する直前に呼ぶ。
// 戻ってきたときに、このデッキのデッキモーダルが再度開くようになる。
// 今表示している一覧には受け取らせない(writeReturnTarget)
export function markDeckModalReopen(deckId: string, isArchived: boolean) {
  writeReturnTarget(REOPEN_DECK_MODAL_ARCHIVED, isArchived ? "1" : "0");
  writeReturnTarget(REOPEN_DECK_MODAL_DECK_ID, deckId);
}
