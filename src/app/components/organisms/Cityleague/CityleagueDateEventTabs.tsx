"use client";

import { useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";

import { OfficialEventType } from "@app/types/official_event";
import { countEventsByLeagueTitle } from "@app/utils/cityleague";

const ALL_KEY = "all";

type Props = {
  events: OfficialEventType[];
};

// 開催日ページの会場一覧を、リーグ区分で絞り込めるようにするタブ。
// 「すべて」は常に全件を見られるよう残し、その後に登録されているリーグ区分を並べる。
export default function CityleagueDateEventTabs({ events }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY);

  const leagueCounts = countEventsByLeagueTitle(events);

  const filteredEvents =
    selectedKey === ALL_KEY
      ? events
      : events.filter((event) => event.league_title === selectedKey);

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        fullWidth
        size="sm"
        selectedKey={selectedKey}
        onSelectionChange={(key) => setSelectedKey(key as string)}
        classNames={{ tabContent: "font-bold" }}
      >
        <Tab key={ALL_KEY} title={`すべて ${events.length}件`} />
        {leagueCounts.map((item) => (
          <Tab key={item.leagueTitle} title={`${item.leagueTitle} ${item.count}件`} />
        ))}
      </Tabs>

      <CityleagueEventLinkList events={filteredEvents} showDateLink={false} />
    </div>
  );
}
