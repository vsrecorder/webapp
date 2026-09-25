import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

export default function CityleagueEventSkeleton() {
  return (
    <div className="">
      <Card className="pt-3 w-full">
        <CardHeader className="pt-2.5 pb-1 px-3 flex-col items-start gap-1.5">
          <small className="text-default-500">
            <Skeleton className="h-4 w-44" />
          </small>

          <div className="font-bold text-tiny">
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="font-bold text-medium">
            <Skeleton className="h-5 w-50" />
          </div>

          {/* 実体(CityleagueEventCard)と同じく1行に収める。折り返すと、幅 320px では
              3つの合計幅が収まらず2行になり、骨格だけ 24px 高くなっていた */}
          <div className="pt-0 pb-1 flex flex-nowrap items-start gap-1 overflow-hidden">
            <Skeleton className="h-5 w-12 rounded-2xl" />
            <Skeleton className="h-5 w-21 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-2xl" />
          </div>
        </CardHeader>
        <CardBody className="px-0 py-1"></CardBody>
        <CardFooter className="pt-1 pb-2"></CardFooter>
      </Card>
    </div>
  );
}
