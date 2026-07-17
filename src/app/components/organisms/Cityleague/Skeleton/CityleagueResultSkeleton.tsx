import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

// 一覧(CityleagueResults)の1件ぶん。実体(CityleagueResult)と同じ
// 「イベントヘッダー＋公式サイトアイコン＋入賞カード＋詳細ページ導線」の枠に合わせる。
export function CityleagueResultSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-0 pb-0 px-3 flex-col items-start gap-0.5">
          {/* 両端配置 */}
          <div className="flex items-center justify-between w-full">
            <div>
              {/* イベント名 */}
              <Skeleton className="h-4 w-44 rounded-md" />

              {/* 開催日 */}
              <div className="pt-1">
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>

              {/* 店舗名 */}
              <div className="pt-1 pb-1">
                <Skeleton className="h-3.5 w-48 rounded-md" />
              </div>

              {/* 都道府県・リーグ区分・環境のチップ */}
              <div className="flex flex-wrap items-start gap-1 pt-0.5">
                <Skeleton className="h-6 w-14 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
              </div>
            </div>

            {/* 公式サイトの結果ページへのアイコンリンク */}
            {/*
              位置合わせに transform を使うと、iOS Safari で
              「角丸(overflow:hidden)の内側にシマーの transform アニメを持つ子」が
              transform 祖先の下に来て、角丸コーナーが黒く合成されるバグを踏む。
              見た目は同じまま、GPU合成レイヤーを作らない relative オフセットで逃がす。
            */}
            <div className="relative z-0 shrink-0 left-1 -top-5">
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-0 py-1">
          {/* Swiper のスライド（p-2）1枚ぶん */}
          <div className="p-2">
            <CityleagueResultCardSkeleton />
          </div>
        </CardBody>
        <CardFooter className="pt-1 pb-2">
          {/* このイベント結果の詳細ページを見る */}
          <Skeleton className="h-4 w-56 rounded-md" />
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
