"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import OfficialEventRecords from "@app/components/organisms/Record/OfficialEventRecords";
//import TonamelEventRecords from "@app/components/organisms/Record/TonamelEventRecords";

type TabKey = "official" | "tonamel";

export default function TemplateRecords() {
  const [selectedKey, setSelectedKey] = useState<"official" | "tonamel">("official");

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    official: 0,
    tonamel: 0,
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
      <ScrollUpFloating />
      <div className="pt-13">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1"
          classNames={{
            cursor: "",
            tab: "h-8",
            tabList: "",
            tabContent: "font-bold",
          }}
        >
          <Tab key="official" title="公式イベント"></Tab>
          <Tab key="tonamel" title="Tonamel"></Tab>
        </Tabs>
      </div>

      <div hidden={selectedKey !== "official"}>
        <OfficialEventRecords />
      </div>
      {/*
      <div hidden={selectedKey !== "tonamel"}>
        <TonamelEventRecords />
      </div>
      */}
    </>
  );
}
