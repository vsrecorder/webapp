import type { DeckCardView } from "@app/components/organisms/Deck/DeckCard";

/*
 * デッキ一覧の表示設定(表示モード・タブ)の保存先と、その値の検証。
 *
 * どちらも cookie に持つ。以前は localStorage / sessionStorage だったが、サーバは
 * それらを読めないため、サーバ描画は常に既定(ギャラリー・利用中)の形で描かれ、
 * リスト表示やアーカイブ済みタブを使う人はハイドレーション後に一覧が組み替わって見えていた
 * (サーバで1ページ目を載せるようにしてから、実カードごと形が変わるので目立つ)。
 * cookie なら decks/page.tsx と loading.tsx が読めて、最初から同じ形で描ける。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/clientCookie)。
 */

// 表示モード(リスト/ギャラリー)。1年保つ
export const DECK_LIST_VIEW_COOKIE = "deckListView";
export const DECK_LIST_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// 選択中タブ(利用中/アーカイブ済み)。以前の sessionStorage と同じく、ブラウザを閉じたら
// 利用中に戻したいのでセッション cookie(有効期限なし)
export const DECKS_SELECTED_TAB_COOKIE = "decksSelectedTab";

export type DecksTab = "inuse" | "archived";

// cookie の値は誰でも書き換えられるので、既知の値以外は無視する
export function parseDeckListView(value: string | null | undefined): DeckCardView | null {
  return value === "list" || value === "gallery" ? value : null;
}

export function parseDecksTab(value: string | null | undefined): DecksTab | null {
  return value === "inuse" || value === "archived" ? value : null;
}

// "a=1; b=2" 形式(document.cookie や Cookie ヘッダー)から名前で値を取り出す。無ければ null
export function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;

    if (part.slice(0, eq).trim() !== name) continue;

    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}
