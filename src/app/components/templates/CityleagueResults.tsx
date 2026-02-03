"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import UpFloating from "../molecules/UpFloating";

import Results from "@app/components/organisms/CityleagueResults";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

export default function CityleagueResults() {
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
      <UpFloating />
      <Tabs
        fullWidth
        size="sm"
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1"
      >
        <Tab key="league_type_1" title="オープンリーグ" className="font-bold" />
        <Tab key="league_type_3" title="シニアリーグ" className="font-bold" />
        <Tab key="league_type_2" title="ジュニアリーグ" className="font-bold" />
      </Tabs>

      <div className="pt-12">
        <div hidden={selectedKey !== "league_type_1"}>
          <Results league_type={"1"} />
        </div>
        <div hidden={selectedKey !== "league_type_3"}>
          <Results league_type={"3"} />
        </div>
        <div hidden={selectedKey !== "league_type_2"}>
          <Results league_type={"2"} />
        </div>
      </div>
    </>
  );
}
