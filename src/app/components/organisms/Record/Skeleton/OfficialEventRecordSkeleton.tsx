import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export function OfficialEventRecordSkeleton() {
  return (
    <div className="pb-3 w-full">
      <Card shadow="sm" className="py-3 w-full">
        <CardHeader className="px-5 pb-0 pt-0 flex-col items-start gap-1.5">
          <div className="font-bold text-tiny">
            <Skeleton className="h-4 w-26" />
          </div>
          <div className="font-bold truncate w-full min-w-0">
            <Skeleton className="h-6 w-60" />
          </div>
        </CardHeader>
        <CardBody className="px-7 py-3">
          <div className="flex items-center gap-5">
            <Skeleton className="h-22 w-22 shrink-0" />

            <div className="flex flex-col gap-1.5 truncate w-full min-w-0">
              <div className="font-bold text-tiny w-full min-w-0">
                <Skeleton className="h-4 w-50" />
              </div>
              <div className="font-bold truncate w-full min-w-0">
                <Skeleton className="h-4 w-62" />
              </div>
              <div className="font-bold text-tiny w-full min-w-0">
                <Skeleton className="h-4 w-50" />
              </div>
              <div className="font-bold truncate w-full min-w-0">
                <Skeleton className="h-4 w-62" />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function OfficialEventRecordSkeletons() {
  return (
    <>
      <OfficialEventRecordSkeleton />
      <OfficialEventRecordSkeleton />
      <OfficialEventRecordSkeleton />
    </>
  );
}
