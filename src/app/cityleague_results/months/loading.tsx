import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/months の Suspense 境界。
// 役割と rowCount の決め方は seasons/loading.tsx と同じ（結果がある開催月は35件）。
// 開催月はサブタイトル（期間）を持たないため showSubtitle は付けない。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={35} showSubtitle={false} />;
}
