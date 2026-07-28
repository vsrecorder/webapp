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

// デッキモーダルから別ページへ遷移する直前に呼ぶ。
// 戻ってきたときに、このデッキのデッキモーダルが再度開くようになる。
export function markDeckModalReopen(deckId: string, isArchived: boolean) {
  sessionStorage.setItem(REOPEN_DECK_MODAL_DECK_ID, deckId);
  sessionStorage.setItem(REOPEN_DECK_MODAL_ARCHIVED, isArchived ? "1" : "0");
}
