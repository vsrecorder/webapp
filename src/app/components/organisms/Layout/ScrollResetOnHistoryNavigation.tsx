"use client";

import { useScrollResetOnHistoryNavigation } from "@app/hooks/useScrollResetOnHistoryNavigation";

/*
 * 戻る/進む(履歴移動)でページを表示したとき、必ず先頭から表示するグローバル常駐コンポーネント。
 * ブラウザ任せのスクロール復元が「ページの途中」を表示してしまう問題への対応。
 * 詳細は useScrollResetOnHistoryNavigation のコメントを参照。
 */
export default function ScrollResetOnHistoryNavigation() {
  useScrollResetOnHistoryNavigation();
  return null;
}
