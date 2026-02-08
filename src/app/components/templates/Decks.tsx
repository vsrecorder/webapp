"use client";

//import { useEffect, useRef, useState, useCallback } from "react";
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
      <CreateDeckFloating onCreate={handleCreatedDeck} />
      <div className="pt-13">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1"
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

        <Decks
          key={`${selectedKey}-${refreshKey}`}
          isArchived={selectedKey === "archived"}
        />
      </div>
    </>
  );
}
