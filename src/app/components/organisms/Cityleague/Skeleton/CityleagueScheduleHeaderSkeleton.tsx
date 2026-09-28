import { Skeleton } from "@heroui/react";

/*
 * 一覧の先頭に出るスケジュール情報ヘッダー（開催中／直近の結果）のスケルトン。
 *
 * loading.tsx と CityleagueResults（スケジュール取得前の状態）の両方から使う。
 * 片方だけ直すと遷移の途中で高さが変わって一覧全体が縦へずれるため、必ずここを共有する。
 *
 * 実体は「開催中」ラベルの 16px 行・シーズン名の 20px 行・期間の 16px 行を gap-0.5 で積み、
 * py-2 と border の 2px を足して全体 74px(390px 幅・320px 幅とも実測で実体と一致)。
 * 実体は border を持つので枠の 2px ぶんも透明ボーダーで確保する。
 * 上の余白(mt-2。固定バーにくっつかないためのもの)も実体と揃える。
 */
export default function CityleagueScheduleHeaderSkeleton() {
  return (
    <div className="mt-2 w-full rounded-2xl bg-default-100 border border-transparent px-4 py-2 flex flex-col items-center gap-0.5">
      {/* 「開催中」ラベル(点＋文字で実測幅 47px 前後) */}
      <div className="h-4 flex items-center">
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>

      {/* シーズン名(text-sm の行 = 20px、実測幅 182px) */}
      <div className="h-5 flex items-center">
        <Skeleton className="h-4 w-46 rounded-lg" />
      </div>

      {/* 開催期間(text-xs の行 = 16px、実測幅 146px) */}
      <div className="h-4 flex items-center">
        <Skeleton className="h-3 w-36 rounded-lg" />
      </div>
    </div>
  );
}
