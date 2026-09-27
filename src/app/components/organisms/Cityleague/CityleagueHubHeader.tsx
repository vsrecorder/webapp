import type { ReactNode } from "react";

import BackLink from "@app/components/molecules/BackLink";

type Props = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  /*
   * タイトルを行に分けて見せたいときの各行(つなぐと title と同じ文字列になるもの)。
   * 「2026年9月26日(土)の / シティリーグ入賞デッキ一覧」のように、意味の切れ目で改行する。
   * 渡さなければ title を1つの見出しとして出し、幅に任せて折り返す。
   * 行の中で改行させたくない語があるときは、その部分を whitespace-nowrap で包んだ要素を渡す。
   */
  titleLines?: ReactNode[];
  subtitle?: string;
  count: number;
  // 件数の前に置く語。既定はシティリーグの索引向けの文言。
  // 大型大会の索引では「結果が登録された大会」のように差し替える。
  countLabel?: string;
  // 戻るリンクの右端に置く操作(シェアボタンなど)。サーバコンポーネントのまま受け取るため ReactNode で渡す
  actions?: ReactNode;
};

export default function CityleagueHubHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  titleLines,
  subtitle,
  count,
  countLabel = "結果が登録されたシティリーグ",
  actions,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 検索から直接開かれるページなので、上位階層への導線を先頭に置く */}
      {actions ? (
        <div className="flex items-center justify-between gap-2">
          <BackLink href={backHref} label={backLabel} />
          {actions}
        </div>
      ) : (
        <BackLink href={backHref} label={backLabel} />
      )}

      <div className="flex flex-col gap-1">
        <span className="font-bold text-tiny text-primary">{eyebrow}</span>
        <h1 className="font-black text-xl leading-snug text-default-800">
          {titleLines
            ? titleLines.map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))
            : title}
        </h1>
        {subtitle && <p className="text-tiny text-default-400">{subtitle}</p>}
        <p className="text-tiny text-default-500">
          {countLabel} {count}件
        </p>
      </div>
    </div>
  );
}
