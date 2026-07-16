import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import {
  DeckCardSkeletons,
  DeckViewToggleSkeleton,
} from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";

// /decks の Suspense 境界。実ページ(TemplateDecks)と同じ「上部固定タブ＋表示切替＋デッキ一覧」の
// 枠を即座に見せ、サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
export default function Loading() {
  return (
    <div className="pt-12 w-full">
      {/* タブ(利用中/アーカイブ済み) */}
      <FixedTabBarSkeleton
        count={2}
        positionClassName="top-15 left-0 right-0 lg:left-56"
      />

      <div className="pt-2 pb-35 lg:pb-6 lg:max-w-4xl lg:mx-auto">
        {/* リスト/ギャラリー表示の切り替えトグル */}
        <div className="pb-2">
          <DeckViewToggleSkeleton />
        </div>

        {/* デッキカード一覧（ギャラリー表示） */}
        <div className="grid w-full gap-4 grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
          <DeckCardSkeletons view="gallery" />
        </div>
      </div>
    </div>
  );
}
