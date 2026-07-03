// Android Chrome の PWA インストール条件（fetch イベントを持つ Service Worker の登録）を
// 満たすためだけの最小実装。これが無いと「ホーム画面に追加」が単なるショートカット扱いになり、
// standalone起動時のスプラッシュスクリーン（ロゴ）が生成されない。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // キャッシュ戦略は持たず、常にネットワークへそのまま委譲する
});
