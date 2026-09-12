import Link from "next/link";

import { LuChevronRight, LuCrown, LuTrophy } from "react-icons/lu";

import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import {
  championsleagueLeagueTitle,
  formatLeagueDates,
  getChampionsleagueEventRefs,
  groupEventsByLeagueType,
} from "@app/utils/championsleague";

type Props = {
  schedule: ChampionsleagueScheduleType;
  // いま開いている区分。一覧からは除く。
  leagueType: number;
};

// 区分ページ同士を横に繋ぐセクション。
//
// 区分ごとにページを分けた結果、同じ大会の他区分へは大会ページを経由しないと
// 辿れなくなる。ここで直接リンクすることで、読者もクローラも1ホップで移動できる。
export default async function ChampionsleagueLeagueRelatedSection({
  schedule,
  leagueType,
}: Props) {
  // 関連リンクは本文の付随物なので、取得に失敗してもページ本体は出す
  // （getJson は障害時に例外を投げる）。
  const events = await getChampionsleagueEventRefs().catch(() => []);

  // 区分ページは区分に1つなので、1日目/2日目が別イベントの区分も1行にまとめる。
  const siblings = groupEventsByLeagueType(
    events.filter(
      (event) =>
        event.championsleague_schedule_id === schedule.id &&
        event.league_type !== leagueType,
    ),
  ).filter((group) => group.slug !== "");

  const scheduleTitle = schedule.title.trim();

  return (
    <section className="flex flex-col gap-4 pt-6 pb-2">
      {siblings.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-0.5 font-bold text-small text-default-700">
            {scheduleTitle}の他のリーグ区分
          </h2>

          <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
            {siblings.map((group) => (
              <li key={group.leagueType}>
                <Link
                  href={`/cityleague_results/championsleagues/${schedule.id}/${group.slug}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-default-50"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold text-small">
                      {championsleagueLeagueTitle(group.leagueType)}リーグ
                    </span>
                    <span className="text-tiny text-default-400">
                      {formatLeagueDates(group.events.map((event) => event.date))}
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
          <Link
            href={`/cityleague_results/championsleagues/${schedule.id}`}
            className="flex items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
          >
            <LuCrown className="h-3 w-3 shrink-0 text-primary" />
            <span>{scheduleTitle}</span>
          </Link>
          <Link
            href="/cityleague_results/championsleagues"
            className="flex items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
          >
            <LuTrophy className="h-3 w-3 shrink-0 text-primary" />
            <span>大型大会の結果一覧</span>
          </Link>
        </nav>
      </div>
    </section>
  );
}
