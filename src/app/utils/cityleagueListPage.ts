/*
 * シティリーグ結果一覧の「どの日を取りに行くか」の計算。
 *
 * 一覧はスケジュール(開催期間)の終わりから1日ずつ遡り、結果が登録されている最初の日を
 * 1ページとして出す。この日付の進め方をサーバ描画(cityleagueListServer)とブラウザ側の
 * 続き読み込み(organisms/Cityleague/CityleagueResults)の両方から使うため、
 * 暦日の文字列("YYYY-MM-DD")だけを扱う純粋な関数としてここに置く。
 *
 * Date で持つと、端末のタイムゾーンやJSTへのオフセットの二重掛けで1日ずれる。
 * 暦日そのものを文字列で扱えばその余地が無い。
 */

// 1回の読み込みで何日ぶん遡って結果を探すか。シティリーグは週末に集中して開催されるため、
// 平日を挟んでも2週間あれば次の開催日に届く。
export const CITYLEAGUE_SEARCH_DAYS = 14;

// "YYYY-MM-DD" を days 日ずらす(負で過去へ)。UTC で組み立てるので端末のタイムゾーンに依らない
export function shiftDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().split("T")[0];
}

/*
 * これから探す日の並び。fromDate から1日ずつ過去へ、最大 CITYLEAGUE_SEARCH_DAYS 日ぶん。
 *
 * スケジュールの開始日(scheduleFromDate)より前は、そのシーズンの結果が存在しないので
 * 打ち切る。返りが空なら「もう遡る先が無い」= これ以上読み込むものが無い。
 */
export function buildSearchDates(
  fromDate: string,
  scheduleFromDate: string | null,
): string[] {
  const dates: string[] = [];

  for (let i = 0; i < CITYLEAGUE_SEARCH_DAYS; i++) {
    const date = shiftDateString(fromDate, -i);

    if (scheduleFromDate && date < scheduleFromDate) break;

    dates.push(date);
  }

  return dates;
}
