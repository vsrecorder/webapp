import { Skeleton } from "@heroui/react";

type Props = {
  /*
   * タイトル(h1)の各行のバーの幅。行数もこれで決まる。
   * 個別ページのタイトルは「2026年9月26日(土)の / シティリーグ入賞デッキ一覧」のように
   * 「の」の後ろで改行して2行で出す(CityleagueHubHeader の titleLines)ので、
   * 各行の実測幅に近いバーを置く。既定は索引ページの短い1行。
   */
  titleLineWidths?: string[];
  // 期間などの補足行(subtitle)を持つか。シーズン・環境の個別ページは持つ
  showSubtitle?: boolean;
  // 戻るリンクの幅(文言の長さに合わせる)
  backLinkWidthClass?: string;
};

/*
 * CityleagueHubHeader の骨格。索引・個別の両方の骨格から使う。
 *
 * 行ごとに実体と同じ高さの枠を取ってからバーを入れる(390px 幅の実測)。
 *   - 小見出し(eyebrow)・補足・件数: text-tiny の行 16px
 *   - タイトル: text-xl / leading-snug の行 27.5px(2行なら 55px)
 * 以前はバーの高さ(h-3・h-6)だけで組んでいたため、見出しが実体より 20〜50px 低く、
 * 切り替わった瞬間に一覧がまとめて下へずれていた。
 */
export default function CityleagueHubHeaderSkeleton({
  titleLineWidths = ["w-48"],
  showSubtitle = false,
  backLinkWidthClass = "w-40",
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 実体の戻るリンク(BackLink)。ピル型で実測 34px(以前は 2rem=32px と見積もっていて 2px ずれていた) */}
      <Skeleton className={`h-[2.125rem] ${backLinkWidthClass} rounded-full`} />

      <div className="flex flex-col gap-1">
        <div className="flex h-4 items-center">
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        {/* タイトルの1行 = 27.5px(text-xl 20px × leading-snug 1.375) */}
        <div className="flex flex-col">
          {titleLineWidths.map((widthClass, index) => (
            <div key={index} className="flex h-[1.71875rem] items-center">
              <Skeleton className={`h-5 ${widthClass} rounded-md`} />
            </div>
          ))}
        </div>
        {showSubtitle && (
          <div className="flex h-4 items-center">
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
        )}
        <div className="flex h-4 items-center">
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}
