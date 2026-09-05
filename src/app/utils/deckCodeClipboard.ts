import { addToast } from "@heroui/react";

// デッキコードをクリップボードへコピーし、結果をトーストで知らせる。
// コード欄(CopyableDeckCode)と個別ページの固定 CTA で同じ文言・同じ挙動にする。
// 成功したら true(押した側で「コピー済み」の見た目にするために返す)。
export async function copyDeckCode(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    addToast({ title: "デッキコードをコピーしました", color: "success", timeout: 2000 });
    return true;
  } catch {
    addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    return false;
  }
}
