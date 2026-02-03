"use client";

import UpFloating from "../molecules/UpFloating";
import PlusFloating from "../molecules/PlusFloating";

import Decks from "@app/components/organisms/Decks";

import { Tabs, Tab } from "@heroui/react";

export default function TemplateDecks() {
  return (
    <>
      <UpFloating />
      <PlusFloating />
      <Tabs fullWidth size="sm">
        <Tab key="inuse" title="利用中">
          <Decks isArchived={false} />
        </Tab>
        <Tab key="archived" title="アーカイブ済み">
          <Decks isArchived={true} />
        </Tab>
      </Tabs>
    </>
  );
}
