"use client";

import { useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Divider } from "@heroui/react";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
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
    <div className="flex flex-col gap-2">
      <div>作成日: {new Date(record.created_at).toLocaleString()}</div>
      <div>公式イベントID: {record.official_event_id}</div>
      <div>Tonamel ID: {record.tonamel_event_id}</div>
      <div>デッキID: {record.deck_id}</div>
      <div>デッキコードID: {record.deck_code_id}</div>
      <div>
        <Chip size="sm" radius="md" variant="bordered">
          <small className="font-bold">{record.private_flg ? "非公開" : "公開"}</small>
        </Chip>
      </div>
      <div>TCGマイスターのURL{record.tcg_meister_url}</div>
      <Divider />

      {record.official_event_id !== 0 ? (
        <OfficialEventInfo id={record.official_event_id} />
      ) : (
        <></>
      )}
      <Divider />

      <Matches record={record} />
      <UsedDeckById deck_id={record.deck_id} deck_code_id={record.deck_code_id} />
    </div>
  );
}
