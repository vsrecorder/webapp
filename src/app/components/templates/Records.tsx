"use client";

import OfficialEventRecords from "@app/components/organisms/Record/OfficialEventRecords";
import TonamelEventRecords from "@app/components/organisms/Record/TonamelEventRecords";

import { Tabs, Tab } from "@heroui/react";

export default function TemplateRecords() {
  return (
    <Tabs
      fullWidth
      size="md"
      className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1 font-bold"
    >
      <Tab key="official" title="公式イベント">
        <OfficialEventRecords />
      </Tab>
      <Tab key="tonamel" title="Tonamel">
        <TonamelEventRecords />
      </Tab>
    </Tabs>
  );
}
