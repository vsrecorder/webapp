"use client";

import { useEffect, useState } from "react";

import { GoogleAnalytics } from "@next/third-parties/google";

type Props = {
  gaId: string;
  debugMode: boolean;
};

/*
 * GA4 の計測タグを、ページの load が済んでから差し込む。
 *
 * <GoogleAnalytics> は next/script の afterInteractive 相当で、ハイドレーションと同じ時期に
 * 外部の gtag/js を取りに行き、メインスレッドを取り合う。計測は表示を待ってからで十分なので、
 * load 後(アイドル時)にマウントして初期表示を優先する。
 *
 * 部品自体は @next/third-parties のものをそのまま使う。sendGAEvent(記録作成の計測)は
 * この部品がマウントされたときに dataLayer の名前を控える仕組みなので、置き換えると
 * イベントが届かなくなる。
 */
export default function LazyGoogleAnalytics({ gaId, debugMode }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      // load 直後はまだ画像の復号やレイアウトが残っていることがあるので、ひと呼吸置く
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => !cancelled && setReady(true), { timeout: 2000 });
      } else {
        setTimeout(() => !cancelled && setReady(true), 0);
      }
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  return ready ? <GoogleAnalytics gaId={gaId} debugMode={debugMode} /> : null;
}
