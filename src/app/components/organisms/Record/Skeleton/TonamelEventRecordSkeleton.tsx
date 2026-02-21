import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export function TonamelEventRecordSkeleton() {
  return (
    <div className="">
      <Card shadow="sm" className="py-3 w-full">
        <CardHeader className="px-5 pb-0 pt-0 flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-3 w-full">
            <div className="font-bold text-tiny">
              <Skeleton className="h-4 w-26" />
            </div>

            <div className="font-bold text-tiny w-full min-w-0">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <div className="font-bold truncate w-full min-w-0">
            <Skeleton className="h-6 w-82" />
          </div>
        </CardHeader>
        <CardBody className="px-7 py-3 pt-5">
          <div className="relative w-full flex justify-center">
            <Skeleton className="h-36 w-[256px] object-contain" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function TonamelEventRecordSkeletons() {
  return (
    <>
      <TonamelEventRecordSkeleton />
      <TonamelEventRecordSkeleton />
    </>
  );
}
