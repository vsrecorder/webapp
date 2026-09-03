import Link from "next/link";

import { LuChevronRight, LuTrophy } from "react-icons/lu";

import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { getChampionsleagueScheduleSummaries } from "@app/utils/championsleague";
import { formatEventDate } from "@app/utils/cityleague";

type Props = {
  schedule: ChampionsleagueScheduleType;
};

// 末尾に並べる他大会の数。大会は年に数回なので、直近ぶんで1画面に収まる。
const LIMIT = 8;

// 大会ページ同士を横に繋ぐセクション。
//
// これが無いと大会ページへの内部リンクは一覧ハブからの1本だけになり、
// クローラは1ページ辿るたびにハブへ戻る必要がある。
export default async function ChampionsleagueRelatedSection({ schedule }: Props) {
  // 関連リンクは本文の付随物なので、取得に失敗してもページ本体は出す
  // （getJson は障害時に例外を投げる）。
  const summaries = await getChampionsleagueScheduleSummaries().catch(() => []);

  const related = summaries
    .filter((summary) => summary.schedule.id !== schedule.id)
    .slice(0, LIMIT);

  return (
    <section className="flex flex-col gap-4 pt-6 pb-2">
      {related.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="px-0.5 font-bold text-small text-default-700">
            他の大型大会の結果
          </h2>

          <ul className="flex flex-col divide-y divide-default-100 overflow-hidden rounded-2xl border border-default-100 bg-content1">
            {related.map(({ schedule: relatedSchedule, eventCount }) => (
              <li key={relatedSchedule.id}>
                <Link
                  href={`/cityleague_results/championsleagues/${relatedSchedule.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-default-50"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold text-small">
                      {relatedSchedule.title.trim()}
                    </span>
                    <span className="text-tiny text-default-400">
                      {formatEventDate(relatedSchedule.from_date)} / {eventCount}区分
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
            href="/cityleague_results/championsleagues"
            className="flex items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
          >
            <LuTrophy className="h-3 w-3 shrink-0 text-primary" />
            <span>大型大会の結果一覧</span>
          </Link>
          <Link
            href="/cityleague_results"
            className="flex items-center gap-1 rounded-full border border-default-200 bg-content1 px-2.5 py-1 font-bold text-tiny text-default-600 hover:bg-default-100"
          >
            <LuTrophy className="h-3 w-3 shrink-0 text-primary" />
            <span>シティリーグ結果</span>
          </Link>
        </nav>
      </div>
    </section>
  );
}
