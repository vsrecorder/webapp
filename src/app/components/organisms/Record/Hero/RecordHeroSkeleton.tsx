import { Card, Skeleton } from "@heroui/react";

import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";

/*
 * RecordHero のローディングスケルトン。実態に合わせて
 * 左アクセントバー／「左：日付・画像＋タイトル・チップ、右：勝率リング＋勝敗数」／
 * 下段の「使用デッキ」「対戦結果」まで骨格を表示する。
 */
export default function RecordHeroSkeleton() {
  return (
    <Card shadow="sm" className="relative w-full overflow-hidden bg-content1">
      {/* アクセント枠線(実態はカード外周全体の枠線。種別色は取得後に決まるため
          スケルトンではニュートラル色で表示する) */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-[3px] border-default-300" />

      <div className="px-4.5 py-4.5">
        {/* 上段：イベント情報＋勝率リング＋勝敗数 */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-24 rounded-md" />
            <div className="mt-1.5 flex items-center gap-2.5">
              <Skeleton className="h-11.25 w-11.25 shrink-0 rounded-xl" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-21.5 w-21.5 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
        </div>

        {/* 使用デッキ(見出しは左上／大きめスプライト＋デッキ名＋編集ボタンのバンド) */}
        <div className="mt-3.5 flex w-full flex-col gap-1.5">
          <Skeleton className="h-2.5 w-12 rounded" />
          <div className="pl-6 flex w-full items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40 max-w-full rounded-md" />
            </div>
            <div className="flex w-21.5 shrink-0 justify-center">
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>

        {/* 対戦結果(実態と同じく不透明パネル内に対戦行スケルトンを表示する) */}
        <div className="mt-3.5 flex w-full flex-col gap-1.5 border-t border-divider pt-3">
          <Skeleton className="h-2.5 w-12 rounded" />
          <div className="overflow-hidden rounded-xl border border-divider bg-content1">
            <MatchSkeleton enableCreateMatchModalButton={false} flat />
          </div>
        </div>
      </div>
    </Card>
  );
}
