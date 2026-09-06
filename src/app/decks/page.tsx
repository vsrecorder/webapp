import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateDecks from "@app/components/templates/Decks";

import { DeckListViewProvider } from "@app/hooks/useDeckListView";
import {
  DECK_LIST_VIEW_COOKIE,
  DECKS_SELECTED_TAB_COOKIE,
  parseDeckListView,
  parseDecksTab,
} from "@app/utils/deckListPrefs";
import { getDecksInitialData } from "@app/utils/deckListServer";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // 表示モード(リスト/ギャラリー)と選択中タブは cookie に保存されている。サーバ描画の時点で
  // その形で描き、ハイドレーション後に一覧が組み替わって見えないようにする(deckListPrefs 参照)
  const store = await cookies();
  const view = parseDeckListView(store.get(DECK_LIST_VIEW_COOKIE)?.value);
  const tab = parseDecksTab(store.get(DECKS_SELECTED_TAB_COOKIE)?.value) ?? "inuse";

  // 1ページ目・きずな・戦績はサーバで取って HTML に載せる(みんなの公開デッキと同じ型)。
  // クライアントで取るとハイドレーション後の往復ぶん表示が遅れる。取れなければクライアントが取り直す
  const initial = await getDecksInitialData(session.user.id, tab === "archived");

  return (
    <DeckListViewProvider initialView={view}>
      <TemplateDecks userId={session.user.id} initial={initial} initialTab={tab} />
    </DeckListViewProvider>
  );
}
