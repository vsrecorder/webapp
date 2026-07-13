import Link from "next/link";

import { LuChevronRight } from "react-icons/lu";

import { OfficialEventType } from "@app/types/official_event";
import { formatEventDate } from "@app/utils/cityleague";

type Props = {
  events: OfficialEventType[];
};

// 1ページに最大700件ほど並ぶため、HeroUI ではなく素のリンクで描画してJSの負荷を抑える。
// サーバコンポーネントのままにすることで、リンクがそのままHTMLに載りクローラから辿れる。
export default function CityleagueEventLinkList({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-small text-default-400">
        この期間に結果が登録されたシティリーグはありません。
      </p>
    );
  }

  // 開催日ごとに区切る。同じ日付が何十件も繰り返されるのを避け、一覧としても読みやすくする。
  const groups = new Map<string, OfficialEventType[]>();
  for (const event of events) {
    const key = formatEventDate(event.date);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([date, eventsOfDate]) => (
        <section key={date} className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2 px-0.5">
            <h2 className="font-bold text-small text-default-700">{date}</h2>
            <span className="text-tiny text-default-400">{eventsOfDate.length}件</span>
          </div>

          <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
            {eventsOfDate.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/cityleague_results/${event.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-default-50"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold text-small">
                      {event.shop_name}
                    </span>
                    <span className="text-tiny text-default-400">
                      {event.prefecture_name} / {event.league_title}リーグ
                    </span>
                  </span>
                  <LuChevronRight className="shrink-0 text-default-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
