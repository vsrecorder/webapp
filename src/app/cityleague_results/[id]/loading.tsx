import CityleagueResultDetailSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultDetailSkeleton";

/*
 * /cityleague_results/[id] の Suspense 境界。
 *
 * このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
 * 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
 * つまりこのファイルが無いと、一覧や関連リンクからタップしてもサーバの描画が
 * 終わるまで画面が前のページのまま固まる。
 *
 * 骨格の中身は page.tsx の fallback と同じものを使う。
 */
export default function Loading() {
  return <CityleagueResultDetailSkeleton />;
}
