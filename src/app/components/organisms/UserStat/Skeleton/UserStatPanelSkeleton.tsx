"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

/*
 * UserStatPanel のスケルトン。実パネルと同じ順序・同じ高さで骨格を組み、
 * 入れ替わったときにカードの高さが変わらないようにする。
 *
 * 各行の高さはブラウザで実測した値。Tailwind の text-* は行の高さも一緒に決めるため
 * (text-xs=16px / text-xl=28px / text-4xl=40px)、文字の大きさから素直に出せない。
 * 一方、行の高さを持たない任意値(text-[0.625rem] など)は継承した 1.5 倍になる(10px→15px)。
 */
// 統計セル(対戦記録・イベント種別・試合数・勝敗)1つぶんの骨格。
// 実セルは p-3 + ラベル15px + gap-0.5 + 数値28px = 69px。
function StatCellSkeleton() {
  return (
    <div className="flex flex-col gap-0.5 items-center p-3 rounded-xl bg-default-100">
      <Skeleton className="h-[0.9375rem] w-12 rounded-full" />
      <Skeleton className="h-7 w-10 rounded-full" />
    </div>
  );
}

export default function UserStatPanelSkeleton() {
  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* レギュレーション区分の絞り込み(中のボタンが py-2 leading-4 + 枠で34px、
            外枠の p-1 と枠を足して44px) */}
        <Skeleton className="h-11 w-full rounded-xl" />

        {/* フィルタータブ(HeroUI Tabs。tab の h-7 に tabList の p-1 を足して36px) */}
        <Skeleton className="h-9 w-full rounded-xl" />

        {/* セレクタ(text-sm の行20px + py-2.5 + 枠で42px) */}
        <Skeleton className="h-[2.625rem] w-full rounded-xl" />

        {/* 期間ラベル(text-xs の行16px) */}
        <div className="flex justify-center -mt-2">
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>

        {/* 対戦記録 */}
        <StatCellSkeleton />

        {/* 公式イベント / Tonamel / 自由形式 */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <StatCellSkeleton key={i} />
          ))}
        </div>

        {/* 試合数 / 勝利 / 敗北 */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <StatCellSkeleton key={i} />
          ))}
        </div>

        {/* 勝率(ラベル15px + gap-0.5 + 数値40px = 57px) */}
        <div className="flex flex-col items-center gap-0.5">
          <Skeleton className="h-[0.9375rem] w-10 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>

        {/* 不戦勝・不戦敗の除外トグル
            (アイコン14pxより文言の行15pxが高く、py-1.5 と合わせて27px) */}
        <Skeleton className="h-[1.6875rem] w-full rounded-xl" />
      </CardBody>
    </Card>
  );
}
