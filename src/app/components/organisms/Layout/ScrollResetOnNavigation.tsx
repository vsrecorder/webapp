"use client";

import { useScrollResetOnNavigation } from "@app/hooks/useScrollResetOnNavigation";

/*
 * ページを表示したとき、必ず先頭から表示するグローバル常駐コンポーネント。
 * リンク遷移と履歴移動(戻る/進む)の両方が対象。
 * 「別のページのスクロール位置を引きずったまま表示される」「ページの途中が表示される」
 * といった問題への対応。詳細は useScrollResetOnNavigation のコメントを参照。
 */
export default function ScrollResetOnNavigation() {
  useScrollResetOnNavigation();
  return null;
}
