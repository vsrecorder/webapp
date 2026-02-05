import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import DeckCodeCardSkeleton from "@app/components/organisms/Deck/DeckCodeCardSkeleton";

export default function DeckCardSkeleton() {
  return (
    <Card className="pt-3 w-full">
      <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-medium pb-1">
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="text-tiny">
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </CardHeader>
      <CardBody className="px-2 py-2">
        <DeckCodeCardSkeleton />
      </CardBody>
    </Card>
  );
}
