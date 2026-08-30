// PWA(ホーム画面に追加・standalone起動)のための最小実装。
//
// 以前は「fetchイベントを持つService Worker」がAndroid ChromeのPWAインストール条件
// だったため、中身の無いfetchハンドラを置いていた。この条件はChrome 108(モバイル)/
// 112(デスクトップ)で撤廃されており、現在インストール可否とスプラッシュスクリーンは
// manifest(name/icons/start_url/display)だけで決まる。
// https://developer.chrome.com/blog/update-install-criteria
//
// 何もしないfetchハンドラは残しておくとナビゲーションのたびにSWの起動を挟むだけの
// オーバーヘッドになり、Chromeからも「no-opとして認識された。可能なら削除せよ」と
// 警告されるため置かない。キャッシュ戦略やプッシュ通知を入れるときにここへ足す。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Web Push(B-1: B1_B2_PUSH_NOTIFICATION_PLAN.md §5.4a) ----
//
// push のペイロードは core-apiserver(infrastructure/push_sender.go の pushMessage)が作る
// {title, body, url, deliveryId, tag} の JSON。キー名はあちらと一致させること。
//
// push ハンドラでは必ず showNotification() を呼ぶ。呼ばないとブラウザが
// 「サイレントプッシュ」とみなし、繰り返すと購読を失効させる。
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "バトレコ";
  const deliveryId = data.deliveryId || "";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        data: { url: data.url || "/", deliveryId },
        // 同じキャンペーンの通知が溜まらないよう、種類ごとに置き換える
        tag: data.tag || "vsrecorder",
        renotify: true,
      });

      // 到達計測。アプリが閉じていても同一オリジンの Cookie(セッション)は載る。
      // セッション切れの端末では落ちるが、到達は取りこぼしを許容し「下限値」として読む
      // (タップは開いた画面側で確実に取る)。
      if (deliveryId) {
        await fetch("/api/users/push/delivered", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryId }),
          credentials: "include",
        }).catch(() => {});
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { url = "/", deliveryId = "" } = event.notification.data || {};
  let target = new URL(url, self.location.origin);
  // link_url はサーバが作るサイト内パスだが、万一絶対URLが混ざっても外部サイトは開かない
  if (target.origin !== self.location.origin) {
    target = new URL("/", self.location.origin);
  }
  // タップ計測は「開いた画面側」(PushClickTracker)が ?pd= を読んで行う
  if (deliveryId) {
    target.searchParams.set("pd", deliveryId);
  }

  event.waitUntil(
    (async () => {
      // 前面に見えているウィンドウがあればそこへ遷移する(タブを増やさない)。
      // 裏で開いたままのタブ(記録フォームを入力中かもしれない)は遷移させず、新しく開く。
      // navigate() はこの SW の制御下に無いクライアントや一部のブラウザで例外を投げる。
      // ここで落ちると通知をタップしても何も開かなくなるため、失敗したら openWindow へ必ず倒す。
      try {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const visible = windows.find(
          (client) =>
            new URL(client.url).origin === self.location.origin &&
            "navigate" in client &&
            (client.focused || client.visibilityState === "visible"),
        );
        if (visible) {
          await visible.navigate(target.href);
          return visible.focus();
        }
      } catch {
        // 下の openWindow に任せる
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
