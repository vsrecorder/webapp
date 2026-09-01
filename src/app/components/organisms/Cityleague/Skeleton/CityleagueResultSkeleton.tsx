import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

/*
 * 一覧(CityleagueResults)の1件ぶん。実体(CityleagueResult)と同じ
 * 「イベントヘッダー＋公式サイトアイコン＋入賞カード＋詳細ページ導線」の枠に合わせる。
 *
 * 各行の高さは実体をブラウザで実測した行ボックスに合わせてある(390px 幅で計測)。
 * 実体の見出し類はインラインテキストなので、行は親の strut(16px/1.5 = 24px)や
 * 自身の line-height ぶんの高さを取る。Skeleton はブロック要素でこの分を持たないため、
 * 同じ高さの枠を用意してからバーを入れないと骨格のほうが縮む。
 */
export function CityleagueResultSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-0 pb-0 px-3 flex-col items-start gap-0.5">
          {/* 両端配置 */}
          <div className="flex items-center justify-between w-full">
            <div>
              {/* イベント名。実体は <small> のインラインテキストで、行は親の strut ぶん 24px。
                  幅はスケジュール名の実測 166.5px に合わせる */}
              <div className="h-6 flex items-center">
                <Skeleton className="h-4 w-42 rounded-md" />
              </div>

              {/* 開催日。実体は text-tiny の1行 = 16px。
                  幅は「2026年5月16日(水)」相当の 104px */}
              <div className="h-4 flex items-center">
                <Skeleton className="h-3 w-26 rounded-md" />
              </div>

              {/* 店舗名。実体は pt-1 pb-1 + text-[0.8125rem] の行(13px×1.5 = 19.5px)で 27.5px。
                  幅は実データの中央値 143px。px はルート16px時 */}
              <div className="pt-1 pb-1">
                <div className="h-[1.21875rem] flex items-center">
                  <Skeleton className="h-3.5 w-36 rounded-md" />
                </div>
              </div>

              {/* 都道府県・リーグ区分・環境のチップ。
                  幅は実測(48.8px / 86.6px / 115.5px)に合わせる */}
              <div className="flex flex-wrap items-start gap-1 pt-0.5">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-6 w-22 rounded-md" />
                <Skeleton className="h-6 w-29 rounded-md" />
              </div>
            </div>

            {/* 公式サイトの結果ページへのアイコンリンク */}
            {/*
              実体は inline-flex の <a> なので、包む div は 42px の行ボックスになり、
              アイコン(36px)はその上端に載る。ここを 36px の枠にすると、
              items-center による中央寄せの結果が 3px ずれる。

              位置合わせに transform を使うと、iOS Safari で
              「角丸(overflow:hidden)の内側にシマーの transform アニメを持つ子」が
              transform 祖先の下に来て、角丸コーナーが黒く合成されるバグを踏む。
              見た目は同じまま、GPU合成レイヤーを作らない relative オフセットで逃がす。
            */}
            <div className="relative z-0 shrink-0 left-1 -top-5 h-10.5">
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-0 py-1">
          {/* Swiper のスライド（px-2 pt-2 pb-10：ドット分の下余白を含む）1枚ぶん */}
          <div className="px-2 pt-2 pb-10">
            <CityleagueResultCardSkeleton />
          </div>
        </CardBody>
        <CardFooter className="pt-1 pb-2">
          {/* 「このイベント結果の詳細ページを見る」。実体はインラインの <a> なので、
              行は親の strut ぶん 24px。幅はリンク＋アンカーアイコンの実測 223.8px */}
          <div className="h-6 flex items-center">
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export function CityleagueResultSkeletons() {
  return (
    <>
      <CityleagueResultSkeleton />
      <CityleagueResultSkeleton />
    </>
  );
}
