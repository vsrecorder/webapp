export type NotificationCategory =
  | "badge"
  | "streak"
  | "designation"
  | "rank"
  | "official_event"
  | "announcement";

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
