import { Skeleton } from "@heroui/react";

import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

// 開催日ページの Suspense 境界。見出し(CityleagueHubHeader)・リーグのタブ・結果カードの骨格。
// 索引側の loading.tsx は (index) グループに閉じてあるので、ここには継承されない。
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      {/* CityleagueHubHeader 相当(戻るリンクはピル型で高さ 2rem) */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* リーグのタブ(Tabs size="sm" の tab h-8 と tabList の余白) */}
        <Skeleton className="h-10 w-full rounded-medium" />
        <CityleagueResultSkeletons />
      </div>
    </div>
  );
}
