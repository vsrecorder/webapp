import { Skeleton } from "@heroui/react";

import CityleagueHubHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueHubHeaderSkeleton";

type Props = {
  // 日付グループの数と、各グループの行数のダミー。実データが返るまでの「枠」を用意する。
  groupCount?: number;
  rowsPerGroup?: number;
  /*
   * タイトル(h1)の各行のバーの幅。個別ページは「〇〇の / シティリーグ入賞デッキ一覧」の2行
   * (390px 幅の実測: 2行目は 259px。1行目は開催日 194px・開催月 117px・環境 200〜348px・
   * シーズン 285px。シーズンの2行目は「入賞デッキ一覧」で 140px)。
   */
  titleLineWidths?: string[];
  // 期間の補足行を持つか(シーズン・環境の個別ページ)
  showSubtitle?: boolean;
  // 戻るリンクの幅(「開催月から探す」など実測 128〜155px)
  backLinkWidthClass?: string;
};

// シーズン／環境／開催月／開催日の詳細ページ（CityleagueHubHeader + CityleagueEventLinkList）の
// ローディング中に表示するスケルトン。一覧は開催日ごとにグルーピングされるため、
// 見出し＋店舗行のまとまりを数グループぶん並べて実ページの見た目に寄せる。
//
// 行ごとに実体と同じ高さの枠を取ってからバーを入れる(390px 幅の実測)。
//   - 開催日の見出し: text-small の行 20px
//   - 店舗の行: py-2.5 + 店舗名(text-small 20px) + gap-0.5 + 都道府県/リーグ(text-tiny 16px)、区切り線込みで 59px
// 以前はバーの高さだけで組んでいたため行が 51px しかなく、行数ぶん実体とずれていた。
export default function CityleagueEventListSkeleton({
  groupCount = 4,
  rowsPerGroup = 4,
  titleLineWidths = ["w-48", "w-64"],
  showSubtitle = false,
  backLinkWidthClass = "w-36",
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
      <CityleagueHubHeaderSkeleton
        titleLineWidths={titleLineWidths}
        showSubtitle={showSubtitle}
        backLinkWidthClass={backLinkWidthClass}
      />

      {/* CityleagueEventLinkList 相当（開催日ごとのグループ） */}
      <div className="flex flex-col gap-5">
        {Array.from({ length: groupCount }).map((_, groupIndex) => (
          <section key={groupIndex} className="flex flex-col gap-1.5">
            <div className="flex h-5 items-center gap-2 px-0.5">
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
                    <span className="flex h-5 items-center">
                      <Skeleton className="h-4 w-44 rounded-md" />
                    </span>
                    <span className="flex h-4 items-center">
                      <Skeleton className="h-3 w-28 rounded-md" />
                    </span>
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
