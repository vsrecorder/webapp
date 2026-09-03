import Link from "next/link";

import { LuChevronRight } from "react-icons/lu";

import { formatEventDate } from "@app/utils/cityleague";

export type ChampionsleagueLeagueListItem = {
  href: string;
  // 「マスターリーグ」など
  title: string;
  date: Date;
  resultCount: number;
  // 「○○デッキ（△△選手）」。デッキの内訳が取れなかったときは選手名だけ
  winner?: string;
};

type Props = {
  items: ChampionsleagueLeagueListItem[];
};

// 大会ページの区分一覧。区分名だけの羅列にせず優勝デッキを添えるのは、
// この一覧が「何のデッキが勝ったか」に答える唯一の場所になるため
// （区分ページを開くまで分からないと、ハブとして検索結果に出す価値が無い）。
export default function ChampionsleagueLeagueList({ items }: Props) {
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
              <span className="text-tiny text-default-400">
                {formatEventDate(item.date)} / 入賞{item.resultCount}名
              </span>
              {item.winner && (
                <span className="truncate text-tiny text-default-500">
                  優勝：{item.winner}
                </span>
              )}
            </span>
            <LuChevronRight className="shrink-0 text-default-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
