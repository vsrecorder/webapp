/*
 * 記録詳細ページ(RecordById)がモーダル再開フラグを往復させるための sessionStorage キーと、
 * 再開を取りやめるためのヘルパー。デッキ側の deckModalReopen.ts と対になる。
 *
 * 記録詳細ページには一覧の記録モーダル(DisplayRecordModal)から遷移してくる。
 * バック遷移で戻ったときだけモーダルを開き直すため、詳細ページのマウント中は
 * 再開フラグを「詳細ページ専用キー」へ退避しておく(詳しくは RecordById のコメント)。
 */

import {
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_ARCHIVED,
  REOPEN_DECK_MODAL_WITH_RECORDS,
} from "@app/utils/deckModalReopen";

// 再開対象の記録 id。これが立っていると一覧のカードが記録モーダルを開き直す。
export const REOPEN_MODAL_RECORD_ID = "reopenModalRecordId";
// その記録のイベント種別。どのカードがモーダルを開くかの判定に使う。
export const REOPEN_MODAL_EVENT_TYPE = "reopenModalEventType";

// 詳細ページのマウント中に退避しておく先のキー
export const PENDING_REOPEN_RECORD_ID = "detailPagePendingReopenRecordId";
export const PENDING_REOPEN_EVENT_TYPE = "detailPagePendingReopenEventType";
export const PENDING_REOPEN_DECK_ID = "detailPagePendingReopenDeckId";
export const PENDING_REOPEN_ARCHIVED = "detailPagePendingReopenArchived";
export const PENDING_REOPEN_WITH_RECORDS = "detailPagePendingReopenWithRecords";

// 元のキーと退避先キーの対応。クリアはこの一式をまとめて消す。
const RECORD_DETAIL_REOPEN_KEYS = [
  REOPEN_MODAL_RECORD_ID,
  REOPEN_MODAL_EVENT_TYPE,
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_ARCHIVED,
  REOPEN_DECK_MODAL_WITH_RECORDS,
  PENDING_REOPEN_RECORD_ID,
  PENDING_REOPEN_EVENT_TYPE,
  PENDING_REOPEN_DECK_ID,
  PENDING_REOPEN_ARCHIVED,
  PENDING_REOPEN_WITH_RECORDS,
] as const;

/*
 * 記録詳細ページから戻ったときのモーダル再開を取りやめる。
 *
 * 記録を削除したときのように、戻り先で開き直しても意味がない(削除済みの記録の
 * モーダルを開こうとする)場合に、遷移の前に呼ぶ。とくに router.replace で移る場合は
 * pushState が呼ばれず「リンク遷移だからフラグを捨てる」判定が働かないため、
 * ここで明示的に消しておかないとフラグが戻り先まで生き残る。
 */
export function clearRecordDetailReopenFlags(): void {
  for (const key of RECORD_DETAIL_REOPEN_KEYS) {
    sessionStorage.removeItem(key);
  }
}
