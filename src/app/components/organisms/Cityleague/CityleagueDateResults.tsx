"use client";

import { useMemo, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import type { CityleagueDateLeague } from "@app/utils/cityleagueDateServer";

type Props = {
  // サーバで取ったその日の結果(オープン → シニア → ジュニアの順)
  leagues: CityleagueDateLeague[];
};

const LEAGUE_LABELS: Record<number, string> = {
  1: "オープン",
  3: "シニア",
  2: "ジュニア",
};

/*
 * 開催日ページの本文。リーグ区分のタブと、その日の大会の結果カード(入賞デッキつき)。
 *
 * 最初に開くのは結果のあるリーグ区分の先頭(ふつうはオープン)。
 * 選んだタブのカードだけを描き、一度開いたタブは hidden で残す(一覧ページと同じ作り)。
 * 1日でもオープンは20件を超え、カードごとに入賞デッキの画像を持つため、見ていないタブまで
 * 最初から描くと重い。
 */
export default function CityleagueDateResults({ leagues }: Props) {
  const firstWithResults =
    leagues.find((league) => league.results.length > 0)?.leagueType ??
    leagues[0]?.leagueType;

  const [selected, setSelected] = useState<number | undefined>(firstWithResults);
  const [mounted, setMounted] = useState<ReadonlySet<number>>(
    () => new Set(firstWithResults === undefined ? [] : [firstWithResults]),
  );

  // カードが店舗名などを引く、その日の公式イベント(リーグ区分ごと)
  const eventsByLeague = useMemo(
    () =>
      new Map(
        leagues.map((league) => [
          league.leagueType,
          new Map(league.events.map((event) => [event.id, event])),
        ]),
      ),
    [leagues],
  );

  const handleSelectionChange = (key: React.Key) => {
    const leagueType = Number(key);
    setSelected(leagueType);
    setMounted((prev) => (prev.has(leagueType) ? prev : new Set(prev).add(leagueType)));
  };

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        fullWidth
        size="sm"
        aria-label="リーグ区分"
        selectedKey={selected === undefined ? undefined : String(selected)}
        onSelectionChange={handleSelectionChange}
        classNames={{ tab: "h-8", tabContent: "font-bold text-xs" }}
      >
        {leagues.map((league) => (
          <Tab
            key={String(league.leagueType)}
            title={`${LEAGUE_LABELS[league.leagueType]}：${league.results.length}`}
          />
        ))}
      </Tabs>

      {leagues.map((league) =>
        mounted.has(league.leagueType) ? (
          <div
            key={league.leagueType}
            hidden={selected !== league.leagueType}
            className="flex flex-col gap-3"
          >
            {league.results.length === 0 ? (
              <p className="py-10 text-center text-small text-default-400">
                この日の{LEAGUE_LABELS[league.leagueType]}リーグの結果はありません
              </p>
            ) : (
              league.results.map((eventResult) => (
                <CityleagueResult
                  key={eventResult.official_event_id}
                  event_result={eventResult}
                  official_event={eventsByLeague
                    .get(league.leagueType)
                    ?.get(eventResult.official_event_id)}
                />
              ))
            )}
          </div>
        ) : null,
      )}
    </div>
  );
}
