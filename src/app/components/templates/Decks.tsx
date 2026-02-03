"use client";

import { useEffect, useRef, useState } from "react";

import UpFloating from "../molecules/UpFloating";
import PlusFloating from "../molecules/PlusFloating";

import Decks from "@app/components/organisms/Decks";

import { Tabs, Tab } from "@heroui/react";

type TabKey = "inuse" | "archived";

export default function TemplateDecks() {
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");

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
      <PlusFloating />
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
          <Decks isArchived={false} />
        </div>

        <div hidden={selectedKey !== "archived"}>
          <Decks isArchived={true} />
        </div>
      </div>
    </>
  );
}
