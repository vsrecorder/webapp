import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/championsleagues の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、一覧上部の軸チップをタップしてから
// サーバの描画が終わるまで画面が前のページのまま固まる。
//
// rowCount は現在の実データ（結果が登録済みの大会23件）に合わせている。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={23} showSubtitle />;
}
