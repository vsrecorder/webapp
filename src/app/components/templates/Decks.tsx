"use client";

import Decks from "@app/components/organisms/Decks";
import ArchivedDecks from "@app/components/organisms/ArchivedDecks";

import { Tabs, Tab } from "@heroui/react";

export default function Records() {
  return (
    <Tabs fullWidth size="md">
      <Tab key="" title="デッキ">
        <Decks />
      </Tab>
      <Tab key="archived" title="アーカイブ">
        <ArchivedDecks />
      </Tab>
    </Tabs>
  );
}
