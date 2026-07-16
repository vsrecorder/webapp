import { Skeleton } from "@heroui/react";

import CityleagueEventSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton";
import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

// /cityleague_results/[id] の Suspense 境界。
// このページはサーバ側でイベント情報と入賞結果を取得してから描画するため、
// クライアント側の読み込み表示を持たない。親(/cityleague_results)の
// 大会結果一覧スケルトンが継承されると紛らわしいので、詳細ページ用に上書きし、
// 実体(CityleagueResultByOfficialEventId)と同じ「一覧への戻り導線＋イベントヘッダー＋
// 入賞カード」の枠を即座に見せる。
export default function Loading() {
  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      {/* 一覧へ戻る導線 */}
      <div className="-mx-2 border-b border-default-200/60 px-2.5 py-2">
        <Skeleton className="h-5 w-40 rounded-md" />
      </div>

      {/* イベントヘッダー */}
      <CityleagueEventSkeleton />

      {/* 入賞カード */}
      <div className="flex flex-col gap-2">
        <CityleagueResultCardSkeleton />
        <CityleagueResultCardSkeleton />
      </div>
    </div>
  );
}
