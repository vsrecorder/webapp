"use client";

import { useCloseModalOnBack } from "@app/hooks/useCloseModalOnBack";

/*
 * モーダル表示中のブラウザバック(スワイプバック含む)で、ページを戻す代わりに
 * モーダルを閉じるグローバル常駐コンポーネント。
 * 詳細は useCloseModalOnBack のコメントを参照。
 */
export default function CloseModalOnBack() {
  useCloseModalOnBack();
  return null;
}
