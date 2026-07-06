const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日付をJST基準の "YYYY-MM-DD" キーに丸める。引数には実時刻(未加工)を渡すこと
export function toDateKey(d: Date | string | number): string {
  const jst = new Date(new Date(d).getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 現在時刻をJST基準に丸めたDateを返す。年月日はUTC系メソッド(getUTCFullYear等)で読むこと
export function getJstNow(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
}

// 「YYYY年M月からバトレコを利用」形式の利用開始表示文字列を返す。
export function formatJoinDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月からバトレコを利用`;
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
      dateKey: toDateKey(date),
      inCurrentMonth: date.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return cells;
}
