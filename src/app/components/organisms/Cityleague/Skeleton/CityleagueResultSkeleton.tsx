import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

export function CityleagueResultSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-1 pb-2.5 px-3 flex-col items-start gap-1.5">
          <small className="text-default-500">
            <Skeleton className="h-4 w-44" />
          </small>

          <div className="font-bold text-tiny">
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="font-bold text-medium">
            <Skeleton className="h-5.5 w-50" />
          </div>

          <div className="pt-0 flex flex-wrap items-start gap-1">
            <Skeleton className="h-5 w-12 rounded-2xl" />
            <Skeleton className="h-5 w-21 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-2xl" />
          </div>
        </CardHeader>
        <CardBody className="px-2 py-1">
          <CityleagueResultCardSkeleton />
        </CardBody>
        <CardFooter className="pt-4 pb-2">
          <Skeleton className="h-4 w-56" />
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
