import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export default function DeckCodeCardSkeleton() {
  return (
    <Card shadow="sm" className="py-3">
      <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
        <div className="text-tiny">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="text-tiny">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="text-tiny">
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardBody className="px-2 py-1">
        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
