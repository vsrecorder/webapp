import Link from "next/link";

import { LuChevronRight } from "react-icons/lu";

export type CityleagueIndexItem = {
  href: string;
  title: string;
  subtitle?: string;
  count: number;
};

type Props = {
  items: CityleagueIndexItem[];
  // 件数の単位。既定は「件」。大型大会の索引ではリーグ区分を数えるため「区分」を渡す。
  countUnit?: string;
};

// シーズン／環境／年月の索引ページで共通に使う一覧。
export default function CityleagueIndexList({ items, countUnit = "件" }: Props) {
  return (
    <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center justify-between gap-2 px-3 py-3 hover:bg-default-50"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-bold text-small">{item.title}</span>
              {item.subtitle && (
                <span className="text-tiny text-default-400">{item.subtitle}</span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="font-bold text-tiny text-default-500">
                {item.count}
                {countUnit}
              </span>
              <LuChevronRight className="text-default-300" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
