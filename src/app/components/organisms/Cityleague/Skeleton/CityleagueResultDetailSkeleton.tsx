import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

// 順位セクション（優勝／準優勝／ベスト4／ベスト8）のダミー。
// 実体(CityleagueResultByOfficialEventId)の RANK_SECTIONS と同じ並びで、
// 各セクションの人数ぶんカードを並べる。
const RANK_SECTION_CARD_COUNTS = [1, 1, 2, 4];

/*
 * シティリーグ結果(個別)の骨格。
 *
 * 実体(CityleagueResultByOfficialEventId)と同じ「一覧への戻り導線＋イベントヘッダー＋
 * 順位ごとの入賞カード」の枠を見せる。
 *
 * 2か所から使う。
 *   - loading.tsx: ルートの Suspense 境界(遷移してからサーバの描画が終わるまで)
 *   - page.tsx   : デッキのカード内訳を待つ間の fallback
 * 同じ骨格を使うことで、どちらの経路でも同じ見え方になる。
 */
export default function CityleagueResultDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      {/* 一覧への戻り導線（実体と同じくヘッダー直下に sticky で置く） */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        <div className="relative flex items-center justify-between gap-2 px-2 py-2">
          {/* 実体の戻るリンク(BackLink、ピル型・実測 34px)と同じ大きさ */}
          <Skeleton className="h-[2.125rem] w-36 rounded-full" />
          {/* 右端のシェアボタン(X へのポスト・リンクのコピー、丸型 2rem) */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* イベントヘッダー */}
      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 bg-linear-to-br from-indigo-500/10 to-pink-500/10 px-3 py-3">
          {/* 両端配置 */}
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* 実体と同じ並び(イベント名 → 店舗名 → 開催日)。イベント名と店舗名は実体では h1 の中で
                  gap-0.5 で積まれている。高さは実体の行ボックスに合わせる（text-tiny=16px、
                  店舗名は pt-0.5 + text-medium/leading-snug=22px）。
                  Skeleton の高さを文字サイズそのままにすると行ぶん縮む。 */}
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-4 w-44 rounded-md" />
                <div className="pt-0.5">
                  <Skeleton className="h-[1.375rem] w-52 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>

            {/* 公式サイトの結果ページへのアイコンリンク */}
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </div>

          {/* 都道府県・リーグ区分・環境のチップ */}
          <div className="flex flex-wrap items-start gap-1">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </CardHeader>

        <CardBody className="gap-2 px-3 py-2.5">
          {/* 入賞人数・デッキコード件数 */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>

          {/* 冒頭の要約文。実体は text-tiny / leading-relaxed で、
              390px 幅では実測5行・98px(16件中15件。残り1件は4行)。
              高さを合わせるため 5本 × (h-3 + gap) で組む。 */}
          <div className="flex flex-col gap-2 py-[3px]">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/5 rounded-md" />
          </div>

          {/* 順位ごとの主なポケモンの一覧(優勝〜ベスト16 の5行)。実体は折り返しの量で
              200〜232px になる(390px 幅・16件で 200px が8件 / 216px が6件 / 232px が2件)。
              店名の折り返し(見出しが +22px)も含めた「最初の節の位置」の中央値(643px)に
              いちばん近くなる 216px(h-54)で枠を取る。以前はこのブロックが骨格に無く、
              切り替わった瞬間に順位の節が 200px 以上下へずれていた。 */}
          <div className="flex h-54 flex-col justify-between rounded-lg bg-default-100 px-3 py-3">
            {["w-3/5", "w-2/3", "w-full", "w-full", "w-full"].map((width, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-10 shrink-0 rounded-md" />
                <Skeleton className={`h-3 ${width} rounded-md`} />
              </div>
            ))}
          </div>

          {/* 公式サイトの結果ページを見る */}
          <Skeleton className="h-4 w-48 rounded-md" />
        </CardBody>
      </Card>

      {/* 順位ごとのセクション */}
      {RANK_SECTION_CARD_COUNTS.map((cardCount, sectionIndex) => (
        <section key={sectionIndex} className="flex flex-col gap-2">
          {/* 実体の見出しは text-small(行の高さ 20px)。h-5 で行の高さを揃える
              (16px だと節が1つ下がるごとに 4px ずつずれていた) */}
          <div className="flex h-5 items-center gap-2 px-0.5">
            <span className="h-4 w-1 shrink-0 rounded-full bg-default-200" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-3 w-8 rounded-md" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: cardCount }).map((_, cardIndex) => (
              <CityleagueResultCardSkeleton key={cardIndex} showRankLabel={false} withMainPokemon />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
