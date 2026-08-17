import { Skeleton } from "@heroui/react";

// 一覧の先頭に出るスケジュール情報ヘッダー（開催中／直近の結果）のスケルトン。
//
// loading.tsx と CityleagueResults（スケジュール取得前の状態）の両方から使う。
// 片方だけ直すと遷移の途中で高さが変わって一覧全体が縦へずれるため、必ずここを共有する。
export default function CityleagueScheduleHeaderSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-default-100 px-4 py-4 flex flex-col items-center gap-3">
      <Skeleton className="h-3 w-16 rounded-full" />
      <Skeleton className="h-4 w-52 rounded-lg" />
      <Skeleton className="h-3 w-36 rounded-lg" />
    </div>
  );
}
