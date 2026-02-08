"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import Link from "next/link";

import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

import { RecordType } from "@app/types/record";

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  record: RecordType;
};

export default function Record({ record }: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record.data.official_event_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchOfficialEventById(record.data.official_event_id);
        data.title = data.title.replace(/【.*?】ポケモンカードジム　/g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードゲーム　/g, "");
        data.title = data.title.replace(/ポケモンカードゲーム /g, "");
        setOfficialEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [record.data.official_event_id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!officialEvent) {
    return;
  }

  return (
    <div className="w-full">
      <Link color="foreground" href={`/records/${record.data.id}`}>
        <Card shadow="sm" className="py-3">
          <CardHeader className="pb-0 pt-0 flex-col items-start gap-1">
            <p className="font-bold text-tiny">
              {new Date(record.data.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
            <p className="font-bold truncate w-full min-w-0">{officialEvent.title}</p>
          </CardHeader>
          <CardBody className="py-2">
            <Image alt="ジムバトル" src="/gym.png" radius="none" className="w-2/5" />
          </CardBody>
        </Card>
      </Link>
    </div>
  );
}
