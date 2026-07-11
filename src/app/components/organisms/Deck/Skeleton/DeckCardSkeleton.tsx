import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import DeckCodeCardSkeleton from "@app/components/organisms/Deck/Skeleton/DeckCodeCardSkeleton";

export function DeckCardSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-0 pb-0 px-3">
          <div className="flex flex-col gap-1 w-full">
            {/* 両端配置 */}
            <div className="flex items-start justify-between w-full">
              {/* 左側 */}
              <div className="flex items-center gap-0 shrink-0">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <Skeleton className="h-11 w-11 rounded-2xl" />
              </div>

              {/* 右側：登録日＋バージョン件数バッジ */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Skeleton className="h-3.5 w-20 rounded-lg" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>

            <div className="font-bold text-large w-full">
              <Skeleton className="h-7 w-44 rounded-lg" />
            </div>

            {/* 対戦成績・先攻後攻パネル（左：勝率、右：先攻後攻グリッドの2分割構造に合わせる） */}
            <div className="flex items-stretch rounded-xl bg-default-100 overflow-hidden">
              <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-5 py-3 min-w-0">
                <Skeleton className="h-2.5 w-6 rounded" />
                <Skeleton className="h-4 w-10 rounded" />
                <Skeleton className="h-2.5 w-14 rounded" />
              </div>
              <div className="flex-[1.7] flex flex-col justify-center gap-1.5 px-3 py-3 border-l border-default-200 min-w-0">
                <Skeleton className="h-2.5 w-full rounded" />
                <Skeleton className="h-2.5 w-full rounded" />
                <Skeleton className="h-2.5 w-full rounded" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-3 py-2">
          <DeckCodeCardSkeleton />
        </CardBody>
      </Card>
    </div>
  );
}

export function DeckCardSkeletons() {
  return (
    <>
      <DeckCardSkeleton />
      <DeckCardSkeleton />
    </>
  );
}
