import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

// DashboardCalendar と同じ骨格のローディングスケルトン
export function DashboardCalendarSkeleton() {
  return (
    <Card shadow="none" className="border border-divider">
      <CardHeader className="flex items-center justify-between px-4 pt-3 pb-1">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </CardHeader>
      <CardBody className="px-3 pb-3 pt-1">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
