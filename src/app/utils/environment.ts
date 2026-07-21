import { diffInDays, toJSTDateString, todayJSTDateString } from "@app/utils/date";

/**
 * 対戦環境の終了日までの残り日数に応じて、ステータスドットの色クラスを返す。
 * （14日超: 緑 / 14日以内: 黄=warning / 7日以内: 赤=critical）
 *
 * ヘッダー（ログイン済み）とトップページのヒーローで同じ配色を使うため、
 * 表示箇所ごとに実装せずここに集約している。
 */
export function getEnvDotColor(toDate: Date): string {
  // JSTの暦日どうしで差を取る。Date同士を引くと時刻成分が混ざり、
  // 色の切り替わりが深夜ではなくレンダリング時刻に依存してしまう。
  const daysLeft = diffInDays(todayJSTDateString(), toJSTDateString(toDate));

  if (daysLeft <= 7) return "bg-red-400";
  if (daysLeft <= 14) return "bg-yellow-400";
  return "bg-green-400";
}
