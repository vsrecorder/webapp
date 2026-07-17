import { Skeleton } from "@heroui/react";

import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import CityleagueBrowseSection from "@app/components/organisms/Cityleague/CityleagueBrowseSection";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

// /cityleague_results の Suspense 境界。実ページ(TemplateCityleagueResults)と同じ
// 「上部固定タブ＋過去の結果を探す導線＋スケジュール情報＋大会結果カード」の枠を
// 即座に見せ、サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
export default function Loading() {
  return (
    <>
      <div className="pt-12 w-full">
        {/* タブ(オープン/シニア/ジュニア) */}
        <FixedTabBarSkeleton
          count={3}
          positionClassName="top-15 left-0 right-0 lg:top-28"
        />
      </div>

      {/* データに依存しない静的な導線なので、スケルトンではなく実体をそのまま置く */}
      <CityleagueBrowseSection />

      <div className="w-full">
        {/* CityleagueResults 相当 */}
        <div className="flex flex-col items-center space-y-3 pb-3">
          {/* スケジュール情報ヘッダー */}
          <div className="w-full rounded-2xl bg-default-100 px-4 py-4 flex flex-col items-center gap-3">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-4 w-52 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded-lg" />
          </div>

          <div className="flex flex-col w-full gap-3">
            <CityleagueResultSkeletons />
          </div>
        </div>
      </div>
    </>
  );
}
