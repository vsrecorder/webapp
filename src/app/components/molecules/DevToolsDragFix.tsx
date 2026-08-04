"use client";

import { useEffect } from "react";

/**
 * Next.js 16.3.0 の dev ツールインジケーターを、スマホでもドラッグできるようにする。
 *
 * 【問題】
 * インジケーターのドラッグは Pointer Events で実装されているが、ドラッグハンドルに
 * touch-action の指定が無い(devtools のバンドル全体で touch-action の出現数は0)。
 * このためタッチ環境では、指が動いた瞬間にブラウザがジェスチャをページのパンと判定して
 * pointercancel を発火し、以降 pointermove が届かなくなる。
 * 実装側は window に pointermove / pointerup しか登録しておらず pointercancel を
 * 扱っていないため、ドラッグはそのまま死ぬ。マウスでは pointercancel が飛ばないので動く。
 *
 * 実測(Chromium・タッチ入力をCDPで発行、390x844):
 *   修正なし … pointermove 1回 → pointercancel、隅は変わらない
 *   修正あり … pointermove 25回 → pointerup、対角の隅へ移動できる
 *
 * 【対処】
 * ドラッグハンドルに touch-action: none を入れてブラウザにパンを開始させない。
 * dev オーバーレイは <nextjs-portal> の open な shadow root にいるので、外から
 * shadowRoot 経由で触れる。CSS では shadow 境界を越えられないため JS で当てている。
 *
 * 本家が直したら丸ごと削除すること。Layout 側で開発時のみ描画しているため、
 * 本番ビルドではこのモジュールごと落ちる。
 */
export default function DevToolsDragFix() {
  useEffect(() => {
    const SELECTOR = "[data-nextjs-dev-tools-button]";
    const observers: MutationObserver[] = [];
    const watched = new WeakSet<ShadowRoot>();

    const applyIn = (root: ShadowRoot) => {
      const button = root.querySelector<HTMLElement>(SELECTOR);
      if (button && button.style.touchAction !== "none") {
        button.style.touchAction = "none";
      }
    };

    // オーバーレイは非同期にマウントされ、開閉のたびに中身が作り直される。
    // ポータル(light DOM)の出現と、その shadow root 内の変化の両方を見る必要がある。
    const scan = () => {
      for (const host of document.querySelectorAll("nextjs-portal")) {
        const root = host.shadowRoot;
        if (!root) continue;

        applyIn(root);

        if (!watched.has(root)) {
          watched.add(root);
          const observer = new MutationObserver(() => applyIn(root));
          observer.observe(root, { childList: true, subtree: true });
          observers.push(observer);
        }
      }
    };

    scan();

    const portalObserver = new MutationObserver(scan);
    portalObserver.observe(document.body, { childList: true, subtree: true });
    observers.push(portalObserver);

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
