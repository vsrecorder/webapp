"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

/*
 * push 通知のタップ計測(B-1)。
 *
 * Service Worker の notificationclick はリンク先に ?pd={deliveryId} を付けて開く。
 * ここでそれを読んで /api/users/push/clicked へ送り、URL からは消す
 * (共有やリロードで二重に数えないため。サーバ側も最初の時刻を保つので二重送信は無害)。
 *
 * SW からの fetch ではなく画面側で送るのは、セッション切れの端末で落ちる SW 側より
 * 取りこぼしが少ないため(到達は下限値・タップは確実に、という役割分担)。
 */
function Tracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const deliveryId = searchParams.get("pd");
    if (!deliveryId) return;

    fetch("/api/users/push/clicked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId }),
      keepalive: true,
    }).catch(() => {});

    // router.replace だと hash が落ち、先頭へスクロールし、RSC の再取得まで走る。
    // URL から pd を消したいだけなので履歴の置き換えで済ませる(App Router は
    // history.replaceState を useSearchParams と同期してくれる)。
    const url = new URL(window.location.href);
    url.searchParams.delete("pd");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [searchParams]);

  return null;
}

// useSearchParams は静的レンダリング時に Suspense 境界を要求するため包む
export default function PushClickTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
