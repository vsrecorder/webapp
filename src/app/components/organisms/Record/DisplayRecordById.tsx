import { useState, useRef } from "react";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import TonamelEventInfo from "@app/components/organisms/Record/TonamelEventInfo";
import UnofficialEventInfo from "@app/components/organisms/Record/UnofficialEventInfo";
import RecordSectionLabel from "@app/components/organisms/Record/RecordSectionLabel";
import IgnoreStatsBanner from "@app/components/organisms/Record/IgnoreStatsBanner";
import IgnoreStatsFlgSetting from "@app/components/organisms/Record/IgnoreStatsFlgSetting";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";
import RecordActionsFloating from "@app/components/molecules/Floating/RecordActionsFloating";

import { RecordGetByIdResponseType } from "@app/types/record";

type Props = {
  recordData: RecordGetByIdResponseType;
};

export default function DisplayRecordById({ recordData }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(recordData);

  const matchCardRef = useRef<HTMLDivElement>(null);
  const deckCardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="px-0.5 pt-6 pb-6 flex flex-col gap-9 lg:grid lg:grid-cols-3 lg:gap-6 lg:max-w-5xl lg:mx-auto overflow-y-auto">
      {/* 集計対象外の記録のみ、最上部にステータスバナーを表示 */}
      {record?.ignore_stats_flg && (
        <div className="px-0.5 lg:col-span-3">
          <IgnoreStatsBanner />
        </div>
      )}

      <div className="px-0.5 flex flex-col gap-3 lg:col-span-3">
        <RecordSectionLabel>参加したイベント</RecordSectionLabel>

        {
          // 公式イベントの場合
          record?.official_event_id !== 0 ? (
            <OfficialEventInfo
              record={record}
              setRecord={setRecord}
              enableEditTCGMeisterURL={true}
            />
          ) : // Tonamelの場合
          record?.tonamel_event_id !== "" ? (
            <TonamelEventInfo record={record} />
          ) : // 自由形式の場合
          record?.unofficial_event_id !== "" ? (
            <UnofficialEventInfo record={record} />
          ) : (
            <></>
          )
        }
      </div>

      <div className="flex flex-col gap-3 lg:col-span-2">
        <RecordSectionLabel>対戦結果</RecordSectionLabel>
        <div className="px-0.5 py-1 flex flex-col gap-3">
          <Matches
            record={record}
            enableCreateMatchModalButton={true}
            enableUpdateMatchModalButton={true}
            matchCardRef={matchCardRef}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-1">
        <RecordSectionLabel>使用したデッキ</RecordSectionLabel>
        <div ref={deckCardRef} className="px-0.5 py-1">
          <UsedDeckById
            record={record}
            setRecord={setRecord}
            enableShowDeckModal={false}
            enableUpdateUsedDeckModal={true}
          />
        </div>
      </div>

      <div className="px-0.5 flex flex-col gap-3 lg:col-span-3">
        <RecordSectionLabel>戦績集計</RecordSectionLabel>
        {record && <IgnoreStatsFlgSetting record={record} setRecord={setRecord} />}
      </div>

      {record && (
        <RecordActionsFloating
          record={record}
          setRecord={setRecord}
          matchCardRef={matchCardRef}
          deckCardRef={deckCardRef}
        />
      )}
    </div>
  );
}
