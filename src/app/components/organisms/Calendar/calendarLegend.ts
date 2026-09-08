import { CalendarEventType } from "@app/types/calendar";

// イベント種別ごとのドットの色
export const EVENT_DOT_CLASS: Record<CalendarEventType, string> = {
  record: "bg-primary",
  match_added: "bg-warning",
  deck_created: "bg-success",
  deck_code_added: "bg-secondary",
  deck_archived: "bg-default-400",
};

// カレンダー下部の凡例の並び。実体(DashboardCalendar)と骨格
// (DashboardCalendarSkeleton)の両方がこの定義から描くため、項目を増減したり
// 文言を変えたりしても骨格の幅・折返し・行数が自動で追随する。
export const CALENDAR_LEGEND: { type: CalendarEventType; label: string }[] = [
  { type: "record", label: "記録作成" },
  { type: "match_added", label: "対戦結果の追加" },
  { type: "deck_created", label: "デッキ登録" },
  { type: "deck_code_added", label: "新しいデッキのバージョンを作成" },
  { type: "deck_archived", label: "デッキをアーカイブ" },
];
