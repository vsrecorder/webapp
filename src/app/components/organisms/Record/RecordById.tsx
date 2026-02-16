"use client";

import { useEffect, useState } from "react";

import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

import { RecordGetByIdResponseType } from "@app/types/record";

async function fetchRecordById(id: string) {
  try {
    const res = await fetch(`/api/records/` + id, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: string;
};

export default function RecordById({ id }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const record = await fetchRecordById(id);
        setRecord(record);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!record) {
    return;
  }

  return (
    <div className="pt-3 flex flex-col gap-9">
      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">イベント情報</div>
        </div>

        {record.official_event_id !== 0 ? (
          <OfficialEventRecord
            record={{ data: record, cursor: "" }}
            enableDisplayRecordModal={false}
          />
        ) : (
          // TODO: Tonamelの場合
          <></>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">対戦結果</div>
        </div>
        <Matches record={record} enableCreateMatchModal={true} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">使用したデッキ</div>
        </div>
        <UsedDeckById deck_id={record.deck_id} deck_code_id={record.deck_code_id} />
      </div>
    </div>
  );
}
