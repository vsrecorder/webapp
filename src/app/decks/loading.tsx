import { cookies } from "next/headers";

import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";
import { DeckViewToggleSkeleton } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import DeckViewToggleBar from "@app/components/organisms/Deck/DeckViewToggleBar";
import DeckListSkeleton from "@app/components/organisms/Deck/Skeleton/DeckListSkeleton";
import { DeckListViewProvider } from "@app/hooks/useDeckListView";
import {
  DECK_LIST_VIEW_COOKIE,
  DECKS_SELECTED_TAB_COOKIE,
  parseDeckListView,
  parseDecksTab,
} from "@app/utils/deckListPrefs";

// /decks の Suspense 境界。実ページ(TemplateDecks)と同じ「上部固定セグメント＋(状態切替＋表示切替)＋デッキ一覧」の
// 枠を即座に見せ、サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
//
// 骨格の形(リスト/ギャラリー、★の有無)は実ページと同じく cookie から決める。
// ハードロードでは fallback はハイドレーションされないので、ここで読まないと常に既定の形になる
export default async function Loading() {
  const store = await cookies();
  const view = parseDeckListView(store.get(DECK_LIST_VIEW_COOKIE)?.value);
  const tab = parseDecksTab(store.get(DECKS_SELECTED_TAB_COOKIE)?.value) ?? "inuse";

  return (
    <DeckListViewProvider initialView={view}>
    <div className="pt-12 w-full">
      {/* マイデッキ｜みんなの公開デッキ(DeckSegmentedControl と同じ位置)。
          利用中/アーカイブ済みは固定タブではなく、下の表示切替バーの中に入る */}
      <FixedTabBarSkeleton
        count={2}
        positionClassName="top-15 left-0 right-0 lg:left-56"
      />

      <div className="pt-2 lg:pb-6 lg:max-w-4xl lg:mx-auto">
        {/* 実体(Decks)と同じ骨格で包む。space-y-3 と pb-3 まで揃えないと、
            実データに切り替わった瞬間に一覧全体が縦へずれる。 */}
        <div className="flex flex-col items-center space-y-3 pb-3">
          {/* リスト/ギャラリー表示の切り替えトグル。実体と同じ「固定バー＋空き枠」の
              骨格(DeckViewToggleBar)を共有し、切り替え時にバーが跳ばないようにする。 */}
          <DeckViewToggleBar>
            <DeckViewToggleSkeleton />
          </DeckViewToggleBar>

          {/* デッキカード一覧（保存済みの表示モードとタブに追従） */}
          <DeckListSkeleton initialTab={tab} />
        </div>

        {/* 実ページと同じく、溢れたときだけ下部クリアランスを出す */}
        <FloatingButtonClearance />
      </div>
    </div>
    </DeckListViewProvider>
  );
}
