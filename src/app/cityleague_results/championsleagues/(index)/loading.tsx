import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/championsleagues の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、一覧上部の軸チップをタップしてから
// サーバの描画が終わるまで画面が前のページのまま固まる。
//
// rowCount は現在の実データ（結果が登録済みの大会23件）に合わせている。
//
// 置き場所が (index) グループなのは、この骨格を索引ページだけに効かせるため。
// 直下に置くと詳細ページ(子セグメント)にも継承され、詳細側が自前の loading.tsx を
// 持っていても打ち消せない(子のツリーが組み上がるまで外側のこの境界が使われるため、
// 索引の骨格が先に出てから詳細の骨格に差し替わる)。
export default function Loading() {
  // 見出しに補足行(説明文)を持つ(実測で見出しが 20px 高い)
  return <CityleagueIndexSkeleton rowCount={23} showSubtitle showHeaderSubtitle />;
}
