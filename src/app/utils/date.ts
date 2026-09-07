// このアプリの暦日・時刻はすべて JST で判定する。@internationalized/date の
// today() など、IANA タイムゾーン名を受け取る API へはこの定数を渡すこと
// (getLocalTimeZone() を使うと端末のタイムゾーンで「今日」が変わってしまう)。
export const JST_TIME_ZONE = "Asia/Tokyo";

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

/*
 * 日本の暦日で見せる日付の書式。
 *
 * Intl.DateTimeFormat は作るのが重く、toLocaleString は呼ぶたびに内部で作り直すので、
 * 一覧のカードのように件数ぶん呼ぶ場所ではここで作った書式を使い回す。
 *
 * timeZone を明示するのは、サーバ描画(本番のコンテナは JST だが環境に依らず)とブラウザ
 * (利用者の端末のタイムゾーン)で同じ文字列になるようにするため。食い違うと
 * ハイドレーションの不一致になる。バックエンドの開催日は JST の 0:00 を表すので、
 * JST で読むのが元の意味とも一致する。
 */
const JST_DATE_WITH_WEEKDAY = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const JST_YEAR_MONTH = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
});

// 「2026年8月18日(火)」。読めない値は空文字
export function formatJSTDateWithWeekday(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_DATE_WITH_WEEKDAY.format(date);
}

// 「2026年8月」(一覧の月見出し)。読めない値は空文字
export function formatJSTYearMonth(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_YEAR_MONTH.format(date);
}

// 「2026年8月18日」(曜日なし)。読めない値は空文字
const JST_DATE = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatJSTDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_DATE.format(date);
}

// 「2026/8/18」(通知の日付など、幅を取りたくない場所)。読めない値は空文字
const JST_DATE_NUMERIC = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function formatJSTDateNumeric(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_DATE_NUMERIC.format(date);
}

// 「2026年8月18日(火) 10:30:00」(デッキコードの登録日時)。読めない値は空文字
const JST_DATETIME_WITH_WEEKDAY = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatJSTDateTimeWithWeekday(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_DATETIME_WITH_WEEKDAY.format(date);
}

// 「10:30」。イベントの開始・終了時刻に使う。読めない値・未設定(ゼロ値)は空文字
const JST_TIME = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatJSTTime(value: Date | string | null | undefined): string {
  if (value == null || isZeroDate(value)) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : JST_TIME.format(date);
}
