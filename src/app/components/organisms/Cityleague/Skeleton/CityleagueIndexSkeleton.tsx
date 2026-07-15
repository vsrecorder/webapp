import { Skeleton } from "@heroui/react";

type Props = {
  // 一覧に表示する行数のダミー。実データが返るまでの「枠」を用意する。
  rowCount?: number;
  // サブタイトル（期間表示）を持つ軸かどうか。開催月は持たないため false。
  showSubtitle?: boolean;
};

// シーズン／環境／開催月の索引ページ（CityleagueHubHeader + CityleagueIndexList）の
// ローディング中に表示するスケルトン。実ページと同じレイアウト枠に載せることで、
// データが揃った瞬間にガタつきなく差し替わる。
export default function CityleagueIndexSkeleton({
  rowCount = 8,
  showSubtitle = true,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      {/* CityleagueHubHeader 相当 */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 rounded-md" />

        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>

      {/* CityleagueIndexList 相当 */}
      <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
        {Array.from({ length: rowCount }).map((_, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2 px-3 py-3"
          >
            <span className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              {showSubtitle && <Skeleton className="h-3 w-52 rounded-md" />}
            </span>
            <Skeleton className="h-4 w-10 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
