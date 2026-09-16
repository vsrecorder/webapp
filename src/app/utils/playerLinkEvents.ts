"use client";

// プレイヤーズクラブの連携直後に、同じページで連携状態を出している別のカードへ
// 「連携状態を取り直してほしい」と伝えるための軽量なグローバルイベント。
// Contextやpropsの配線を避けて疎結合に保つ考え方は notificationEvents と同じ。
//
// ユーザページ(users)には「プレイヤーズクラブとの連携」カードと「称号・ランク」カードが
// 並ぶが、それぞれが独立に /api/usersplayers をマウント時1回だけ取る。そのため連携しても
// 称号カード側は取り直さず、「連携すると入賞が称号になる」という案内が残ってしまう。
// 連携に成功した側からこれを呼ぶ。
const PLAYER_LINK_CHANGED_EVENT = "vsrecorder:player-link-changed";

export function triggerPlayerLinkChanged() {
  window.dispatchEvent(new Event(PLAYER_LINK_CHANGED_EVENT));
}

export function onPlayerLinkChanged(handler: () => void): () => void {
  window.addEventListener(PLAYER_LINK_CHANGED_EVENT, handler);

  return () => window.removeEventListener(PLAYER_LINK_CHANGED_EVENT, handler);
}
