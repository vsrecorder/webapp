import { Card, Skeleton } from "@heroui/react";

/*
 * RecordHero のローディングスケルトン。実態に合わせて
 * 左アクセントバー／「左：日付・画像＋タイトル・チップ、右：勝率リング＋勝敗数」／
 * 下段の「勝敗の推移」「使用デッキ」まで骨格を表示する。
 */
export default function RecordHeroSkeleton() {
  return (
    <Card shadow="sm" className="relative w-full overflow-hidden bg-content1">
      {/* 左アクセントバー(種別色は取得後に決まるためスケルトンではニュートラル) */}
      <span className="absolute inset-y-0 left-0 z-10 w-1 bg-default-300" />

      <div className="px-[18px] py-[18px]">
        {/* 上段：イベント情報＋勝率リング＋勝敗数 */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-24 rounded-md" />
            <div className="mt-1.5 flex items-center gap-2.5">
              <Skeleton className="h-[45px] w-[45px] shrink-0 rounded-xl" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>
          <div className="-mr-3 flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-[86px] w-[86px] rounded-full" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
        </div>

        {/* 勝敗の推移 */}
        <div className="mt-3.5 flex flex-col gap-1.5 border-t border-divider pt-3">
          <Skeleton className="h-2.5 w-16 rounded" />
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-3.5 w-3.5 rounded-full" />
            ))}
          </div>
        </div>

        {/* 使用デッキ */}
        <div className="mt-3.5 flex items-center gap-2.5 border-t border-divider pt-3">
          <Skeleton className="mr-2 h-2.5 w-8 rounded" />
          <div className="flex shrink-0 items-center gap-0.5">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
    </Card>
  );
}
