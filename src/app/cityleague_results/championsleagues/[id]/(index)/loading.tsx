import CityleagueIndexSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueIndexSkeleton";

// /cityleague_results/championsleagues/[id] の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、大会一覧からタップしてもサーバの描画が終わるまで
// 画面が前のページのまま固まる。
//
// 中身はリーグ区分の索引（ヘッダー＋区分一覧）。rowCount は実データの区分数
// （多くの大会でマスター・シニア・ジュニアの3件）に合わせている。
//
// 置き場所が (index) グループなのは、この骨格を索引ページだけに効かせるため。
// 直下に置くと詳細ページ(子セグメント)にも継承され、詳細側が自前の loading.tsx を
// 持っていても打ち消せない(子のツリーが組み上がるまで外側のこの境界が使われるため、
// 索引の骨格が先に出てから詳細の骨格に差し替わる)。
export default function Loading() {
  return <CityleagueIndexSkeleton rowCount={3} showSubtitle />;
}
