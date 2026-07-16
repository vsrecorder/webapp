"use client";

import { DeckCardSkeletons } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import { useDeckListView } from "@app/hooks/useDeckListView";

// デッキ一覧のスケルトン。保存済みの表示モードに合わせて骨格とグリッドを切り替え、
// 実データ描画時にレイアウトが組み替わって見えるのを防ぐ。
export default function DeckListSkeleton() {
  const view = useDeckListView();

  return (
    <div
      className={`grid w-full ${
        view === "gallery"
          ? "gap-4 grid-cols-1 lg:grid-cols-2 lg:gap-x-6"
          : "gap-3 grid-cols-1"
      }`}
    >
      <DeckCardSkeletons view={view} />
    </div>
  );
}
