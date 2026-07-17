"use client";

import { useEffect } from "react";

/*
 * iOS で入力欄にフォーカスすると、Safari はキーボードに隠れないよう
 * レイアウトビューポートごとページを押し上げることがある(visualViewport.offsetTop > 0)。
 * position:fixed はレイアウトビューポート基準のため、ボトムシートは可視領域から上へずれ、
 * シート上部が画面外に隠れる。react-aria(HeroUI Modal)はウィンドウのパンを抑止しているので、
 * ユーザーのスクロールでは戻せない。
 *
 * この offsetTop を CSS 変数 --vv-offset-top へ反映し、モーダルの wrapper を translate-y で
 * 追従させることで、シート全体を常に可視領域内へ収める。
 *
 *   useVisualViewportOffset(isOpen);
 *
 *   <Modal classNames={{ wrapper: "translate-y-[var(--vv-offset-top,0px)]" }} />
 */
export function useVisualViewportOffset(isEnabled: boolean) {
  useEffect(() => {
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    if (!isEnabled || !viewport) return;

    const root = document.documentElement;

    const update = () => {
      root.style.setProperty(
        "--vv-offset-top",
        `${Math.max(0, Math.round(viewport.offsetTop))}px`,
      );
    };

    update();

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--vv-offset-top");
    };
  }, [isEnabled]);
}
