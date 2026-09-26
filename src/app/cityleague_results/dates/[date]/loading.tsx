import CityleagueEventListSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventListSkeleton";

// 開催日ページの Suspense 境界。中身は開催月ページと同じ会場の一覧(CityleagueEventLinkList)で、
// 開催日の見出しは1つだけなので、グループを1つにして行を多めに置く。
// 索引側の loading.tsx は (index) グループに閉じてあるので、ここには継承されない。
export default function Loading() {
  return <CityleagueEventListSkeleton groupCount={1} rowsPerGroup={10} />;
}
