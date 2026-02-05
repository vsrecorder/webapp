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
      <div className="pt-12">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1 font-bold"
          classNames={{
            cursor: selectedKey === "inuse" ? "bg-green-200" : "bg-red-200",
            tab: "h-8",
            tabList: "",
            tabContent: "",
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

/*
type TabKey = "inuse" | "archived";

export default function TemplateDecks() {
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeckCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setSelectedKey("inuse");
  }, []);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    inuse: 0,
    archived: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    setSelectedKey(key as TabKey);
  };

  // タブ切り替え後にスクロール復元
  useEffect(() => {
    window.scrollTo({
      top: scrollPositions.current[selectedKey],
      behavior: "auto",
    });
  }, [selectedKey]);

  return (
    <>
      <UpFloating />
      <CreateDeckFloating onDeckCreated={handleDeckCreated} />
      <Tabs
        fullWidth
        size="sm"
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1"
        classNames={{
          cursor: selectedKey === "inuse" ? "bg-green-200" : "bg-red-200",
          tab: "h-8",
          tabList: "",
          tabContent: "",
        }}
      >
        <Tab key="inuse" title="利用中" className="font-bold" />
        <Tab key="archived" title="アーカイブ済み" className="font-bold" />
      </Tabs>

      <div className="pt-12">
        <div hidden={selectedKey !== "inuse"}>
          <Decks key={refreshKey} isArchived={false} />
        </div>

        <div hidden={selectedKey !== "archived"}>
          <Decks key={refreshKey} isArchived={true} />
        </div>
      </div>
    </>
  );
}
*/
