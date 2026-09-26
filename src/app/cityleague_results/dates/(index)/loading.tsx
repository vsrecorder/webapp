import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/dates の Suspense 境界(役割は months/(index)/loading.tsx と同じ)。
// 置き場所を (index) グループに閉じているのも同じ理由: 直下に置くと開催日の個別ページにも
// 継承され、個別ページ側の骨格より先にこの骨格が出てしまう。
export default function Loading() {
  // 実体は開催月ごとに見出しで区切る。開催中の月は日数が少なく、前の月は多いことが多い
  return <CityleagueIndexSkeleton showSubtitle={false} groupRowCounts={[2, 12]} />;
}
