import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

// /cityleague_results の Suspense 境界。実ページ(TemplateCityleagueResults)と同じ
// 「上部固定タブ＋大会結果カード」の枠を即座に見せ、サーバレンダリング待ちの間に
// 画面が固まって見えるのを防ぐ。
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

      <div className="w-full lg:max-w-4xl lg:mx-auto flex flex-col gap-3 px-1">
        <CityleagueResultSkeletons />
      </div>
    </>
  );
}
