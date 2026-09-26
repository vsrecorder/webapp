import { Skeleton } from "@heroui/react";

import CityleagueHubHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueHubHeaderSkeleton";

type Props = {
  // 一覧に表示する行数のダミー。実データが返るまでの「枠」を用意する。
  rowCount?: number;
  // サブタイトル（期間表示）を持つ軸かどうか。開催月・開催日は持たないため false。
  showSubtitle?: boolean;
  /*
   * 見出しで区切ったグループごとの行数。開催日の索引は開催月ごとに見出しを立てて区切るので、
   * その形の骨格にする。指定が無ければ区切らず rowCount 行の一覧を1つ置く。
   */
  groupRowCounts?: number[];
  // 見出し(CityleagueHubHeader)に補足行(subtitle)があるか。大型大会の索引は持つ
  showHeaderSubtitle?: boolean;
};

// 行の中身。実体(CityleagueIndexList)の行は py-3 + タイトル(text-small の行 20px)
// ＋ 補足(text-tiny の行 16px、gap-0.5)。区切り線 1px を含めて 45px / 63px(390px 幅の実測)。
// バーの高さだけで組むと 41px / 59px になり、行数ぶんずれていた。
function IndexRows({ count, showSubtitle }: { count: number; showSubtitle: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="flex items-center justify-between gap-2 px-3 py-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex h-5 items-center">
              <Skeleton className="h-4 w-40 rounded-md" />
            </span>
            {showSubtitle && (
              <span className="flex h-4 items-center">
                <Skeleton className="h-3 w-52 rounded-md" />
              </span>
            )}
          </span>

          {/* 件数＋シェブロン */}
          <span className="flex shrink-0 items-center gap-1">
            <Skeleton className="h-3 w-8 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-md" />
          </span>
        </li>
      ))}
    </ul>
  );
}

// シーズン／環境／開催月／開催日／大型大会の索引ページ（CityleagueHubHeader + CityleagueIndexList）の
// ローディング中に表示するスケルトン。実ページと同じレイアウト枠に載せることで、
// データが揃った瞬間にガタつきなく差し替わる。
export default function CityleagueIndexSkeleton({
  rowCount = 8,
  showSubtitle = true,
  groupRowCounts,
  showHeaderSubtitle = false,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      {/* 索引ページのタイトルは短く1行。戻るリンクは「シティリーグ結果」で実測 155px */}
      <CityleagueHubHeaderSkeleton
        titleLineWidths={["w-48"]}
        showSubtitle={showHeaderSubtitle}
        backLinkWidthClass="w-40"
      />

      {groupRowCounts ? (
        groupRowCounts.map((count, groupIndex) => (
          // 実体の月の見出しは h2 の text-small(行 20px)、一覧との間は gap-1.5
          <section key={groupIndex} className="flex flex-col gap-1.5">
            <div className="flex h-5 items-center px-0.5">
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <IndexRows count={count} showSubtitle={showSubtitle} />
          </section>
        ))
      ) : (
        <IndexRows count={rowCount} showSubtitle={showSubtitle} />
      )}
    </div>
  );
}
