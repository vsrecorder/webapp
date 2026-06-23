"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export default function UserStatPanelSkeleton() {
  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* フィルタータブのスケルトン */}
        <Skeleton className="h-8 w-full rounded-xl" />

        {/* セレクタのスケルトン */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* 期間ラベルのスケルトン */}
        <div className="flex justify-center -mt-2">
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>

        {/* 統計グリッドのスケルトン */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 items-center p-3 rounded-xl bg-default-100">
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="h-7 w-10 rounded-full" />
            </div>
          ))}
        </div>

        {/* 勝率のスケルトン */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <Skeleton className="h-3 w-10 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </CardBody>
    </Card>
  );
}
