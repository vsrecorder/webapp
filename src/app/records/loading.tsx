import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

// /records の Suspense 境界。実ページ(TemplateRecords)と同じ「上部固定タブ＋記録カード一覧」の
// 枠を即座に見せ、サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
export default function Loading() {
  return (
    <>
      <div className="pt-12 w-full">
        {/* タブ(すべて/公式イベント/Tonamel/自由形式) */}
        <FixedTabBarSkeleton
          count={4}
          positionClassName="top-15 left-0 right-0 lg:left-56"
        />
      </div>

      <div className="w-full pt-2 pb-35 lg:pb-6 lg:max-w-4xl lg:mx-auto">
        <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2 lg:gap-x-6">
          <RecordCardSkeletons desktopColumns={2} />
        </div>
      </div>
    </>
  );
}
