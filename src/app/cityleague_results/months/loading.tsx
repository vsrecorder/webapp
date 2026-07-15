import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// Suspense 境界。チップから遷移した直後に即座にスケルトンを見せ、
// サーバでのデータ取得完了を待つ間の「画面が固まって見える」体感を無くす。
// 開催月はサブタイトル（期間）を持たないため showSubtitle は付けない。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={12} showSubtitle={false} />;
}
