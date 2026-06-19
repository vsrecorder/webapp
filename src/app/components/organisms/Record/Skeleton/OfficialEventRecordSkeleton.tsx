import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export function OfficialEventRecordSkeleton() {
  return (
    <div>
      <Card shadow="none" className="border border-divider overflow-hidden">
        <CardBody className="p-0">
          <div className="flex">
            <Skeleton className="w-1 shrink-0 rounded-none" />
            <div className="flex-1 px-4 py-3.5">
              {/* 日付 */}
              <Skeleton className="h-3.5 w-28 rounded-md" />
              {/* タイトル */}
              <Skeleton className="h-5 w-48 rounded-md mt-0.5" />
              {/* イベント種別バッジ + 環境バッジ */}
              <div className="flex items-center gap-2 mt-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              {/* 区切り線 */}
              <div className="border-t border-divider mt-3 mb-2.5" />
              {/* 情報行 */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MonthHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 pt-1 pb-0.5">
      <Skeleton className="h-3.5 w-14 rounded-md shrink-0" />
      <div className="flex-1 h-px bg-divider" />
    </div>
  );
}

export function OfficialEventRecordSkeletons() {
  return (
    <>
      <MonthHeaderSkeleton />
      <OfficialEventRecordSkeleton />
      <OfficialEventRecordSkeleton />
      <MonthHeaderSkeleton />
      <OfficialEventRecordSkeleton />
    </>
  );
}
