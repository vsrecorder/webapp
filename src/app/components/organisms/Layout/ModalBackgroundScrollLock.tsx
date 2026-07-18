"use client";

import { useModalBackgroundScrollLock } from "@app/hooks/useModalBackgroundScrollLock";

/*
 * モーダル表示中、キーボードが出ていても背面ページがスクロール/パンされないよう、
 * 背面のアプリルートを固定するグローバル常駐コンポーネント。
 * 詳細は useModalBackgroundScrollLock のコメントを参照。
 */
export default function ModalBackgroundScrollLock() {
  useModalBackgroundScrollLock();
  return null;
}
