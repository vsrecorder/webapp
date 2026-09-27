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
 *
 * この時点ではどのシーズンの大会か分からないが、入賞カードにはデッキの種類(バトラボのデッキ分類)の
 * 行を取っておく。分類が付くのは 2027 シーズン以降で、閲覧の中心はそちらになるため。
 * 取らずにおくと、page.tsx の fallback(シーズンに合わせて行を取る)へ差し替わるときに、
 * 新しいシーズンのページでカードが 1 枚あたり 100px 伸びていた。旧シーズンのページでは
 * 逆に縮むことになるが、そちらを少数側として受け入れる。
 */
export default function Loading() {
  return <CityleagueResultDetailSkeleton withDeckArchetype />;
}
