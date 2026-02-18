"use client";

import { useEffect, useRef, useState } from "react";

import { Card, CardBody } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";

import CityleagueEvent from "@app/components/organisms/Cityleague/CityleagueEvent";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

export default function CityleagueEvents() {
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
      <Card className="w-full">
        <CardBody className="px-0 py-1 w-full ">
          <div className="w-full">
            <Tabs
              fullWidth
              size="md"
              selectedKey={selectedKey}
              onSelectionChange={handleSelectionChange}
              className="left-0 right-0 pl-1 pr-1 w-full"
              classNames={{
                cursor: "",
                tab: "h-8",
                tabList: "",
                tabContent: "font-bold text-xs",
              }}
            >
              <Tab key="league_type_1" title="オープンリーグ" />
              <Tab key="league_type_3" title="シニアリーグ" />
              <Tab key="league_type_2" title="ジュニアリーグ" />
            </Tabs>
          </div>

          <div className="w-full" hidden={selectedKey !== "league_type_1"}>
            <CityleagueEvent league_type={1} />
          </div>
          <div className="w-full" hidden={selectedKey !== "league_type_3"}>
            <CityleagueEvent league_type={3} />
          </div>
          <div className="w-full" hidden={selectedKey !== "league_type_2"}>
            <CityleagueEvent league_type={2} />
          </div>
        </CardBody>
      </Card>
    </>
  );
}
