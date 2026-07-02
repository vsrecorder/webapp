"use client";

import { useState, useCallback, useEffect } from "react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import CreateDeckFloating from "@app/components/molecules/Floating/CreateDeckFloating";

import Decks from "@app/components/organisms/Deck/Decks";

import { Tabs, Tab } from "@heroui/react";

type TabKey = "inuse" | "archived";

const SELECTED_TAB_STORAGE_KEY = "decksSelectedTab";

export default function TemplateDecks() {
  const [refreshKey, setRefreshKey] = useState(0);
  // SSR と一致させるため初期値は "inuse" で固定し、クライアント側でのみ復元する。
  const [selectedKey, setSelectedKey] = useState<"inuse" | "archived">("inuse");

  // マウント後（クライアント専用）にタブを復元する。
  // 遷移再開フラグ（reopenDeckModalArchived）が立っていればそちらを優先し、
  // なければ sessionStorage に保存済みのタブを復元する。
  useEffect(() => {
    if (sessionStorage.getItem("reopenDeckModalArchived") === "1") {
      setSelectedKey("archived");
    } else {
      const saved = sessionStorage.getItem(SELECTED_TAB_STORAGE_KEY);
      if (saved === "archived") setSelectedKey("archived");
    }
    // 役目を終えたフラグは削除（DeckCard が使う reopenDeckModalDeckId は残す）。
    sessionStorage.removeItem("reopenDeckModalArchived");
  }, []);

  // 選択タブを sessionStorage に保存し、リロード後も復元できるようにする。
  useEffect(() => {
    sessionStorage.setItem(SELECTED_TAB_STORAGE_KEY, selectedKey);
  }, [selectedKey]);

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
          className="fixed z-50 top-15 left-0 right-0 lg:left-20 pl-1 pr-1"
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
        <div className="pt-2 lg:max-w-4xl lg:mx-auto">
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
