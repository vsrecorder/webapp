import { diffInDays, isZeroDate, toJSTDateString } from "@app/utils/date";
import { mondayOfJSTDateString } from "@app/utils/week";

/*
 * ホームの「おかえりカード」(施策D-4 ウィンバック・D4_WINBACK_PLAN.md §3)を出すかの判定。
 *
 * 対象は「直前の4週すべてで対戦していない人」。ストリークの last_recorded_week
 * (最後に対戦した週の月曜・event_date 基準)が、今週の月曜より5週以上前なら出す。
 *
 * 4週にしているのは、ストリークのフリーズ(最大3枠。空いた週1つにつき1枠を使う)と
 * 食い違わせないため。空きが3週までなら、フリーズの残っている人のストリークは「継続中」で、
 * その人には B-5(途切れ防止の通知)が声をかけている。空きが4週以上なら、フリーズが
 * 何枠あってもストリークは必ず途切れている。「途切れそうな人は B-5、途切れた人は D-4」。
 */

// この週数以上、対戦の無い週が続いていたら出す
export const WINBACK_MIN_EMPTY_WEEKS = 4;

/*
 * × で閉じた記録。値は "1"。寿命は7日(その間は出さない)。
 * localStorage ではなく cookie に持たせるのは、サーバ(Dashboard.tsx)で判定に混ぜ、
 * 閉じたカードが初回描画に一瞬だけ出るのを防ぐため(「記録中」カードと同じ理由)。
 */
export const WINBACK_DISMISSED_COOKIE = "winbackDismissed";
export const WINBACK_DISMISSED_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isWinbackDismissed(cookieValue: string | null | undefined): boolean {
  return cookieValue === "1";
}

/*
 * 最後に対戦した週から今週までのあいだに、対戦の無い週がいくつ挟まっているか。
 * 例: 最後が 10/19週、今週が 11/30週なら、空いたのは 10/26・11/02・11/09・11/16・11/23 の5週。
 *
 * lastRecordedWeek は DATE カラム由来で UTC の0時として返るので、暦日(JST)へ直してから
 * 月曜どうしを日数で比べる(時刻で引き算しない。utils/date の注意書き)。
 * 判定できない値(未設定・ゼロ値・不正な日付)は null。
 */
export function emptyWeeksSince(
  lastRecordedWeek: Date | string | null | undefined,
  today: string,
): number | null {
  if (lastRecordedWeek == null || isZeroDate(lastRecordedWeek)) return null;

  const last = new Date(lastRecordedWeek);
  if (Number.isNaN(last.getTime())) return null;

  const lastMonday = mondayOfJSTDateString(toJSTDateString(last));
  const thisMonday = mondayOfJSTDateString(today);
  const weeks = Math.floor(diffInDays(lastMonday, thisMonday) / 7);

  // 今週または未来の週に対戦がある(予定を先に作った)なら空きは無い
  return Math.max(weeks - 1, 0);
}

export type WinbackDecision = {
  // 空いた週の数(カードの「◯週間ぶり」に使う)
  emptyWeeks: number;
  // 最後に対戦した週の月曜 "YYYY-MM-DD"
  lastWeek: string;
};

/*
 * おかえりカードを出すか。出すなら文言に使う値を返し、出さないなら null。
 *
 * - 記録0件の人には出さない(「最初の記録」CTA が出る)
 * - 今日のイベントを記録中の人には出さない(「記録中」カードが出る)
 * - × で閉じてから7日間は出さない
 */
export function decideWinback(input: {
  lastRecordedWeek: Date | string | null | undefined;
  today: string;
  totalRecords: number | null;
  recordingNow: boolean;
  dismissed: boolean;
}): WinbackDecision | null {
  const { lastRecordedWeek, today, totalRecords, recordingNow, dismissed } = input;

  if (dismissed || recordingNow) return null;
  if (totalRecords === null || totalRecords <= 0) return null;

  const emptyWeeks = emptyWeeksSince(lastRecordedWeek, today);
  if (emptyWeeks === null || emptyWeeks < WINBACK_MIN_EMPTY_WEEKS) return null;

  return {
    emptyWeeks,
    lastWeek: mondayOfJSTDateString(toJSTDateString(new Date(lastRecordedWeek as Date | string))),
  };
}
