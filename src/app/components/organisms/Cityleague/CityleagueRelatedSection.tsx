import Link from "next/link";

import { LuCalendar, LuChevronRight, LuLayers, LuTrophy } from "react-icons/lu";

import { OfficialEventType } from "@app/types/official_event";
import {
  findTermByDate,
  formatEventDate,
  formatMonthKey,
  getCityleagueSeasons,
  getEnvironments,
  getRelatedCityleagueEvents,
  toMonthKey,
} from "@app/utils/cityleague";

type Props = {
  event: OfficialEventType;
};

// 同じ月の何件を並べるか。多すぎるとページ末尾がリンクの壁になるため、
// 1画面で見渡せる程度に留める。
const LIMIT = 20;

// 個別ページ同士を横に繋ぐセクション。
//
// これが無いと個別ページへの内部リンクは開催月ハブからの1本だけになり、
// クローラは1ページ辿るたびにハブへ戻る必要がある。同じ月の他会場と、
// 所属する月・シーズン・環境のハブを並べることで、個別ページ間を直接横断できる。
export default async function CityleagueRelatedSection({ event }: Props) {
  const monthKey = toMonthKey(event.date);

  const [relatedEvents, seasons, environments] = await Promise.all([
    getRelatedCityleagueEvents(event, LIMIT),
    getCityleagueSeasons(),
    getEnvironments(),
  ]);

  const season = findTermByDate(seasons, event.date);
  const environment = findTermByDate(environments, event.date);

  // 該当が見つかった軸だけ出す。シーズン・環境は期間外の日付だと引けないことがある。
  const hubs = [
    {
      href: `/cityleague_results/months/${monthKey}`,
      icon: LuCalendar,
      label: `${formatMonthKey(monthKey)}の結果`,
    },
  ];

  if (season) {
    hubs.push({
      href: `/cityleague_results/seasons/${season.id}`,
      icon: LuTrophy,
      label: season.title,
    });
  }

  if (environment) {
    hubs.push({
      href: `/cityleague_results/environments/${environment.id}`,
      icon: LuLayers,
      label: `環境『${environment.title}』`,
    });
  }

  return (
    <section className="flex flex-col gap-4 pt-6 pb-2">
      {relatedEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-0.5 font-bold text-small text-default-700">
            {formatMonthKey(monthKey)}に開催された他のシティリーグ
          </h2>

          <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
            {relatedEvents.map((related) => (
              <li key={related.id}>
                <Link
                  href={`/cityleague_results/${related.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-default-50"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold text-small">
                      {related.shop_name}
                    </span>
                    <span className="text-tiny text-default-400">
                      {formatEventDate(related.date)} / {related.prefecture_name} /{" "}
                      {related.league_title}リーグ
                    </span>
                  </span>
                  <LuChevronRight className="shrink-0 text-default-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="px-0.5 font-bold text-small text-default-700">
          まとめて結果を見る
        </h2>

        <nav className="flex flex-wrap gap-2">
          {hubs.map((hub) => (
            <Link
              key={hub.href}
              href={hub.href}
              className="flex items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
            >
              <hub.icon className="h-3 w-3 shrink-0 text-primary" />
              <span>{hub.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
