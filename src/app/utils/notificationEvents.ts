// 記録/対戦/デッキ登録などの操作直後に、NotificationBellへ「今すぐ通知を再取得してほしい」
// と伝えるための軽量なグローバルイベント。Contextやprops経由の配線を避け、
// 操作元のコンポーネントとNotificationBellを疎結合に保つ。
const NOTIFICATIONS_REFRESH_EVENT = "vsrecorder:notifications-refresh";

export function triggerNotificationsRefresh() {
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}

export function onNotificationsRefreshRequested(handler: () => void): () => void {
  window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
}
