import Link from "next/link";

import { LuChevronRight } from "react-icons/lu";

import { formatEventDate } from "@app/utils/cityleague";

export type ChampionsleagueLeagueListItem = {
  href: string;
  // 「マスターリーグ」など
  title: string;
  /*
   * 開催日ごとの内訳。
   *
   * シニア・ジュニアは1日目と2日目が別々の大会として開かれることがあり、そのとき
   * ここが2件になる。区分ページのURLは区分に1つなので行は1つにまとめ、
   * 中で日ごとに分けて見せる（1日ぶんだけ載せると、もう一方の結果が一覧から消える）。
   */
  days: {
    // 同じ日に2イベントある大会があるため、キーは開催日ではなくイベントIDで持つ
    officialEventId: number;
    date: Date;
    resultCount: number;
    // 「○○デッキ（△△選手）」。デッキの内訳が取れなかったときは選手名だけ
    winner?: string;
  }[];
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

              {/* 日が1つなら従来どおり1行ぶん。2日に分かれた区分だけ縦に伸びる */}
              <span className="flex min-w-0 flex-col gap-1.5">
                {item.days.map((day) => (
                  <span
                    key={day.officialEventId}
                    className="flex min-w-0 flex-col gap-0.5"
                  >
                    <span className="text-tiny text-default-400">
                      {formatEventDate(day.date)} / 入賞{day.resultCount}名
                    </span>
                    {day.winner && (
                      <span className="truncate text-tiny text-default-500">
                        優勝：{day.winner}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            </span>
            <LuChevronRight className="shrink-0 text-default-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
