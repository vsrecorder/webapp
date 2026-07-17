import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

// 順位セクション（優勝／準優勝／ベスト4／ベスト8）のダミー。
// 実体(CityleagueResultByOfficialEventId)の RANK_SECTIONS と同じ並びで、
// 各セクションの人数ぶんカードを並べる。
const RANK_SECTION_CARD_COUNTS = [1, 1, 2, 4];

// /cityleague_results/[id] の Suspense 境界。
// このページはサーバ側でイベント情報と入賞結果を取得してから描画するため、
// クライアント側の読み込み表示を持たない。親(/cityleague_results)の
// 大会結果一覧スケルトンが継承されると紛らわしいので、詳細ページ用に上書きし、
// 実体(CityleagueResultByOfficialEventId)と同じ「一覧への戻り導線＋イベントヘッダー＋
// 順位ごとの入賞カード」の枠を即座に見せる。
export default function Loading() {
  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      {/* 一覧への戻り導線（実体と同じくヘッダー直下に sticky で置く） */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        <div className="relative w-fit px-2.5 py-2">
          <Skeleton className="h-4 w-36 rounded-md" />
        </div>
      </div>

      {/* イベントヘッダー */}
      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 bg-linear-to-br from-indigo-500/10 to-pink-500/10 px-3 py-3">
          {/* 両端配置 */}
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* イベント名・開催日・店舗名 */}
              <Skeleton className="h-3.5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-36 rounded-md" />
              <div className="pt-0.5">
                <Skeleton className="h-5 w-52 rounded-md" />
              </div>
            </div>

            {/* 公式サイトの結果ページへのアイコンリンク */}
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </div>

          {/* 都道府県・リーグ区分・環境のチップ */}
          <div className="flex flex-wrap items-start gap-1">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </CardHeader>

        <CardBody className="gap-2 px-3 py-2.5">
          {/* 入賞人数・デッキコード件数 */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-28 rounded-md" />
          </div>

          {/* 公式サイトの結果ページを見る */}
          <Skeleton className="h-3.5 w-48 rounded-md" />
        </CardBody>
      </Card>

      {/* 順位ごとのセクション */}
      {RANK_SECTION_CARD_COUNTS.map((cardCount, sectionIndex) => (
        <section key={sectionIndex} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <span className="h-4 w-1 shrink-0 rounded-full bg-default-200" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-3 w-8 rounded-md" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: cardCount }).map((_, cardIndex) => (
              <CityleagueResultCardSkeleton key={cardIndex} showRankLabel={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
