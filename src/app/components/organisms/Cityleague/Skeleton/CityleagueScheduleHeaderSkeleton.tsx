import { Skeleton } from "@heroui/react";

/*
 * 一覧の先頭に出るスケジュール情報ヘッダー（開催中／直近の結果）のスケルトン。
 *
 * loading.tsx と CityleagueResults（スケジュール取得前の状態）の両方から使う。
 * 片方だけ直すと遷移の途中で高さが変わって一覧全体が縦へずれるため、必ずここを共有する。
 *
 * 高さ・幅は実体をブラウザで実測した値(390px 幅で全体 97px)に合わせてある。
 * 実体は border を持つので枠の 2px ぶんも透明ボーダーで確保する。
 */
export default function CityleagueScheduleHeaderSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-default-100 border border-transparent px-4 py-4 flex flex-col items-center gap-1.5">
      {/* 「開催中」/「直近の結果」ラベル(text-[10px] の行 = 15px、実測幅 55px) */}
      <div className="h-[15px] flex items-center">
        <Skeleton className="h-3 w-14 rounded-full" />
      </div>

      {/* スケジュール名(text-sm の行 = 20px、実測幅 182px) */}
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
