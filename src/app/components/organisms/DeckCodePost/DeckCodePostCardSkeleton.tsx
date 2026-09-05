"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

/*
 * みんなの公開デッキの投稿カード(DeckCodePostCard)の読み込み中の骨格。
 *
 * 実物と同じ構成・同じ高さで並べる。1本でも欠けると、データが入った瞬間にカードが伸びて
 * 一覧全体が飛ぶため、行の高さは実物を実測した値に合わせてある(幅390px):
 *   投稿者行 36px(アイコン h-9) / スプライト(48px)＋デッキ名 80px(48 + gap-1 + text-large の行 28px) /
 *   デッキ画像 2:1 / コード欄 36px / カードリスト(閉) 32px / ACE SPEC 44px /
 *   いいね行 28px(min-h-7。上余白 2px を含む) / 操作ボタン行 32px(h-8 のボタン3つ)。
 * ACE SPEC は入っていないデッキでは出ない行だが、多数派の「入っている」側に合わせる。
 */
export default function DeckCodePostCardSkeleton() {
  return (
    <Card shadow="sm" className="w-full" data-testid="deck-code-post-card-skeleton">
      <CardBody className="flex flex-col gap-2.5 p-3">
        {/* 投稿者: アイコン・名前・称号チップ / 右端に時刻 */}
        <div className="flex h-9 items-center gap-2">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="ml-auto h-3 w-12 rounded" />
        </div>

        {/* スプライト2体(48px)を上、デッキ名を下に中央揃え(実物と同じギャラリー形式) */}
        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex shrink-0 items-center">
            {[0, 1].map((i) => (
              <div key={i} className="relative h-12 w-12">
                <Skeleton className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-7 w-3/5 rounded-lg" />
        </div>

        {/* デッキ画像(2:1) */}
        <Skeleton className="aspect-2/1 w-full rounded-lg" />

        {/* デッキコード */}
        <Skeleton className="h-9 w-full rounded-lg" />

        {/* カードリスト(閉じた状態。isCompact の Accordion で 32px) */}
        <Skeleton className="h-8 w-full rounded-lg" />

        {/* ACE SPEC */}
        <Skeleton className="h-11 w-full rounded-lg" />

        {/* いいね(ハート＋数)・いいねした人。実物と同じ min-h-7(上余白 2px を含めて 28px) */}
        <div className="flex min-h-7 items-center gap-2 pt-0.5">
          <Skeleton className="h-[1.625rem] w-14 shrink-0 rounded-full" />
          <div className="flex">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className={`h-6 w-6 rounded-full ${i === 0 ? "" : "-ml-2"}`} />
            ))}
          </div>
        </div>

        {/* 操作ボタン3つ(シェア／公式サイト／取り込む)。実物と同じ h-8 の3列 */}
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
