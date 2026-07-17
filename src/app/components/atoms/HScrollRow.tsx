"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";

/*
 * 横スクロール行。中身が実際に横へ溢れているときだけ overflow-x-auto にする。
 *
 * HeroUI の Modal は iOS で、overflow スタイル(auto/scroll)を持つのに実際には溢れていない
 * 要素から始まるスワイプを preventDefault で殺す(react-aria の usePreventScroll が
 * ページのラバーバンドを抑止する際の副作用)。溢れていないときに overflow-x-auto のままだと、
 * この行に指を置いた縦スワイプがモーダルのスクロールに繋がらず「スクロールが効かない」状態になる。
 * 溢れていないときは overflow-x-visible へ切り替えて、スワイプを親のスクロールへ通す。
 * (hidden にすると CSS 仕様で overflow-y が auto に計算され、判定に引っかかったまま。
 *  visible なら両軸 visible になり判定を外れる。溢れていないのでクリップ有無の視覚差もない)
 */
export default function HScrollRow({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(true);

  // 中身(候補の件数や絞り込み)はレンダーごとに変わるため、毎レンダー後に測り直す。
  // 同値なら setState は再レンダーを起こさないのでループにはならない
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setIsOverflowing(el.scrollWidth > el.clientWidth);
    update();

    // 画面回転やモーダル幅の変化に追従する
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  });

  return (
    <div
      ref={ref}
      className={`${isOverflowing ? "overflow-x-auto" : "overflow-x-visible"} ${className}`}
    >
      {children}
    </div>
  );
}
