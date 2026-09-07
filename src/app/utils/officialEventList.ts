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

// 一覧の取得URL。SWR のキーも兼ねる
export function officialEventListUrl(dateKey: string): string {
  return `/api/official_events?date=${dateKey}`;
}
