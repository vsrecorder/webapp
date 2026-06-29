"use client";

import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import CreateRecordFloating from "@app/components/atoms/Floating/CreateRecordFloating";

import Records from "@app/components/organisms/Record/Records";

type TabKey = "official" | "tonamel" | "unofficial";

function getInitialTab(): TabKey {
  if (typeof window === "undefined") return "official";

  // 戻り遷移時のモーダル再開フローに合わせてタブを復元する。
  // 詳細ページ滞在中は detailPagePendingReopen* に値が退避され、
  // RecordById の cleanup 後に reopenModal* へ復元されるため、
  // マウント順序の競合に備えて両方のキーを参照する。
  // recordId は対象カード描画時に必ず削除される一方、
  // eventType は残り続けるため、判定は recordId の有無でゲートする
  //（残存した eventType によるタブ誤選択を防ぐ）。
  const recordId =
    sessionStorage.getItem("detailPagePendingReopenRecordId") ??
    sessionStorage.getItem("reopenModalRecordId");
  if (!recordId) return "official";

  const eventType =
    sessionStorage.getItem("detailPagePendingReopenEventType") ??
    sessionStorage.getItem("reopenModalEventType");
  if (eventType === "tonamel" || eventType === "unofficial") return eventType;
  return "official";
}

export default function TemplateRecords() {
  const [selectedKey, setSelectedKey] = useState<TabKey>(getInitialTab);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    official: 0,
    tonamel: 0,
    unofficial: 0,
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
      <CreateRecordFloating eventType={selectedKey} />
      <div className="pt-12 w-full">
        <Tabs
          fullWidth
          size="md"
          selectedKey={selectedKey}
          onSelectionChange={handleSelectionChange}
          className="fixed z-50 top-15 left-0 right-0 pl-1 pr-1"
          classNames={{
            cursor: "",
            tab: "h-8",
            tabList: "",
            tabContent: "font-bold",
          }}
        >
          <Tab key="official" title="公式イベント" />
          <Tab key="tonamel" title="Tonamel" />
          <Tab key="unofficial" title="記入形式" />
        </Tabs>
      </div>

      <div className="w-full pt-2" hidden={selectedKey !== "official"}>
        <Records event_type={"official"} />
      </div>

      <div className="w-full pt-2" hidden={selectedKey !== "tonamel"}>
        <Records event_type={"tonamel"} />
      </div>

      <div className="w-full pt-2" hidden={selectedKey !== "unofficial"}>
        <Records event_type={"unofficial"} />
      </div>
    </>
  );
}
