"use client";

import { useEffect, useRef } from "react";

/*
 * フッターが画面に入っているあいだ、<html> に data-footer-in-view を付ける。
 * globals.css がこれを見て、ページの外側の地をフッターの色に塗る。
 *
 * iOS の Safari は、最下部まで送ったときの引っ張り余白やツールバーの裏など、文書の外を
 * ルート要素の背景色で塗る。その色は HeroUI が :root に付ける地(ライトで白)なので、
 * 濃いフッターの下端に白い線が覗いていた。
 *
 * 常に塗り替えない理由: iOS の standalone PWA では画面最下端のセーフエリアも同じ色で
 * 塗られるので、ページのどこを見ていても下端に濃い帯が出てしまう。上端で引っ張ったときに
 * 覗く地も濃くなる。フッターが見えているときだけなら、隣り合うのはフッターなので目立たない。
 */
export const FOOTER_IN_VIEW_ATTR = "data-footer-in-view";

export default function FooterCanvasColor() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const footer = ref.current?.closest("footer");
    if (!footer) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) root.setAttribute(FOOTER_IN_VIEW_ATTR, "true");
      else root.removeAttribute(FOOTER_IN_VIEW_ATTR);
    });
    observer.observe(footer);

    return () => {
      observer.disconnect();
      // フッターの無いページへ移ったら地を戻す
      root.removeAttribute(FOOTER_IN_VIEW_ATTR);
    };
  }, []);

  return <span ref={ref} hidden />;
}
