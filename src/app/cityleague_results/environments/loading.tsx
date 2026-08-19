import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/environments の Suspense 境界。
// 役割と rowCount の決め方は seasons/loading.tsx と同じ（結果がある環境は25件）。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={25} showSubtitle />;
}
