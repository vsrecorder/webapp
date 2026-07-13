import Link from "next/link";

import { LuChevronLeft } from "react-icons/lu";

type Props = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  count: number;
};

export default function CityleagueHubHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  count,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 検索から直接開かれるページなので、上位階層への導線を先頭に置く */}
      <Link
        href={backHref}
        className="flex w-fit items-center gap-0.5 pl-0.5 font-bold text-tiny text-default-500 hover:text-default-700"
      >
        <LuChevronLeft />
        <span>{backLabel}</span>
      </Link>

      <div className="flex flex-col gap-1">
        <span className="font-bold text-tiny text-primary">{eyebrow}</span>
        <h1 className="font-black text-xl leading-snug text-default-800">{title}</h1>
        {subtitle && <p className="text-tiny text-default-400">{subtitle}</p>}
        <p className="text-tiny text-default-500">
          結果が登録されたシティリーグ {count}件
        </p>
      </div>
    </div>
  );
}
