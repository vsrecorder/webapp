import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { toJSTDateString } from "@app/utils/date";

/*
 * シティリーグのシーズン(開催期間)一覧から、ホームの「本日のシティリーグ結果」パネルが
 * 必要とする2つ ——「今まさに開催期間中のシーズン」と「次に始まるシーズン」—— を選ぶ。
 *
 * 上流には期間中のシーズンを1件返す `cityleague_schedules?date=` もあるが、
 * それだけだと期間外に何も分からず「次はいつか」を出せない。全件を1本引いて
 * ここで両方を決める(全件は日付をキーに含まないので Data Cache も効きやすい)。
 *
 * 日付の比較は "YYYY-MM-DD" の文字列どうしで行う。ゼロ埋めされた同じ書式なので
 * 辞書順の大小がそのまま暦日の前後になり、Date を組み直さずに済む。
 * 上流は JST 0:00 を UTC 変換して返すため、暦日は必ず toJSTDateString() で読むこと。
 */

export type CityleagueScheduleState = {
  // 今日を含むシーズン。開催期間外なら null
  ongoing: CityleagueScheduleType | null;
  // 今日より後に始まるシーズンのうち最も早いもの。未発表なら null
  next: CityleagueScheduleType | null;
};

// 読めない日付(上流の欠損・ゼロ値)は toJSTDateString() が例外を投げるので、
// ここで弾いて null にする。1件壊れているだけでパネルごと落とさない。
function jstDateString(value: Date | string): string | null {
  if (Number.isNaN(new Date(value).getTime())) return null;
  return toJSTDateString(value);
}

export function pickCityleagueScheduleState(
  schedules: readonly CityleagueScheduleType[] | null | undefined,
  today: string,
): CityleagueScheduleState {
  let ongoing: CityleagueScheduleType | null = null;
  let ongoingFrom = "";
  let next: CityleagueScheduleType | null = null;
  let nextFrom = "";

  for (const schedule of schedules ?? []) {
    const from = jstDateString(schedule.from_date);
    const to = jstDateString(schedule.to_date);
    if (from === null || to === null || from > to) continue;

    if (from <= today && today <= to) {
      // 期間が重なることは無い想定だが、重なったら後から始まった方(直近)を採る
      if (ongoing === null || from > ongoingFrom) {
        ongoing = schedule;
        ongoingFrom = from;
      }
      continue;
    }

    if (from > today && (next === null || from < nextFrom)) {
      next = schedule;
      nextFrom = from;
    }
  }

  return { ongoing, next };
}
