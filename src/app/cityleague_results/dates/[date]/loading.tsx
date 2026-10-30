"use client";

import { useParams } from "next/navigation";

import CityleagueHubHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueHubHeaderSkeleton";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

import { isDeckArchetypeDate } from "@app/utils/deckArchetype";

// 開催日ページの Suspense 境界。見出し・リーグのタブ・結果カード(CityleagueDateEventTabs)の枠に合わせる。
// 索引側の loading.tsx は (index) グループに閉じてあるので、ここには継承されない。
//
// loading.tsx は props を受け取らないので、開催日はクライアント側で URL から読む(useParams)。
// 『30th CELEBRATION』環境より前の日の大会にはデッキの種類(スプライト・デッキ名・型)が無いので、
// 骨格でもその行を取らない(取ると骨格だけに出て、実体に差し替わるとカードが縮む)
export default function Loading() {
  const { date } = useParams<{ date: string }>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      <CityleagueHubHeaderSkeleton
        titleLineWidths={["w-48", "w-64"]}
        backLinkWidthClass="w-36"
      />

      <div className="flex flex-col gap-3">
        {/* リーグのタブ(HeroUI Tabs size="sm" の列は 36px) */}
        <div className="h-9 w-full rounded-medium bg-default-100 animate-pulse" />

        <div className="flex flex-col w-full gap-3">
          <CityleagueResultSkeletons withDeckArchetype={isDeckArchetypeDate(date)} />
        </div>
      </div>
    </div>
  );
}
