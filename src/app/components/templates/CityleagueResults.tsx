"use client";

import { Tabs, Tab } from "@heroui/react";

import Results from "@app/components/organisms/CityleagueResults";

export default function CityleagueResults() {
  return (
    <Tabs fullWidth size="sm">
      <Tab key="league_type=1" title="オープンリーグ">
        <Results league_type={"1"} />
      </Tab>
      <Tab key="league_type=3" title="シニアリーグ">
        <Results league_type={"3"} />
      </Tab>
      <Tab key="league_type=2" title="ジュニアリーグ">
        <Results league_type={"2"} />
      </Tab>
    </Tabs>
  );
}
