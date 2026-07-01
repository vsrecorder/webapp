import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

const WEEKDAY_COUNT = 7;
// カレンダーグリッドは常に6週(42セル)固定で描画されるため、スケルトンも合わせる
const CALENDAR_CELL_COUNT = 42;
const LEGEND_ITEM_COUNT = 4;

// DashboardCalendar と同じ骨格のローディングスケルトン
export function DashboardCalendarSkeleton() {
  return (
    <Card shadow="none" className="border border-divider">
      <CardHeader className="flex items-center justify-between px-2 pt-3 pb-1">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardBody className="px-3 pb-3 pt-1">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: WEEKDAY_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-3.5 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: CALENDAR_CELL_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>

        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap justify-center pt-3">
          {Array.from({ length: LEGEND_ITEM_COUNT }).map((_, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
