export type NotificationCategory =
  | "badge"
  | "streak"
  | "designation"
  | "rank"
  | "official_event"
  | "announcement"
  | "weekly_report"
  // 月の切り替わり・環境の切り替わりに届く、終わった期間のバトルレポート
  | "monthly_report"
  | "environment_report"
  | "reminder"
  | "env_news"
  // みんなの公開デッキの投稿へのいいね(日次のまとめ)
  | "like";

export type NotificationType = {
  id: string;
  created_at: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
};

export type NotificationsGetResponseType = {
  notifications: NotificationType[];
};

export type UnreadCountResponseType = {
  unread_count: number;
};
