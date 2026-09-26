import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/dates の Suspense 境界(役割は months/(index)/loading.tsx と同じ)。
// 置き場所を (index) グループに閉じているのも同じ理由: 直下に置くと開催日の個別ページにも
// 継承され、個別ページ側の骨格より先にこの骨格が出てしまう。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={20} showSubtitle={false} />;
}
