import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export default function CityleagueResultCardSkeleton() {
  return (
    <Card shadow="sm" className="py-3 w-full border-3 border-gray-100">
      <CardHeader className="pt-0 pb-0 px-3">
        <div className="font-bold text-medium">
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardBody className="p-3 gap-4">
        <div className="flex flex-col items-start gap-1.5">
          <div className="text-tiny">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="text-tiny">
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>

        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            <Skeleton className="h-6 w-32 rounded-2xl" />
          </div>

          <div className="flex gap-1">
            <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
