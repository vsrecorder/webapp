import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import CityleagueBrowseSection from "@app/components/organisms/Cityleague/CityleagueBrowseSection";
import CityleagueResultsSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultsSkeleton";

// /cityleague_results の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、ナビの「大会結果」をタップしてからサーバの描画が
// 終わるまで画面が前のページのまま固まる（実測で約650ms、何も出ない）。
//
// 置き場所が (index) グループなのは、この骨格を /cityleague_results だけに効かせるため。
// cityleague_results/ 直下に置くと months・seasons・environments・[id] にも継承され、
// 中身と噛み合わないリーグ種別タブの骨格が出てしまう。
export default function Loading() {
  return (
    <>
      <div className="pt-12 w-full">
        {/* タブ(オープン/シニア/ジュニア)。実体(TemplateCityleagueResults)の Tabs と同じ位置に置く */}
        <FixedTabBarSkeleton
          count={3}
          positionClassName="top-15 left-0 right-0 lg:top-28"
        />
      </div>

      {/* 「過去の結果を探す」導線はデータに依存しないので、骨格ではなく実体をそのまま出す。
          実ページと同一のマークアップなので、切り替わってもここは一切動かない。 */}
      <CityleagueBrowseSection />

      {/* 実ページはリーグ種別ごとに3つ並べて hidden で出し分けるが、
          見えているのは常に1つなので骨格も1つでよい。 */}
      <div className="w-full">
        <CityleagueResultsSkeleton />
      </div>
    </>
  );
}
