// バックエンドは JST 0:00 を UTC 変換して返すため、+9h して JST 日付として扱う。
//
// 返る Date は「JSTの壁時計をUTCとして持つ」ズラした値であり、実時刻ではない。
// そのため必ず toISOString() や getUTC*() などのUTCゲッターで読むこと。
// この値を実時刻（生の Date や Date.now()）と getTime() で引き算すると、
// 9時間ぶんズレた差分になる。日数を出したいときは toJSTDateString() 同士を
// diffInDays() に渡すこと。
export function toJSTDate(date: Date | string): Date {
  return new Date(new Date(date).getTime() + 9 * 60 * 60 * 1000);
}

// JSTでの暦日を "YYYY-MM-DD" で返す
export function toJSTDateString(date: Date | string): string {
  return toJSTDate(date).toISOString().split("T")[0];
}

// JSTでの今日の暦日を "YYYY-MM-DD" で返す
export function todayJSTDateString(): string {
  return toJSTDateString(new Date());
}

// "YYYY-MM-DD" 同士の日数差（to - from）。
// 時刻成分を持たない暦日どうしの差なので、実行時刻に依存しない。
export function diffInDays(fromDateString: string, toDateString: string): number {
  return (Date.parse(toDateString) - Date.parse(fromDateString)) / (1000 * 60 * 60 * 24);
}
