import BackLink from "@app/components/molecules/BackLink";

type Props = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  count: number;
  // 件数の前に置く語。既定はシティリーグの索引向けの文言。
  // 大型大会の索引では「結果が登録された大会」のように差し替える。
  countLabel?: string;
};

export default function CityleagueHubHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  count,
  countLabel = "結果が登録されたシティリーグ",
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 検索から直接開かれるページなので、上位階層への導線を先頭に置く */}
      <BackLink href={backHref} label={backLabel} />

      <div className="flex flex-col gap-1">
        <span className="font-bold text-tiny text-primary">{eyebrow}</span>
        <h1 className="font-black text-xl leading-snug text-default-800">{title}</h1>
        {subtitle && <p className="text-tiny text-default-400">{subtitle}</p>}
        <p className="text-tiny text-default-500">
          {countLabel} {count}件
        </p>
      </div>
    </div>
  );
}
