"use client";

import { useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";

import { OfficialEventType } from "@app/types/official_event";
import { countEventsByLeagueTitle } from "@app/utils/cityleague";

type Props = {
  events: OfficialEventType[];
};

// 開催日ページの会場一覧を、リーグ区分で絞り込めるようにするタブ。
// その日に実際に登録されているリーグ区分だけを並べる(開催の無い区分のタブは出さない)。
export default function CityleagueDateEventTabs({ events }: Props) {
  const leagueCounts = countEventsByLeagueTitle(events);

  const [selectedKey, setSelectedKey] = useState<string>(leagueCounts[0].leagueTitle);

  const filteredEvents = events.filter((event) => event.league_title === selectedKey);

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        fullWidth
        size="sm"
        selectedKey={selectedKey}
        onSelectionChange={(key) => setSelectedKey(key as string)}
        classNames={{ tabContent: "font-bold" }}
      >
        {leagueCounts.map((item) => (
          <Tab key={item.leagueTitle} title={`${item.leagueTitle} ${item.count}件`} />
        ))}
      </Tabs>

      <CityleagueEventLinkList events={filteredEvents} showDateLink={false} />
    </div>
  );
}
