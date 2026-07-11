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
              <div className="flex items-center gap-1.5 shrink-0">
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

            {/* 対戦成績・先攻後攻パネル */}
            <Skeleton className="h-11 w-full rounded-xl" />
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
