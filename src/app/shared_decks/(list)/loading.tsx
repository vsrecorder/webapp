import { cookies } from "next/headers";

import { Skeleton } from "@heroui/react";

import DeckSegmentedControl from "@app/components/molecules/DeckSegmentedControl";
import DeckViewToggleBar from "@app/components/organisms/Deck/DeckViewToggleBar";
import DeckCodePostCardSkeleton from "@app/components/organisms/DeckCodePost/DeckCodePostCardSkeleton";
import { hasSessionCookie } from "@app/utils/sessionCookie";

// /shared_decks(一覧)の Suspense 境界。実ページ(TemplateSharedDecks)と同じ
// 「上部固定セグメント＋(環境/スプライト/ACE SPEC のチップ)＋投稿カード」の枠を先に見せる。
// ルートグループ (list) の中に置き、個別ページ・投稿者ページには効かせない
// (それらは notFound() を本物の 404 にするため Suspense 境界を持たない)。
export default async function Loading() {
  /*
   * 上部のセグメントは骨格ではなく実体をそのまま出す(タブの見た目はデータに依存しないので、
   * 骨格に差し替えるとラベルと選択位置が一瞬グレーの棒になって戻るだけのちらつきになる)。
   * 「マイデッキ」に鍵を付けるかだけはログイン状態で変わるので、Cookie の有無で決める
   * (auth() は待たせたくない。ここは待たせず先に出すためのフォールバック)。
   */
  const isLoggedIn = hasSessionCookie((await cookies()).getAll());

  return (
    <div className="w-full pt-12">
      <DeckSegmentedControl selected="shared" isLoggedIn={isLoggedIn} />

      <div className="flex flex-col gap-3 pt-2 pb-6 lg:max-w-4xl lg:mx-auto">
        <DeckViewToggleBar>
          <div className="flex items-center gap-1.5 px-0.5">
            {/* 実際のチップの幅(環境148 / スプライト102 / ACE SPEC 98)に合わせる。
                高さ h-8 も実体のチップ(CHIP_BASE)と同じにする。ここがずれると
                骨格→実体の切り替えで固定バーの高さが変わり、下の一覧が跳ねる */}
            {[148, 102, 98].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
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
