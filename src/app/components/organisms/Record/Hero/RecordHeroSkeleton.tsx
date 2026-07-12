import { Card, Skeleton } from "@heroui/react";

import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";
import {
  HERO_INFO_COL_CLASS,
  HERO_STAT_COL_CLASS,
  heroColRowStyle,
  heroStatColStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";

/*
 * RecordHero のローディングスケルトン。実態に合わせて
 * 左アクセントバー／「左：日付・画像＋タイトル・チップ、右：戦績パネル」／
 * 下段の「使用デッキ」「対戦結果」まで骨格を表示する。
 */
export default function RecordHeroSkeleton() {
  return (
    <Card shadow="sm" className="relative w-full overflow-hidden bg-content1">
      {/* アクセント枠線(実態はカード外周全体の枠線。種別色は取得後に決まるため
          スケルトンではニュートラル色で表示する) */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-[3px] border-default-300" />

      <div className="px-4.5 py-4.5">
        {/* 上段：左カラム(イベント情報＋使用デッキ)／右カラム(戦績パネル)。
            幅比・間隔は実表示と同じく heroColumns.ts から取る */}
        <div className="flex items-stretch" style={heroColRowStyle}>
          <div className={`${HERO_INFO_COL_CLASS} flex flex-col`}>
            <Skeleton className="h-3 w-24 rounded-md" />
            <div className="mt-1.5 flex items-center gap-2.5">
              <Skeleton className="h-11.25 w-11.25 shrink-0 rounded-xl" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>

            {/* 使用デッキ(左カラム最下部) */}
            <div className="mt-auto flex w-full flex-col gap-1 pt-3.5">
              <Skeleton className="h-2.5 w-12 rounded" />
              <div className="flex w-full items-center gap-2">
                <div className="flex shrink-0 items-center gap-1.5">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-24 max-w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* 戦績パネル(勝率リング＋勝敗の内訳)。実態と同じ幅比・枠線で骨格を出す */}
          <div
            style={heroStatColStyle}
            className={`${HERO_STAT_COL_CLASS} flex flex-col items-center justify-center rounded-2xl border border-divider px-2 py-2.5`}
          >
            {/* リングは実態と同じくパネル幅に追従(正方形) */}
            <Skeleton className="aspect-square w-full rounded-full" />
            <div className="mt-2.5 flex w-full justify-center gap-6 border-t border-divider pt-2.5">
              <Skeleton className="h-7 w-6 rounded-md" />
              <Skeleton className="h-7 w-6 rounded-md" />
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
