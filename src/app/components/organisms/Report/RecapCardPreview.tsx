"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  CARD_WIDTH,
  CARD_HEIGHT,
} from "@app/components/organisms/Report/RecapCardFrame";

/*
 * 画面にふりかえりカードを見せるための箱。
 *
 * カードは書き出し用に 1080×1350 の実寸で組んであるため、画面では親の幅に合わせて
 * transform: scale で縮めて見せる（KizunaHeaderCard と同じ扱い。
 * 見えているものがそのまま画像になる）。
 */
export default function RecapCardPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    setWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / CARD_WIDTH : 0;

  return (
    <div
      ref={ref}
      style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
      className="relative w-full overflow-hidden rounded-2xl shadow-md"
    >
      {/* 幅が確定するまでは描かない（scale 0 で潰れた状態を見せないため） */}
      {scale > 0 && (
        <div
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {children}
        </div>
      )}
    </div>
  );
}
