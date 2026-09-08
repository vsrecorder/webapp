import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import FloatingButtonClearance from "@app/components/atoms/Floating/FloatingButtonClearance";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

/*
 * /records の Suspense 境界。実ページ(TemplateRecords)と同じ「上部固定タブ＋記録カード一覧」の
 * 枠を即座に見せ、サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
 *
 * 置き場所が (index) グループなのは、この骨格を /records だけに効かせるため
 * (/cityleague_results と同じ理由)。records/ 直下に置くと create・quick・[id] にも継承され、
 * それぞれが自前の loading.tsx を持っていても、子セグメントのツリーが組み上がるまでは
 * 外側にあるこの境界が使われて、記録一覧のカード骨格が先に出てしまう。
 */
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

      <div className="w-full pt-2 lg:pb-6 lg:max-w-4xl lg:mx-auto">
        <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2 lg:gap-x-6">
          <RecordCardSkeletons desktopColumns={2} />
        </div>

        {/* 実ページと同じく、溢れたときだけ下部クリアランスを出す */}
        <FloatingButtonClearance />
      </div>
    </>
  );
}
