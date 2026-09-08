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
// 購読端末の種別。core-apiserver の entity.PushPlatform* と一致させる
// (アプリ側の utils/platform.ts の detectPushPlatform と同じ分類)。
// iOS はホーム画面に追加した PWA でしか Push が動かないので、iOS と分かれば ios-pwa でよい。
// iPadOS が返す Mac の UserAgent は、SW から maxTouchPoints を見られないため区別できず
// desktop になる。分類は計測用なので、この取りこぼしは許容する。
function detectPushPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios-pwa";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

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
        // badge はステータスバーに出る小さな印。Android は**アルファチャンネルだけ**を
        // 見てシルエットを作るため、icon-*.png のような不透明な画像を渡すと
        // 塗りつぶされた四角になる。透過地に白のロゴマークだけを置いた専用画像を使う。
        badge: "/notification-badge.png",
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

// ---- 購読の張り直し ----
//
// ブラウザ側の都合(鍵のローテーション、プッシュサービス側での失効)で購読が差し替わると
// このイベントが飛ぶ。拾わないと endpoint が変わったことをサーバが知れず、
// 通知だけが静かに止まる。
//
// Chrome はこのイベントを仕様どおりに発火しないことがあるため、これ単独には頼らない。
// アプリを開いたときの復旧は hooks/usePushSubscription が別に持っていて、こちらは
// 「アプリを開かなくても直せる」ぶんの上乗せ。
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      // 新しい購読が渡ってくればそれを使う。無ければ古い購読と同じ鍵で作り直す。
      // SW からは NEXT_PUBLIC_VAPID_PUBLIC_KEY を読めないので、鍵は oldSubscription から引き継ぐ
      // (引き継げなければ諦める。アプリを開いたときにクライアント側が作り直す)。
      const key = event.oldSubscription?.options?.applicationServerKey;
      let subscription = event.newSubscription ?? null;

      if (!subscription && key) {
        subscription = await self.registration.pushManager
          .subscribe({ userVisibleOnly: true, applicationServerKey: key })
          .catch(() => null);
      }

      if (!subscription) return;

      const json = subscription.toJSON();
      await fetch("/api/users/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          platform: detectPushPlatform(),
        }),
        credentials: "include",
      }).catch(() => {});
    })(),
  );
});
