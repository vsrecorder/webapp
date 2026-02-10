"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { RecordType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

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

export default function OfficialEventRecord({ record }: Props) {
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

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loading) {
    return (
      <div className="pb-3 w-full">
        <Card shadow="sm" className="py-3 w-full">
          <CardHeader className="px-5 pb-0 pt-0 flex-col items-start gap-1.5">
            <div className="font-bold text-tiny">
              <Skeleton className="h-4 w-26" />
            </div>
            <div className="font-bold truncate w-full min-w-0">
              <Skeleton className="h-6 w-50" />
            </div>
          </CardHeader>
          <CardBody className="px-5 py-3">
            <div className="flex items-center gap-5">
              <Skeleton className="h-24 w-24" />
              <div className="flex flex-col gap-2">
                <div className="font-bold text-tiny">
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="font-bold truncate w-full min-w-0">
                  <Skeleton className="h-5 w-44" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-3 w-full">
      <Link color="foreground" href={`/records/${record.data.id}`}>
        <Card shadow="sm" className="py-3 w-full">
          <CardHeader className="px-5 pb-0 pt-0 flex-col items-start gap-1.5">
            <div className="font-bold text-tiny">
              {new Date(record.data.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </div>
            <div className="font-bold truncate w-full min-w-0">
              {officialEvent && loading ? (
                <Skeleton className="h-6 w-50" />
              ) : (
                officialEvent?.title
              )}
            </div>
          </CardHeader>
          <CardBody className="px-5 py-3">
            <div className="flex items-center gap-5">
              <div>
                <Image
                  alt="シティリーグ"
                  src="/city.png"
                  radius="none"
                  className="h-24 w-24 object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-tiny">
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="font-bold truncate w-full min-w-0">
                  <Skeleton className="h-5 w-44" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </Link>
    </div>
  );
}
