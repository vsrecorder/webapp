import { Skeleton } from "@heroui/react";

type Props = {
  // 日付グループの数と、各グループの行数のダミー。実データが返るまでの「枠」を用意する。
  groupCount?: number;
  rowsPerGroup?: number;
};

// シーズン／環境／開催月の詳細ページ（CityleagueHubHeader + CityleagueEventLinkList）の
// ローディング中に表示するスケルトン。一覧は開催日ごとにグルーピングされるため、
// 見出し＋店舗行のまとまりを数グループぶん並べて実ページの見た目に寄せる。
export default function CityleagueEventListSkeleton({
  groupCount = 4,
  rowsPerGroup = 4,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      {/* CityleagueHubHeader 相当 */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 rounded-md" />

        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-6 w-64 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>

      {/* CityleagueEventLinkList 相当（開催日ごとのグループ） */}
      <div className="flex flex-col gap-5">
        {Array.from({ length: groupCount }).map((_, groupIndex) => (
          <section key={groupIndex} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2 px-0.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
            </div>

            <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
              {Array.from({ length: rowsPerGroup }).map((_, rowIndex) => (
                <li
                  key={rowIndex}
                  className="flex items-center justify-between gap-2 px-3 py-2.5"
                >
                  {/* 店舗名 / 都道府県・リーグ区分 */}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <Skeleton className="h-4 w-44 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </span>

                  {/* 詳細ページへのシェブロン */}
                  <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
