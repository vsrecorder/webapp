import { useState, useRef } from "react";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import TonamelEventInfo from "@app/components/organisms/Record/TonamelEventInfo";
import UnofficialEventInfo from "@app/components/organisms/Record/UnofficialEventInfo";
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
    <div className="px-3 pt-3 pb-3 flex flex-col gap-9 overflow-y-auto">
      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">参加したイベント</div>
        </div>

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
          ) : // 記入形式の場合
          record?.unofficial_event_id !== "" ? (
            <UnofficialEventInfo record={record} />
          ) : (
            <></>
          )
        }
      </div>

      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">対戦結果</div>
        </div>
        <div className="p-1 flex flex-col gap-3">
          <Matches
            record={record}
            enableCreateMatchModalButton={true}
            enableUpdateMatchModalButton={true}
            matchCardRef={matchCardRef}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">使用したデッキ</div>
        </div>
        <div ref={deckCardRef} className="p-1">
          <UsedDeckById
            record={record}
            setRecord={setRecord}
            enableShowDeckModal={false}
            enableUpdateUsedDeckModal={true}
          />
        </div>
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
