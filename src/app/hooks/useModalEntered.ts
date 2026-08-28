"use client";

import { useEffect, useState } from "react";

/*
 * モーダルの入場アニメーションが「着地」するまで待つためのフック。
 *
 * 入場アニメーション中にスケルトン→実データの差し替え(大きなDOMコミット)を行うと、
 * framer-motion がJSで動かしているシートごとメインスレッドが止まり、
 * 「上がってくる途中で引っかかり、最終位置へワープする」動きになる
 * (CPU 4x スロットリングの実測で約300msのフリーズ)。
 *
 * 開いてから一定時間は false を返すので、その間は実データが揃っていても
 * スケルトンを出し続け、差し替えの重いコミットを着地後に回す。閉じると false に戻る。
 */

// AppModal の sheetMotion (y: 0.36s) が視覚的に停止するまで + 初回コミットや
// フレームスケジューリングの遅れぶんの余白(CPU 4x スロットリングの実測で決定)
const ENTER_SETTLE_MS = 480;

export function useModalEntered(isOpen: boolean): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const id = setTimeout(() => setEntered(true), ENTER_SETTLE_MS);
    return () => clearTimeout(id);
  }, [isOpen]);

  return entered;
}
