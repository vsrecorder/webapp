// ストリークパネル(StreakPanel)の案内文を組み立てるユーティリティ。

import { addDays, currentWeekValue, weekValueOfJSTDate } from "@app/utils/week";

/*
 * 使用済みフリーズ枠が1つ復活するまでの案内文を返す。
 *
 * 残り週数(freeze_regen_remaining_weeks)は最終記録週までの進捗から求まるので、
 * 「あと1週」がいつの週を指すかは最終記録週によって変わる。
 *   ・最終記録が先週 … 今週はまだ記録していない。今週記録すれば連続が1週伸びて復活する
 *   ・最終記録が今週 … 今週ぶんはもう進捗に入っている。次に伸びるのは来週
 * そのどちらでもない(2週以上あいている)場合は、次に記録しても空白週ぶんのフリーズを
 * 消費して進捗が0に戻る(復活しない)ため、週を言い切らず今までどおり残り週数で案内する。
 *
 * lastRecordedWeek はバックエンドが返す最終記録週(週の月曜を JST 0:00 のUTC値で持つ)。
 */
export function freezeRegenText(
  remainingWeeks: number,
  lastRecordedWeek?: string,
): string {
  if (remainingWeeks === 1) {
    const lastWeek = weekValueOfJSTDate(lastRecordedWeek ?? "");
    const thisWeek = currentWeekValue();

    if (lastWeek === addDays(thisWeek, -7)) {
      return "今週記録するとフリーズが1つ復活";
    }

    if (lastWeek === thisWeek) {
      return "来週記録するとフリーズが1つ復活";
    }
  }

  return `あと${remainingWeeks}週連続記録でフリーズが1つ復活`;
}
