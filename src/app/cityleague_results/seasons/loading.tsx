import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/seasons の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、「過去の結果を探す」のチップをタップしてから
// サーバの描画が終わるまで画面が前のページのまま固まる。
//
// rowCount は現在の実データの行数（結果があるシーズン16件）に合わせている。
// 骨格と実体で文書の高さが変わらないほど、切り替わりのガタつきが小さくなる。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={16} showSubtitle />;
}
