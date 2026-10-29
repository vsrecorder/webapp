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
 * 開催日ページ(CityleagueDateEventTabs)の戻り位置。
 *
 * カードの詳細ページだけでなく、ヘッダーのナビ・パンくず・開催月へのリンク・ユーザーメニューなど、
 * どこから離れても戻ってきたら元の位置で見せる(ページが外れるときに控える)。控えるのは、離れる時点で
 * 画面の上端にあったカードと、選んでいたリーグのタブ。戻ったらそのタブでそのカードを同じ高さに置く。
 *
 * 控えは一覧(上の CITYLEAGUE_SCROLL_TO_*)と分ける。一覧の控えを書くと、次に一覧を開いたときに
 * そのカード(一覧の先頭の日には無いことが多い)を探して、シーズンの終わりまで続きを読み込み続けてしまう。
 */
export const CITYLEAGUE_DATE_RETURN_KEY = "cityleagueDateReturn";

export type CityleagueDateReturnState = {
  // 開催日 "YYYY-MM-DD"。別の開催日のページは受け取らない
  date: string;
  // 選んでいたリーグ区分の名前
  league: string;
  // 画面の上端にあったカードの official_event_id
  anchorEventId: number;
  // 控えた時刻。これより後に戻ってきたときだけ使う(utils/returnNavigation)
  savedAt: number;
};

/*
 * 開催日ページのカードの目印(id)。一覧の目印とは名前を分ける。
 * 戻ったときの画面上の高さ(saveReturnAnchorTop)は目印ごとに覚えるので、同じ名前だと
 * 一覧で開いたカードの高さを、開催日ページで同じ大会を開いたときの高さで上書きしてしまう
 */
export function cityleagueDateResultAnchorId(officialEventId: number): string {
  return `cityleague-date-result-${officialEventId}`;
}

/*
 * 開催日ページを離れるときに呼ぶ。今いるページには受け取らせない(writeReturnTarget)。
 * anchorTop は目印のカードの画面上の高さ。省くと今の高さを測る
 */
export function markCityleagueDateReturn(
  state: Omit<CityleagueDateReturnState, "savedAt">,
  anchorTop?: number,
) {
  saveReturnAnchorTop(cityleagueDateResultAnchorId(state.anchorEventId), anchorTop);
  writeReturnTarget(CITYLEAGUE_DATE_RETURN_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
}

export function clearCityleagueDateReturn() {
  writeSessionStorage(CITYLEAGUE_DATE_RETURN_KEY, null);
}

// 読めない控え(形が変わった古い版のものなど)は null
export function parseCityleagueDateReturn(raw: string | null): CityleagueDateReturnState | null {
  if (raw === null) return null;

  try {
    const state = JSON.parse(raw) as Partial<CityleagueDateReturnState>;
    if (
      typeof state.date !== "string" ||
      typeof state.league !== "string" ||
      typeof state.anchorEventId !== "number" ||
      typeof state.savedAt !== "number"
    ) {
      return null;
    }

    return state as CityleagueDateReturnState;
  } catch {
    return null;
  }
}
