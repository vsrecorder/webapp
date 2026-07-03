"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import CreateRecordFloating from "@app/components/atoms/Floating/CreateRecordFloating";

import Records from "@app/components/organisms/Record/Records";

type TabKey = "all" | "official" | "tonamel" | "unofficial";

// マウント後に復元すべきタブを算出する。
// 必ずクライアント側（useEffect 内）からのみ呼ぶ。
//
// リロード・戻り遷移のいずれの場合も「ユーザが実際に選択していたタブ」を
// recordsSelectedTab から復元する。カードの種別（eventType）ではなく
// 選択タブを基準にすることで、「すべて」タブで個別種別のカードを開いて
// 戻った際に個別タブへ切り替わってしまう問題を防ぐ。
// モーダルの再開自体は Records 子コンポーネントが reopenModalRecordId を
// 独立して処理するため、親はタブ選択だけを正しく復元すればよい。
function resolveRestoredTab(): TabKey {
  const savedTab = sessionStorage.getItem("recordsSelectedTab");
  if (savedTab === "official" || savedTab === "tonamel" || savedTab === "unofficial")
    return savedTab;
  return "all";
}

export default function TemplateRecords() {
  // SSR と初回クライアントレンダリングを一致させるため、初期値は必ず "all" にする。
  // 実際の復元はマウント後の useEffect で行う（ハイドレーション不整合の回避）。
  const [selectedKey, setSelectedKey] = useState<TabKey>("all");

  // マウント後に保存済みタブを復元する。
  // 初回 "all" からの state 遷移により通常の再レンダリングが走り、
  // 各タブ内容の hidden 属性も正しく更新される。
  useEffect(() => {
    const restored = resolveRestoredTab();
    if (restored !== "all") {
      setSelectedKey(restored);
    }
  }, []);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    all: 0,
    official: 0,
    tonamel: 0,
    unofficial: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    // 切り替え前のスクロール位置を保存
    scrollPositions.current[selectedKey] = window.scrollY;

    // リロード時の復元用に選択タブを保存
    sessionStorage.setItem("recordsSelectedTab", key as string);

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
      <CreateRecordFloating eventType={selectedKey} />
      <div className="pt-12 w-full">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-15 left-0 right-0 lg:left-20 pl-1 pr-1"
          classNames={{
            cursor: "",
            tab: "h-8",
            tabList: "",
            tabContent: "font-bold",
          }}
        >
          <Tab key="all" title="すべて" />
          <Tab key="official" title="公式イベント" />
          <Tab key="tonamel" title="Tonamel" />
          <Tab key="unofficial" title="記入形式" />
        </Tabs>
      </div>

      <div className="w-full pt-2 lg:max-w-4xl lg:mx-auto" hidden={selectedKey !== "all"}>
        <Records event_type={"all"} isActive={selectedKey === "all"} />
      </div>

      <div
        className="w-full pt-2 lg:max-w-4xl lg:mx-auto"
        hidden={selectedKey !== "official"}
      >
        <Records event_type={"official"} isActive={selectedKey === "official"} />
      </div>

      <div
        className="w-full pt-2 lg:max-w-4xl lg:mx-auto"
        hidden={selectedKey !== "tonamel"}
      >
        <Records event_type={"tonamel"} isActive={selectedKey === "tonamel"} />
      </div>

      <div
        className="w-full pt-2 lg:max-w-4xl lg:mx-auto"
        hidden={selectedKey !== "unofficial"}
      >
        <Records event_type={"unofficial"} isActive={selectedKey === "unofficial"} />
      </div>
    </>
  );
}
