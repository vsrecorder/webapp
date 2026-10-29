/*
 * シティリーグ結果一覧(CityleagueResults)が、個別ページから戻ってきたときに
 * 対象カードまで自動スクロールするための sessionStorage キーと、遷移直前に立てるヘルパー。
 *
 * 一覧側は useSessionStorageItem でこれを描画中に読み、見つかったら/諦めたら消す。
 */

import { saveReturnAnchorTop, writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

// スクロール対象の official_event_id
export const CITYLEAGUE_SCROLL_TO_ID_KEY = "cityleagueResultScrollToId";
// そのカードが属するリーグ種別(別のリーグ種別のタブでは受け取らない)
export const CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY = "cityleagueResultScrollToLeagueType";

// 一覧のカードの目印(id)。戻ったときにこの位置まで移動する
export function cityleagueResultAnchorId(officialEventId: number): string {
  return `cityleague-result-${officialEventId}`;
}

// 個別ページへ遷移する直前に呼ぶ。戻ってきたときにそのカードまでスクロールする。
// 今表示している一覧には受け取らせない(writeReturnTarget)
export function markCityleagueResultScrollTarget(officialEventId: number, leagueType: number) {
  // 戻ったときに元の位置(このカードがあった画面上の高さ)へ戻すため
  saveReturnAnchorTop(cityleagueResultAnchorId(officialEventId));
  writeReturnTarget(CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY, String(leagueType));
  writeReturnTarget(CITYLEAGUE_SCROLL_TO_ID_KEY, String(officialEventId));
}

// 対象を消す(スクロールし終えた・全件読んでも見つからなかった)
export function clearCityleagueResultScrollTarget() {
  writeSessionStorage(CITYLEAGUE_SCROLL_TO_ID_KEY, null);
  writeSessionStorage(CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY, null);
}

/*
 * 開催日ページ(CityleagueDateEventTabs)の戻り位置。カードは一覧と同じものを並べるが、
 * 控えは一覧と分ける。一覧の控えを書くと、次に一覧を開いたときにそのカード(一覧の先頭の日には
 * 無いことが多い)を探して、シーズンの終わりまで続きを読み込み続けてしまう。
 */
// スクロール対象の official_event_id
export const CITYLEAGUE_DATE_SCROLL_TO_ID_KEY = "cityleagueDateScrollToId";
// そのカードが属するリーグ区分の名前(タブを合わせてから探す)
export const CITYLEAGUE_DATE_SCROLL_TO_LEAGUE_KEY = "cityleagueDateScrollToLeague";

/*
 * 開催日ページのカードの目印(id)。一覧の目印とは名前を分ける。
 * 戻ったときの画面上の高さ(saveReturnAnchorTop)は目印ごとに覚えるので、同じ名前だと
 * 一覧で開いたカードの高さを、開催日ページで同じ大会を開いたときの高さで上書きしてしまう
 */
export function cityleagueDateResultAnchorId(officialEventId: number): string {
  return `cityleague-date-result-${officialEventId}`;
}

// 開催日ページから個別ページへ遷移する直前に呼ぶ
export function markCityleagueDateScrollTarget(officialEventId: number, leagueTitle: string) {
  saveReturnAnchorTop(cityleagueDateResultAnchorId(officialEventId));
  writeReturnTarget(CITYLEAGUE_DATE_SCROLL_TO_LEAGUE_KEY, leagueTitle);
  writeReturnTarget(CITYLEAGUE_DATE_SCROLL_TO_ID_KEY, String(officialEventId));
}

export function clearCityleagueDateScrollTarget() {
  writeSessionStorage(CITYLEAGUE_DATE_SCROLL_TO_ID_KEY, null);
  writeSessionStorage(CITYLEAGUE_DATE_SCROLL_TO_LEAGUE_KEY, null);
}
