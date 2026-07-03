"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

// マウント後に復元すべきタブを算出する。必ずクライアント側（useEffect 内）からのみ呼ぶ。
function resolveRestoredTab(): TabKey {
  const savedTab = sessionStorage.getItem("cityleagueResultsSelectedTab");
  if (
    savedTab === "league_type_1" ||
    savedTab === "league_type_3" ||
    savedTab === "league_type_2"
  )
    return savedTab;
  return "league_type_1";
}

export default function TemplateCityleagueResults() {
  // SSR と初回クライアントレンダリングを一致させるため、初期値は必ず "league_type_1" にする。
  // 実際の復元はマウント後の useEffect で行う（ハイドレーション不整合の回避）。
  const [selectedKey, setSelectedKey] = useState<TabKey>("league_type_1");

  // マウント後に保存済みタブを復元する。
  useEffect(() => {
    const restored = resolveRestoredTab();
    if (restored !== "league_type_1") {
      setSelectedKey(restored);
    }
  }, []);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    league_type_1: 0,
    league_type_3: 0,
    league_type_2: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    // リロード時の復元用に選択タブを保存
    sessionStorage.setItem("cityleagueResultsSelectedTab", key as string);

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
          <Tab key="league_type_1" title="オープンリーグ" />
          <Tab key="league_type_3" title="シニアリーグ" />
          <Tab key="league_type_2" title="ジュニアリーグ" />
        </Tabs>
      </div>

      <div className="w-full" hidden={selectedKey !== "league_type_1"}>
        <CityleagueResults league_type={1} />
      </div>
      <div className="w-full" hidden={selectedKey !== "league_type_3"}>
        <CityleagueResults league_type={3} />
      </div>
      <div className="w-full" hidden={selectedKey !== "league_type_2"}>
        <CityleagueResults league_type={2} />
      </div>
    </>
  );
}
