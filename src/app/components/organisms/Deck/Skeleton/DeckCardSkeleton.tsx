import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import DeckCodeCardSkeleton from "@app/components/organisms/Deck/Skeleton/DeckCodeCardSkeleton";

export function DeckCardSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-0 pb-0 px-3">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-large">
              <Skeleton className="h-7 w-44" />
            </div>
            <div className="pl-1">
              <div className="text-tiny">
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-2 py-2">
          <DeckCodeCardSkeleton />
        </CardBody>
      </Card>
    </div>
  );
}

export function DeckCardSkeletons() {
  return (
    <>
      <DeckCardSkeleton />
      <DeckCardSkeleton />
    </>
  );
}
