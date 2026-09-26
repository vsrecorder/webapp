import { Card, CardBody, CardHeader, Skeleton } from "@heroui/react";

import CityleagueHubHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueHubHeaderSkeleton";

// /cityleague_results/championsleagues/[id] の Suspense 境界。
//
// このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
// 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
// つまりこのファイルが無いと、大会一覧からタップしてもサーバの描画が終わるまで
// 画面が前のページのまま固まる。
//
// 中身は実体(page.tsx)と同じ「見出し → 概要カード → リーグ区分の一覧」。
// 以前は汎用の索引の骨格を使っていて概要カードが無く、区分の行も低かったため、
// 切り替わった瞬間に一覧が 243px 下へずれていた(390px 幅の実測)。
// 高さは 2023〜2024 年の10大会の実測(どれも同じ値)に合わせてある:
//   見出し 129.5px(タイトル1行＋会期)・概要カード 201px(要約文6行)・区分の行 81px × 3
//
// 置き場所が (index) グループなのは、この骨格を索引ページだけに効かせるため。
// 直下に置くと詳細ページ(子セグメント)にも継承され、詳細側が自前の loading.tsx を
// 持っていても打ち消せない(子のツリーが組み上がるまで外側のこの境界が使われるため、
// 索引の骨格が先に出てから詳細の骨格に差し替わる)。

// 区分の数。多くの大会でマスター・シニア・ジュニアの3件
const LEAGUE_ROW_COUNT = 3;

// 要約文の行数(text-tiny / leading-relaxed の1行 19.5px)
const DESCRIPTION_LINES = 6;

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      {/* 戻るリンクは「大型大会の結果一覧」 */}
      <CityleagueHubHeaderSkeleton
        titleLineWidths={["w-72"]}
        showSubtitle
        backLinkWidthClass="w-40"
      />

      {/* 概要カード(会場のチップ・要約文・入賞人数) */}
      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 px-3 py-3">
          <Skeleton className="h-6 w-44 rounded-md" />
        </CardHeader>
        <CardBody className="gap-2 px-3 pt-0 pb-3">
          <div className="flex flex-col">
            {Array.from({ length: DESCRIPTION_LINES }).map((_, index) => (
              <div key={index} className="flex h-[1.21875rem] items-center">
                <Skeleton
                  className={`h-3 rounded-md ${index === DESCRIPTION_LINES - 1 ? "w-2/5" : "w-full"}`}
                />
              </div>
            ))}
          </div>
          <div className="flex h-4 items-center">
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </CardBody>
      </Card>

      {/* リーグ区分の一覧(区分名 → 開催日・入賞数 → 優勝デッキ) */}
      <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
        {Array.from({ length: LEAGUE_ROW_COUNT }).map((_, index) => (
          <li key={index} className="flex items-center justify-between gap-2 px-3 py-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex h-5 items-center">
                <Skeleton className="h-4 w-28 rounded-md" />
              </span>
              <span className="flex h-4 items-center">
                <Skeleton className="h-3 w-36 rounded-md" />
              </span>
              <span className="flex h-4 items-center">
                <Skeleton className="h-3 w-56 rounded-md" />
              </span>
            </span>
            <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
