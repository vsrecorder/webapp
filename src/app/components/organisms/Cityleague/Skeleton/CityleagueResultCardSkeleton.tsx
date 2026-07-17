import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Skeleton } from "@heroui/react";

type Props = {
  // 実体(CityleagueResultCard)と同じく、順位ごとの見出しを持つ場所では
  // カード側の順位ラベルを出さない。
  showRankLabel?: boolean;
};

export default function CityleagueResultCardSkeleton({ showRankLabel = true }: Props) {
  return (
    <Card shadow="sm" className="py-3 w-full border-3 border-default-100">
      {showRankLabel && (
        <CardHeader className="pb-0 pt-0 px-3">
          {/* 順位ラベル（🥇 優勝 など） */}
          <Skeleton className="h-6 w-20 rounded-md" />
        </CardHeader>
      )}
      <CardBody className="p-3 gap-3">
        {/* プレイヤー名・プレイヤーID */}
        <div className="flex flex-col items-start gap-1.5">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-3.5 w-36 rounded-md" />
        </div>

        {/* デッキ画像 */}
        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </CardBody>
      <CardFooter />
    </Card>
  );
}
