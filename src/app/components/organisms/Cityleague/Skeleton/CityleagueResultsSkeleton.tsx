import CityleagueScheduleHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueScheduleHeaderSkeleton";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

// 一覧(CityleagueResults)がマウント直後に見せる状態そのもののスケルトン。
//
// loading.tsx から使う。実体はクライアントコンポーネントで、マウント後に
// スケジュール取得 → 結果取得 と進む間この見た目になるため、外側の入れ子
// （space-y-3 pb-3 と gap-3 の列）まで実体と揃えておく。揃えないと
// loading から実体へ切り替わった瞬間に一覧全体が縦へずれる。
export default function CityleagueResultsSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      <CityleagueScheduleHeaderSkeleton />

      <div className="flex flex-col w-full gap-3">
        <CityleagueResultSkeletons />
      </div>
    </div>
  );
}
