/*
 * シティリーグ結果一覧(CityleagueResults)が、個別ページから戻ってきたときに
 * 対象カードまで自動スクロールするための sessionStorage キーと、遷移直前に立てるヘルパー。
 *
 * 一覧側は useSessionStorageItem でこれを描画中に読み、見つかったら/諦めたら消す。
 */

import { writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

// スクロール対象の official_event_id
export const CITYLEAGUE_SCROLL_TO_ID_KEY = "cityleagueResultScrollToId";
// そのカードが属するリーグ種別(別のリーグ種別のタブでは受け取らない)
export const CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY = "cityleagueResultScrollToLeagueType";

// 個別ページへ遷移する直前に呼ぶ。戻ってきたときにそのカードまでスクロールする。
// 今表示している一覧には受け取らせない(writeReturnTarget)
export function markCityleagueResultScrollTarget(officialEventId: number, leagueType: number) {
  writeReturnTarget(CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY, String(leagueType));
  writeReturnTarget(CITYLEAGUE_SCROLL_TO_ID_KEY, String(officialEventId));
}

// 対象を消す(スクロールし終えた・全件読んでも見つからなかった)
export function clearCityleagueResultScrollTarget() {
  writeSessionStorage(CITYLEAGUE_SCROLL_TO_ID_KEY, null);
  writeSessionStorage(CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY, null);
}
