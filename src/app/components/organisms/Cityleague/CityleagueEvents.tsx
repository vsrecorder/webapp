"use client";

import { useState } from "react";

import { Card, CardBody } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";

import CityleagueEvent from "@app/components/organisms/Cityleague/CityleagueEvent";

type TabKey = "league_type_1" | "league_type_3" | "league_type_2";

type Props = {
  // 表示対象の日付("YYYY-MM-DD")。省略時は今日(JST)
  date?: string;
  // 開催期間外に次シーズン初日を先出しプレビュー表示するときのラベル(例:「2026年9月26日(土)」)
  previewLabel?: string;
};

export default function CityleagueEvents({ date, previewLabel }: Props) {
  const [selectedKey, setSelectedKey] = useState<
    "league_type_1" | "league_type_3" | "league_type_2"
  >("league_type_1");

  const [leagueType1Count, setLeagueType1Count] = useState<number>();
  const [leagueType3Count, setLeagueType3Count] = useState<number>();
  const [leagueType2Count, setLeagueType2Count] = useState<number>();

  /*
   * タブの切り替えではスクロール位置を動かさない。
   *
   * 以前はタブごとに window.scrollY を覚えて切り替え後に戻していたが、覚えた値の初期値が 0 のため、
   * ホームの途中にあるこのパネルでタブを押すとページの先頭まで飛ばされていた(実測: 672px → 0)。
   * マウント時にも同じ effect が走り、先頭へ戻していた。会場カードは高さ一定
   * (CityleagueEventCard 参照)でタブを替えてもパネルの背丈は変わらないので、位置を直す必要も無い。
   */
  const handleSelectionChange = (key: React.Key) => {
    setSelectedKey(key as TabKey);
  };

  return (
    <>
      <Card className="w-full">
        <CardBody className="px-0 py-1 w-full ">
          {previewLabel && (
            <div className="px-3 pb-1">
              <span className="text-xs font-bold text-primary-600">
                {previewLabel} 開催予定
              </span>
            </div>
          )}
          <div className="w-full">
            <Tabs
              fullWidth
              size="sm"
              selectedKey={selectedKey}
              onSelectionChange={handleSelectionChange}
              className="left-0 right-0 pl-1 pr-1 w-full"
              classNames={{
                cursor: "",
                tab: "h-7",
                tabList: "",
                tabContent: "font-bold text-xs",
              }}
            >
              <Tab
                key="league_type_1"
                title={`オープン：${leagueType1Count === 0 ? "0" : leagueType1Count ? leagueType1Count : "??"}`}
              />
              <Tab
                key="league_type_3"
                title={`シニア：${leagueType3Count === 0 ? "0" : leagueType3Count ? leagueType3Count : "??"}`}
              />
              <Tab
                key="league_type_2"
                title={`ジュニア：${leagueType2Count === 0 ? "0" : leagueType2Count ? leagueType2Count : "??"}`}
              />
            </Tabs>
          </div>

          <div className="w-full" hidden={selectedKey !== "league_type_1"}>
            <CityleagueEvent
              league_type={1}
              setLeagueTypeCount={setLeagueType1Count}
              date={date}
            />
          </div>
          <div className="w-full" hidden={selectedKey !== "league_type_3"}>
            <CityleagueEvent
              league_type={3}
              setLeagueTypeCount={setLeagueType3Count}
              date={date}
            />
          </div>
          <div className="w-full" hidden={selectedKey !== "league_type_2"}>
            <CityleagueEvent
              league_type={2}
              setLeagueTypeCount={setLeagueType2Count}
              date={date}
            />
          </div>
        </CardBody>
      </Card>
    </>
  );
}
