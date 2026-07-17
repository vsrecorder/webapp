"use client";

import { useVisualViewportOffset } from "@app/hooks/useVisualViewportOffset";

/*
 * visualViewport.offsetTop(iOS がキーボード表示時にページを押し上げた量)を
 * CSS 変数 --vv-offset-top へ常時反映する。
 * globals.css がこの変数を使い、すべての HeroUI モーダルを可視領域へ追従させる。
 */
export default function VisualViewportOffsetSync() {
  useVisualViewportOffset(true);
  return null;
}
