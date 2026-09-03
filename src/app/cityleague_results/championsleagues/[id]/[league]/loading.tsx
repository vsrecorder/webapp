import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

// 順位セクション（優勝／準優勝／ベスト4／ベスト8）の人数。
// 実体(ChampionsleagueResultByLeague)の順位セクションと同じ並びにする。
const RANK_SECTION_CARD_COUNTS = [1, 1, 2, 4];

// /cityleague_results/championsleagues/[id]/[league] の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、区分一覧からタップしてもサーバの描画が終わるまで
// 画面が前のページのまま固まる。
export default function Loading() {
  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      {/* 一覧への戻り導線（実体と同じくヘッダー直下に sticky で置く） */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        <div className="relative w-fit px-2.5 py-2">
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>

      {/* 大会名＋リーグ区分のヘッダー */}
      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 bg-linear-to-br from-indigo-500/10 to-pink-500/10 px-3 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="py-0.5">
              <Skeleton className="h-[1.375rem] w-56 rounded-md" />
            </div>
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>

          {/* 会場のチップ */}
          <div className="flex flex-wrap items-start gap-1">
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
        </CardHeader>

        <CardBody className="gap-2 px-3 py-2.5">
          {/* 入賞人数・デッキコード件数 */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>

          {/* 冒頭の要約文（text-tiny / leading-relaxed のおよそ3行） */}
          <div className="flex flex-col gap-2 py-[3px]">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
          </div>
        </CardBody>
      </Card>

      {/* イベントの見出しカード（区分名・開催日・公式サイトへの導線） */}
      <div className="pt-2">
        <Card shadow="sm" className="w-full">
          <CardBody className="gap-1 px-3 py-2.5">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </CardBody>
        </Card>
      </div>

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
