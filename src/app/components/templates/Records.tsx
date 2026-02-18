"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import Records from "@app/components/organisms/Record/Records";

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
      <div className="pt-13 w-full">
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
          <Tab key="official" title="公式イベント" />
          <Tab key="tonamel" title="Tonamel" />
        </Tabs>
      </div>

      <div className="w-full" hidden={selectedKey !== "official"}>
        <Records event_type={"official"} deck_id={""} />
      </div>

      <div className="w-full" hidden={selectedKey !== "tonamel"}>
        <Records event_type={"tonamel"} deck_id={""} />
      </div>
    </>
  );
}
