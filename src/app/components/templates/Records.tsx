"use client";

import OfficialEventRecords from "@app/components/organisms/OfficialEventRecords";
import TonamelEventRecords from "@app/components/organisms/TonamelEventRecords";

import { Tabs, Tab } from "@heroui/react";

export default function Records() {
  return (
    <Tabs fullWidth size="sm">
      <Tab key="official" title="公式イベント">
        <OfficialEventRecords />
      </Tab>
      <Tab key="tonamel" title="Tonamel">
        <TonamelEventRecords />
      </Tab>
    </Tabs>
  );
}
