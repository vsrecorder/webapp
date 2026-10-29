import CityleagueHubHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueHubHeaderSkeleton";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

// 開催日ページの Suspense 境界。見出し・リーグのタブ・結果カード(CityleagueDateEventTabs)の枠に合わせる。
// 索引側の loading.tsx は (index) グループに閉じてあるので、ここには継承されない。
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      <CityleagueHubHeaderSkeleton titleLineWidths={["w-48", "w-64"]} backLinkWidthClass="w-36" />

      <div className="flex flex-col gap-3">
        {/* リーグのタブ(HeroUI Tabs size="sm" の列は 36px) */}
        <div className="h-9 w-full rounded-medium bg-default-100 animate-pulse" />

        <div className="flex flex-col w-full gap-3">
          <CityleagueResultSkeletons />
        </div>
      </div>
    </div>
  );
}
