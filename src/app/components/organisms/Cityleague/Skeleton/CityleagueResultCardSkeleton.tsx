import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

type Props = {
  // 実体(CityleagueResultCard)と同じく、順位ごとの見出しを持つ場所では
  // カード側の順位ラベルを出さない。
  showRankLabel?: boolean;
};

export default function CityleagueResultCardSkeleton({ showRankLabel = true }: Props) {
  return (
    <Card shadow="sm" className="w-full border-2 border-default-100">
      {/* ヘッダー：順位タグの右隣にプレイヤー情報（アイコン・名前・ID）を横並び */}
      <CardHeader className="flex items-center gap-2 px-3 pt-3 pb-0">
        {/* 順位タグ */}
        {showRankLabel && <Skeleton className="h-7 w-20 shrink-0 rounded-full" />}

        {/* プレイヤー情報 */}
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-3 pb-3 pt-2">
        {/* デッキ画像 */}
        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}
