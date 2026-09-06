import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  DECKS_SELECTED_TAB_COOKIE,
  DecksTab,
  parseDecksTab,
} from "@app/utils/deckListPrefs";

/*
 * デッキ一覧の「利用中／アーカイブ済み」タブの初期値。
 *
 * 一覧本体(templates/Decks)と、Suspense の骨格(DeckListSkeleton)と、サーバ描画(decks/page.tsx)が
 * 同じ規則でタブを決める必要がある。食い違うと、骨格→実体、サーバ描画→ハイドレーションの
 * 切り替わりで★ボタンぶん(20px)カードの高さが変わり、一覧が縮んで見える。
 *
 * 保存先は cookie(deckListPrefs)。サーバでも読めるようにするため。
 */

export type { DecksTab };

// 戻り遷移でデッキモーダルを再開する対象がアーカイブ済み側か("1"/"0")。
// utils/deckModalReopen の REOPEN_DECK_MODAL_ARCHIVED と同じ値
export const DECKS_REOPEN_ARCHIVED_FLAG_KEY = "reopenDeckModalArchived";

// 再開フラグが立っていればそちらを優先し、なければ保存済みのタブ、どちらも無ければ「利用中」
export function resolveDecksInitialTab(input: {
  reopenArchivedFlag: string | null;
  savedTab: string | null;
}): DecksTab {
  if (input.reopenArchivedFlag === "1") return "archived";

  return parseDecksTab(input.savedTab) ?? "inuse";
}

// ブラウザで初期タブを読む。サーバや storage が使えない環境では「利用中」
export function readDecksInitialTab(): DecksTab {
  try {
    return resolveDecksInitialTab({
      reopenArchivedFlag: sessionStorage.getItem(DECKS_REOPEN_ARCHIVED_FLAG_KEY),
      savedTab: readClientCookie(DECKS_SELECTED_TAB_COOKIE),
    });
  } catch {
    return "inuse";
  }
}

// 選択中タブを保存する(セッション cookie。ブラウザを閉じたら利用中に戻る)
export function writeDecksSelectedTab(tab: DecksTab): void {
  writeClientCookie(DECKS_SELECTED_TAB_COOKIE, tab);
}
