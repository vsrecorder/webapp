"use client";

import Decks from "@app/components/organisms/Decks";
import ArchivedDecks from "@app/components/organisms/ArchivedDecks";

import { Tabs, Tab } from "@heroui/react";

export default function Records() {
  return (
    <Tabs fullWidth size="sm">
      <Tab key="inuse" title="利用中">
        <Decks />
      </Tab>
      <Tab key="archived" title="アーカイブ済み">
        <ArchivedDecks />
      </Tab>
    </Tabs>
  );
}
