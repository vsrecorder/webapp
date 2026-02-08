"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

export default function TemplateCityleagueResults() {
  const [selectedKey, setSelectedKey] = useState<
    "league_type_1" | "league_type_3" | "league_type_2"
  >("league_type_1");

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    league_type_1: 0,
    league_type_3: 0,
    league_type_2: 0,
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
          <Tab key="league_type_1" title="オープンリーグ" />
          <Tab key="league_type_3" title="シニアリーグ" />
          <Tab key="league_type_2" title="ジュニアリーグ" />
        </Tabs>
      </div>

      <div hidden={selectedKey !== "league_type_1"}>
        <CityleagueResults league_type={"1"} />
      </div>
      <div hidden={selectedKey !== "league_type_3"}>
        <CityleagueResults league_type={"3"} />
      </div>
      <div hidden={selectedKey !== "league_type_2"}>
        <CityleagueResults league_type={"2"} />
      </div>
    </>
  );
}
