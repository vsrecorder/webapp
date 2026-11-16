/*
 * 通知ベルのメニューを開いている間の「行の配置」を決める。
 *
 * 未読行は既読行より上下の余白と未読の点の幅だけ大きい。メニューを開いたまま
 * 「すべて既読にする」で配置まで既読の形に変えると、高さ上限付きのスクロール領域の中身が
 * 縮んで一覧全体が動く。iOS 実機ではスクロール領域の中身が操作なしに変わると
 * 再描画が追いつかず古い描画が残るため、動かすとちらついて見える。
 *
 * そこで、開いている間に既読になった行は未読の配置のまま残し、色(背景・点)だけを変える。
 * 配置が既読の形に変わるのは次に開いたとき。
 */

// メニューを開いた瞬間に未読だった通知の id の控え。閉じている間は null
export type NotificationOpenSnapshot = {
  unreadIds: ReadonlySet<string>;
};

export function takeNotificationOpenSnapshot(
  notifications: ReadonlyArray<{ id: string; is_read: boolean }>,
): NotificationOpenSnapshot {
  return { unreadIds: new Set(notifications.filter((n) => !n.is_read).map((n) => n.id)) };
}

// この行を未読の配置(上下の余白・点の幅あり)で出すか。
// 今未読の行に加え、開いている間に既読になった行も未読の配置のまま残す
export function usesUnreadLayout(
  notification: { id: string; is_read: boolean },
  snapshot: NotificationOpenSnapshot | null,
): boolean {
  return !notification.is_read || (snapshot?.unreadIds.has(notification.id) ?? false);
}
