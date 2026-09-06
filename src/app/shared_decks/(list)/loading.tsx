import { Skeleton } from "@heroui/react";

import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import DeckViewToggleBar from "@app/components/organisms/Deck/DeckViewToggleBar";
import DeckCodePostCardSkeleton from "@app/components/organisms/DeckCodePost/DeckCodePostCardSkeleton";

// /shared_decks(一覧)の Suspense 境界。実ページ(TemplateSharedDecks)と同じ
// 「上部固定セグメント＋(環境/スプライト/ACE SPEC のチップ)＋投稿カード」の枠を先に見せる。
// ルートグループ (list) の中に置き、個別ページ・投稿者ページには効かせない
// (それらは notFound() を本物の 404 にするため Suspense 境界を持たない)。
export default function Loading() {
  return (
    <div className="w-full pt-12">
      <FixedTabBarSkeleton count={2} positionClassName="top-15 left-(--sidebar-width) right-0" />

      <div className="flex flex-col gap-3 pt-2 pb-6 lg:max-w-4xl lg:mx-auto">
        <DeckViewToggleBar>
          <div className="flex items-center gap-1.5 px-0.5">
            {/* 実際のチップの幅(環境148 / スプライト102 / ACE SPEC 98)に合わせる */}
            {[148, 102, 98].map((w, i) => (
              <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </DeckViewToggleBar>

        {[0, 1, 2].map((i) => (
          <DeckCodePostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
