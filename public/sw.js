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
