import { Skeleton } from "@heroui/react";

export default function DeckCodeCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="rounded-xl bg-default-100 px-3 py-2.5 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-3.5 w-40 rounded-lg" />
        <Skeleton className="h-3.5 w-32 rounded-lg" />
      </div>

      <div className="relative w-full aspect-2/1">
        <Skeleton className="absolute inset-0 rounded-lg" />
      </div>
    </div>
  );
}
