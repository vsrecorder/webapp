import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export default function DeckCodeCardSkeleton() {
  return (
    <Card shadow="sm" className="py-3 w-full">
      <CardHeader className="pt-0 pb-1 px-3">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-base">
            <Skeleton className="h-6 w-46" />
          </div>
          <div className="pl-1 flex flex-col gap-0.5">
            <div className="text-tiny">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="text-tiny">
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="px-2 py-1">
        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </CardBody>
      {/*
      <CardFooter>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
          </div>
        </div>
      </CardFooter>
      */}
    </Card>
  );
}
