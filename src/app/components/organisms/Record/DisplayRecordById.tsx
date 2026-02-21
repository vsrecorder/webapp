import { useState } from "react";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import TonamelEventInfo from "@app/components/organisms/Record/TonamelEventInfo";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

import { RecordGetByIdResponseType } from "@app/types/record";

type Props = {
  recordData: RecordGetByIdResponseType;
};

export default function DisplayRecordById({ recordData }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType>(recordData);
  return (
    <div className="px-3 pt-3 pb-9 flex flex-col gap-9 overflow-y-auto">
      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">参加したイベント</div>
        </div>

        {
          // 公式イベントの場合
          record.official_event_id !== 0 ? (
            <OfficialEventInfo record={record} setRecord={setRecord} />
          ) : // Tonamelの場合
          record.tonamel_event_id !== "" ? (
            <TonamelEventInfo record={record} />
          ) : (
            <></>
          )
        }
      </div>

      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">対戦結果</div>
        </div>
        <Matches record={record} enableCreateMatchModalButton={true} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">使用したデッキ</div>
        </div>
        <UsedDeckById record={record} setRecord={setRecord} enableShowDeckModal={false} />
      </div>
    </div>
  );
}
