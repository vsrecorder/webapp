import { CityleagueResultType } from "@app/types/cityleague_result";
import { buildSearchDates, shiftDateString } from "@app/utils/cityleagueListPage";
import { diffInDays, toJSTDateString } from "@app/utils/date";

/*
 * シティリーグ結果一覧の「上端(新しい側)の取り直し」の計算。
 *
 * 一覧はサーバで取った1ページ目から描くが、それを後から取り直す仕組みが無かった。
 * 個別ページから「戻る」とルーターのキャッシュにある当時の描画がそのまま使われ、
 * アプリを開いたまま時間を置いて戻ってきても同じ画面が出続ける。
 * 結果は1日の中でも順に登録されていくので、再読み込みするまで最新が出なかった
 * (2026-10-08 に報告)。そこで、一覧の先頭の日から今日までをまとめて取り直し、
 * 読み込み済みの過去のぶんは残したまま上に差し込む。
 */

/*
 * 差し込みで追いつく最大の日数。先頭の日からこれ以上離れていたら、差し込まずに
 * 1ページ目(結果のある直近の1日)から出し直す。
 *
 * シティリーグは週末に1日30件以上あるので、間を全部差し込むと一度に描くカードが
 * 百件を超えうる。1週間ぶんまでなら週末2日と平日ぶんで収まる。
 */
export const CITYLEAGUE_REFRESH_MERGE_DAYS = 7;

/*
 * 前回そろえてからこれだけ経っていなければ取り直さない。アプリを行き来するたびや
 * タブを切り替えるたびに取りに行かないための間引き。
 */
export const CITYLEAGUE_REFRESH_MIN_INTERVAL_MS = 60 * 1000;

/*
 * 取り直す頃合いか。lastSyncedAt は最後に上端をそろえた時刻(ミリ秒)。
 * まだ一度もそろえていない(サーバで取った1ページ目のまま)なら null を渡す。
 */
export function isHeadRefreshDue(lastSyncedAt: number | null, now: number = Date.now()): boolean {
  return lastSyncedAt === null || now - lastSyncedAt >= CITYLEAGUE_REFRESH_MIN_INTERVAL_MS;
}

export type CityleagueHeadRefreshPlan = {
  /*
   * merge: 取った結果を、fromDate より前の読み込み済みのぶんの上に差し込む。
   * reset: 取った結果のうち最も新しい日だけを1ページ目として出し直す。
   */
  mode: "merge" | "reset";
  // 取り直す範囲("YYYY-MM-DD"、両端を含む)
  fromDate: string;
  toDate: string;
};

/*
 * どの範囲を取り直すか。
 *
 * topDate は一覧の先頭(最も新しい)カードの開催日。一覧が空なら null。
 * toDate は遡り始める暦日(resolveSearchStartDate の値)、scheduleFromDate はスケジュールの開始日。
 * 取り直す範囲が無ければ null。
 */
export function planHeadRefresh(
  topDate: string | null,
  toDate: string,
  scheduleFromDate: string | null,
): CityleagueHeadRefreshPlan | null {
  if (topDate !== null) {
    // 先頭が起点より新しいことは無いはず(シーズンの切り替わりなど)。触らない
    if (topDate > toDate) return null;

    if (diffInDays(topDate, toDate) < CITYLEAGUE_REFRESH_MERGE_DAYS) {
      return { mode: "merge", fromDate: topDate, toDate };
    }
  }

  // 一覧が空、または離れすぎている。初回の読み込みと同じ範囲を探す
  const dates = buildSearchDates(toDate, scheduleFromDate);
  if (dates.length === 0) return null;

  return { mode: "reset", fromDate: dates[dates.length - 1], toDate };
}

/*
 * 取り直した結果(fetched、fromDate〜の範囲)を、読み込み済みの一覧(current)の上に差し込む。
 *
 * fromDate 以降の日は丸ごと取り直したぶんに置き換え、それより前(続きとして読み込んだ日)は残す。
 * 並びが変わらないときは null を返す(描き直さない)。
 */
export function mergeHeadResults(
  current: CityleagueResultType[],
  fetched: CityleagueResultType[],
  fromDate: string,
): CityleagueResultType[] | null {
  const older = current.filter((item) => toJSTDateString(item.date) < fromDate);
  const merged = [...fetched, ...older];

  const unchanged =
    merged.length === current.length &&
    merged.every((item, i) => item.official_event_id === current[i].official_event_id);

  return unchanged ? null : merged;
}

/*
 * 取り直した結果のうち、最も新しい日のぶんと、続きを読み込むときの起点。
 * 結果が無ければ null。
 */
export function pickLatestDay(
  fetched: CityleagueResultType[],
): { date: string; results: CityleagueResultType[]; nextFromDate: string } | null {
  if (fetched.length === 0) return null;

  const date = fetched
    .map((item) => toJSTDateString(item.date))
    .reduce((latest, d) => (d > latest ? d : latest));

  return {
    date,
    results: fetched.filter((item) => toJSTDateString(item.date) === date),
    nextFromDate: shiftDateString(date, -1),
  };
}
