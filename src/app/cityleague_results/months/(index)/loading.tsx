import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/months の Suspense 境界。
// 役割と rowCount の決め方は seasons/(index)/loading.tsx と同じ（結果がある開催月は35件）。
// 開催月はサブタイトル（期間）を持たないため showSubtitle は付けない。
//
// 置き場所が (index) グループなのは、この骨格を索引ページだけに効かせるため。
// 直下に置くと詳細ページ(子セグメント)にも継承され、詳細側が自前の loading.tsx を
// 持っていても打ち消せない(子のツリーが組み上がるまで外側のこの境界が使われるため、
// 索引の骨格が先に出てから詳細の骨格に差し替わる)。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={35} showSubtitle={false} />;
}
