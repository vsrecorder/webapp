import { Card, CardHeader } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import type { DeckCardView } from "@app/components/organisms/Deck/DeckCard";

// リスト表示（コンパクト行）用スケルトン。実際のリストカードの構造に合わせて、
// 右上に登録日、コンテンツ行にスプライト2体・勝率リング・デッキ名/戦績＋きずなLv.・
// きずなLv.の線＋段階名・内訳の開閉ボタンの骨格を並べる。
//
// 各行の高さは実物のカードを実測した値に合わせてある（合計123px）。骨格が1本でも
// 欠けると、データが入った瞬間に行が伸びて一覧全体が飛ぶ。
export function DeckListRowSkeleton() {
  return (
    <Card className="w-full">
      <div className="flex flex-col gap-1.5 px-3 py-3">
        {/* 右上：登録日（実体は text-tiny の16px行） */}
        <div className="flex h-4 justify-end">
          <Skeleton className="h-3.5 w-28 rounded-lg" />
        </div>

        {/* コンテンツ行 */}
        <div className="flex items-center gap-3">
          {/* スプライト2体。実データ描画時のレイアウトシフトを避けるため、実物の
              PokemonSprite と同じ 48px スロットを隙間なく2つ並べる。中の丸は
              PokemonSprite が実際に見せるキャラ位置（枠いっぱいではなく、やや小さめ・
              下端中央寄り）に合わせてスロット内の下端中央へ配置する。 */}
          <div className="flex items-center shrink-0">
            {[0, 1].map((i) => (
              <div key={i} className="relative h-12 w-12">
                <Skeleton className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full" />
              </div>
            ))}
          </div>
          {/* 勝率リング */}
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* デッキ名（text-medium の24px行） */}
            <div className="flex h-6 items-center">
              <Skeleton className="h-4 w-full rounded-lg" />
            </div>
            {/* 戦績（左）ときずなLv.の数値（右）。実体は text-tiny の行に11pxの数値が
                baseline で並ぶため17px。 */}
            <div className="flex h-4.25 items-center justify-between gap-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            {/* きずなLv.の線と、その下の段階名（右端に説明への入口が並ぶ20px行） */}
            <div className="flex flex-col gap-1">
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex h-5 items-center">
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </div>

          {/* 内訳の開閉ボタン（36pxの丸ボタン） */}
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        </div>
      </div>
    </Card>
  );
}

// リスト/ギャラリー切り替えトグル用スケルトン（横幅いっぱい、実際のトグル高さに合わせる）。
export function DeckViewToggleSkeleton() {
  return <Skeleton className="h-8 w-full rounded-lg" />;
}

export function DeckCardSkeleton({
  compact = false,
  enableCardList = false,
}: { compact?: boolean; enableCardList?: boolean } = {}) {
  // ボード(記録詳細/モーダル)向けのスケルトン。実態のDeckCodeCardに合わせて、
  // デッキ画像(2:1)を主役に、その下にデッキコード行だけを並べる（チップ行は無い）。
  if (compact) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <Skeleton className="aspect-2/1 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        {/* カードリストのアコーディオン（たたんだ状態）。
            実体の見出し行の高さ（上下padding 8px＋行の高さ16px＝32px）に合わせる。 */}
        {enableCardList && <Skeleton className="h-8 w-full rounded-lg" />}
      </div>
    );
  }

  // ギャラリー表示用スケルトン。実際のギャラリーカードの「既定（畳んだ）状態」に合わせて、
  // ヘッダー(登録日＋スプライト＋名前＋きずなLv.の数値と線)・ヒーロー画像・
  // 「デッキコード・戦績を見る」開閉ボタンの骨格を並べる。
  // デッキコード・戦績・先攻/後攻は開いたときだけ出るためここには含めない。
  //
  // 各要素の高さは実物のカードを実測した値に合わせてある（合計399px）。
  return (
    <Card className="w-full overflow-hidden border border-default-200 shadow-sm">
      <CardHeader className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
        {/* 右上：登録日（実体は text-tiny の16px行） */}
        <div className="flex h-4 justify-end">
          <Skeleton className="h-3.5 w-28 rounded-lg" />
        </div>
        {/* スプライトを上、デッキ名ときずなLv.を下に配置（中央揃え）。
            スプライト骨格は実物の PokemonSprite（48px スロットを隙間なく2つ）に合わせ、
            中の丸はキャラ位置（やや小さめ・下端中央寄り）に合わせて下端中央へ配置する。 */}
        <div className="flex w-full min-w-0 flex-col items-center gap-1">
          <div className="flex items-center shrink-0">
            {[0, 1].map((i) => (
              <div key={i} className="relative h-12 w-12">
                <Skeleton className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full" />
              </div>
            ))}
          </div>
          {/* デッキ名（text-large の28px行） */}
          <div className="flex h-7 items-center">
            <Skeleton className="h-5 w-40 rounded-lg" />
          </div>
          {/* きずなLv.の数値（20px行）と線。畳んだ状態でも見えるため骨格に含める。 */}
          <div className="flex w-full min-w-0 flex-col gap-1 pt-0.5">
            <div className="flex h-5 items-center justify-center">
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        </div>
      </CardHeader>

      {/* ヒーロー画像 */}
      <Skeleton className="aspect-2/1 w-full" />

      {/* 「デッキコード・戦績を見る」開閉ボタン（実体は32px） */}
      <div className="px-3 pt-2 pb-3">
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </Card>
  );
}

export function DeckCardSkeletons({
  view = "gallery",
}: { view?: DeckCardView } = {}) {
  if (view === "list") {
    // リストは1行が低く一覧性が高いので、多めに5件分の骨格を表示する。
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <DeckListRowSkeleton key={i} />
        ))}
      </>
    );
  }

  return (
    <>
      <DeckCardSkeleton />
      <DeckCardSkeleton />
    </>
  );
}
