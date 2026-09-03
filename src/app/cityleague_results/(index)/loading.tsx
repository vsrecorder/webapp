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
        {/* タブ(オープン/シニア/ジュニア)。実体(TemplateCityleagueResults)の Tabs と
            同じ位置・同じ背景に置く。実体は「ヘッダー下端(top-14)から始めて pt-1 で
            タブを 60px に置き、地色を不透明に敷く」形にしてある(ヘッダーとの 4px の
            すき間から本文が透けて流れるのを塞ぐため)。ここが食い違うと、骨格から
            実体に切り替わった瞬間にタブが 4px 跳ねて背景も変わる。 */}
        <FixedTabBarSkeleton
          count={3}
          positionClassName="top-14 left-0 right-0 lg:top-28 pt-1 lg:pt-0 app-dot-bg-plain"
        />
      </div>

      {/* 過去の結果を探す軸チップはデータに依存しないので、骨格ではなく実体をそのまま出す。
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
