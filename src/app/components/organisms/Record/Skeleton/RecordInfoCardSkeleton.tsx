import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

/*
 * RecordInfoCardBase と同じ骨格のローディングスケルトン。
 * 公式/Tonamel/自由形式の全詳細カードで共有する。
 */
export default function RecordInfoCardSkeleton() {
  return (
    <Card shadow="sm" className="w-full overflow-hidden">
      <CardBody className="p-0">
        {/* ヒーローヘッダー(縦積み・中央寄せ) */}
        <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-5">
          {/* ヒーローアイコン */}
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />

          {/* 開催日・タイトル・チップ */}
          <div className="flex flex-col items-center gap-2 w-full">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-6 w-48 rounded-md" />
            <div className="flex justify-center gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
