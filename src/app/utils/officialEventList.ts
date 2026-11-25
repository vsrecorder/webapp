import {
  OFFICIAL_EVENT_LIST_FIELDS,
  OfficialEventListItemType,
  OfficialEventType,
} from "@app/types/official_event";

// 上流の1件から、一覧で返すフィールドだけを取り出す
export function toOfficialEventListItem(
  officialEvent: OfficialEventType,
): OfficialEventListItemType {
  const item = {} as Record<string, unknown>;

  for (const field of OFFICIAL_EVENT_LIST_FIELDS) {
    item[field] = officialEvent[field];
  }

  return item as OfficialEventListItemType;
}

/*
 * 公式イベント一覧を引く開催日のキー("YYYY-MM-DD")。
 *
 * サーバ描画の先読み(records/create/page.tsx)とブラウザ側の SWR キー
 * (RecordCreate)で同じ文字列にならないと、先読みしたぶんが使われないまま
 * 取り直しになる。両方からこれを使って食い違いを防ぐ。
 *
 * 引数は @internationalized/date の CalendarDate をそのまま渡せる形。
 */
export function toOfficialEventDateKey(date: {
  year: number;
  month: number;
  day: number;
}): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");

  return `${date.year}-${month}-${day}`;
}

/*
 * 公式イベントを引いてよい開催日のキーか("YYYY-MM-DD" で、実在する日付、かつ扱う年の範囲)。
 *
 * 開催日の入力欄は、年を1桁ずつ打ち直している途中でも値を渡してくる(2026 → 202 → 20 → 2)。
 * そのまま引くと "202-11-24" のようなキーで上流が 400 を返し(本番のログで実測)、選択欄には
 * 「エラーが発生しました」と出る。4 桁でも 0202 年のような年は、引いても候補が無いだけなので引かない。
 *
 * 扱う年の範囲(2000〜2100 年)は、公式イベントのデータがある期間を十分に含むように取ってある。
 */
const OFFICIAL_EVENT_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFICIAL_EVENT_MIN_YEAR = 2000;
const OFFICIAL_EVENT_MAX_YEAR = 2100;

export function isOfficialEventDateKey(dateKey: string): boolean {
  const match = OFFICIAL_EVENT_DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return false;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < OFFICIAL_EVENT_MIN_YEAR || year > OFFICIAL_EVENT_MAX_YEAR) return false;

  // 2月30日のような日付は Date が翌月へ繰り上げるので、組み立て直して元と同じかで確かめる
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// 一覧の取得URL。SWR のキーも兼ねる
export function officialEventListUrl(dateKey: string): string {
  return `/api/official_events?date=${dateKey}`;
}

/*
 * SWR に渡すキー。引いてよい開催日でなければ null(SWR は取りに行かない)。
 * 選択欄(OfficialEventSelect)と、自由形式の誘導(useOfficialEventGuide)が同じ URL を使うので、
 * 同じ開催日ならキャッシュを共有する。
 */
export function officialEventListKey(dateKey: string): string | null {
  return isOfficialEventDateKey(dateKey) ? officialEventListUrl(dateKey) : null;
}
