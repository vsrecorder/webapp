import { formatJSTYearMonth } from "@app/utils/date";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日付をJST基準の "YYYY-MM-DD" キーに丸める。引数には実時刻(未加工)を渡すこと。
// getJstNow() などのJST基準に丸め済みのDateを渡すとオフセットが二重に乗るので、
// その場合は toJstDateKey() を使うこと。
export function toDateKey(d: Date | string | number): string {
  return toJstDateKey(new Date(new Date(d).getTime() + JST_OFFSET_MS));
}

// JST基準に丸め済みのDate(getJstNow() や Date.UTC() で組んだ日付)から
// "YYYY-MM-DD" キーを作る。実時刻を渡すとJSTとずれるので toDateKey() を使うこと
export function toJstDateKey(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 現在時刻をJST基準に丸めたDateを返す。年月日はUTC系メソッド(getUTCFullYear等)で読むこと
export function getJstNow(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
}

// 「YYYY年M月からバトレコを利用」形式の利用開始表示文字列を返す。年月はJST基準。
export function formatJoinDate(dateStr: string): string {
  return `${formatJSTYearMonth(dateStr)}からバトレコを利用`;
}

// 「YYYY年MM月DD日」形式の日付文字列を返す。暦日はJST基準。
export function formatDateJa(dateStr: string): string {
  const [year, month, day] = toDateKey(dateStr).split("-");
  return `${year}年${month}月${day}日`;
}

export type CalendarGridCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

// 1ヶ月分のカレンダーグリッドの週数
const CALENDAR_WEEKS = 6;

// 指定した年月のカレンダーグリッド(日曜始まり、前後の月の日付で埋める)を生成する。
// 月によって4〜6週と行数が変動すると高さが変わってチラつくため、常に6週固定で返す。
export function getCalendarGrid(year: number, month: number): CalendarGridCell[] {
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));

  const gridStart = new Date(firstDayOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  const cells: CalendarGridCell[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < CALENDAR_WEEKS * 7; i++) {
    const date = new Date(cursor);
    cells.push({
      date,
      dateKey: toJstDateKey(date),
      inCurrentMonth: date.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return cells;
}
