"use client";

import { useState, useCallback } from "react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import CreateDeckFloating from "@app/components/molecules/Floating/CreateDeckFloating";

import Decks from "@app/components/organisms/Deck/Decks";

import { Tabs, Tab } from "@heroui/react";

type TabKey = "inuse" | "archived";

export default function TemplateDecks() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");

  const handleCreatedDeck = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setSelectedKey("inuse");
  }, []);

  const handleSelectionChange = (key: React.Key) => {
    setSelectedKey(key as TabKey);
  };

  return (
    <>
      <ScrollUpFloating />
      <CreateDeckFloating onCreated={handleCreatedDeck} />
      <div className="pt-12 w-full">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-15 left-0 right-0 pl-1 pr-1"
          classNames={{
            cursor: selectedKey === "inuse" ? "bg-green-200" : "bg-red-200",
            tab: "h-8",
            tabList: selectedKey === "inuse" ? "bg-red-100" : "bg-green-100",
            tabContent: "font-bold",
          }}
        >
          <Tab key="inuse" title="利用中" />
          <Tab key="archived" title="アーカイブ済み" />
        </Tabs>
        <div className="pt-2">
          <Decks
            key={`${selectedKey}-${refreshKey}`}
            isArchived={selectedKey === "archived"}
            onCreated={handleCreatedDeck}
          />
        </div>
      </div>
    </>
  );
}
