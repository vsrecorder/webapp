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

// バックエンド(Go)は未設定の日時をゼロ値(0001-01-01T00:00:00Z)で返す。
// 画面側でその値を入れ直したいとき(お気に入り解除など)に使う。
export const ZERO_DATE = "0001-01-01T00:00:00Z";

// 未設定(ゼロ値)か。null / undefined / 空文字も未設定として扱う。
// Date の年(getFullYear() === 1)で見ると、UTC より西のタイムゾーンでは年が 0 になって
// 判定を誤るため、ISO 文字列の先頭で見る。
export function isZeroDate(value: Date | string | null | undefined): boolean {
  if (!value) return true;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return true;
    return value.toISOString().startsWith("0001-01-01");
  }

  return String(value).startsWith("0001-01-01");
}

// 未設定(ゼロ値)なら null、そうでなければその値をそのまま返す。
// 「開催日が無ければ作成日」のような優先順位を ?? でつなぐために使う。
export function nonZeroDate<T extends Date | string>(value: T | null | undefined): T | null {
  return isZeroDate(value) ? null : (value as T);
}
