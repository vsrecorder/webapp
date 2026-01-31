"use client";

import Decks from "@app/components/organisms/Decks";

import { Tabs, Tab } from "@heroui/react";

export default function Records() {
  return (
    <Tabs fullWidth size="sm">
      <Tab key="inuse" title="利用中">
        <Decks isArchived={false} />
      </Tab>
      <Tab key="archived" title="アーカイブ済み">
        <Decks isArchived={true} />
      </Tab>
    </Tabs>
  );
}
