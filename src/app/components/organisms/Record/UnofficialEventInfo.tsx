import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordInfoCardBase from "@app/components/organisms/Record/RecordInfoCardBase";
import RecordInfoCardSkeleton from "@app/components/organisms/Record/Skeleton/RecordInfoCardSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { EnvironmentType } from "@app/types/environment";

async function fetchUnofficialEventById(
  id: string,
): Promise<UnofficialEventGetByIdResponseType> {
  const res = await fetch(`/api/unofficial_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return (await res.json()) as UnofficialEventGetByIdResponseType;
}

// 開催日(YYYY-MM-DD)時点の対戦環境を取得する
async function fetchEnvironment(date: string | Date) {
  const res = await fetch(`/api/environments?date=${date.toString().split("T")[0]}`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: EnvironmentType = await res.json();

  return ret;
}

type Props = {
  record: RecordGetByIdResponseType | null;
};

export default function UnofficialEventInfo({ record }: Props) {
  const [unofficialEvent, setUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [loadingUnofficialEvent, setLoadingUnofficialEvent] = useState(true);

  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);

  const [error, setError] = useState(false);

  // 自由形式イベント情報だけを取得（失敗時のリロードから再利用）
  const loadUnofficialEvent = useCallback(async () => {
    if (!record?.unofficial_event_id) {
      setLoadingUnofficialEvent(false);
      return;
    }

    setError(false);
    setLoadingUnofficialEvent(true);

    try {
      const data = await fetchUnofficialEventById(record.unofficial_event_id);
      setUnofficialEvent(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoadingUnofficialEvent(false);
    }
  }, [record?.unofficial_event_id]);

  useEffect(() => {
    loadUnofficialEvent();
  }, [loadUnofficialEvent]);

  // 開催日(event_date 優先、ゼロ値なら unofficial_events.date / created_at)を基に
  // 対戦環境を取得する
  useEffect(() => {
    const dateStr =
      record?.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : unofficialEvent?.date && !unofficialEvent.date.startsWith("0001-01-01")
          ? unofficialEvent.date
          : record?.created_at;
    if (!dateStr) {
      return;
    }

    const fetchData = async () => {
      try {
        const data = await fetchEnvironment(dateStr);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, [record?.event_date, record?.created_at, unofficialEvent?.date]);

  if (error) {
    return <FetchError onRetry={loadUnofficialEvent} compact />;
  }

  if (loadingUnofficialEvent) {
    return <RecordInfoCardSkeleton />;
  }

  if (!record) {
    return;
  }

  // 開催日は records.event_date(ユーザ入力値)を優先し、
  // 未設定(ゼロ値)の場合は unofficial_events.date または記録の作成日へフォールバックする。
  const eventDateSource =
    record.event_date && !record.event_date.startsWith("0001-01-01")
      ? record.event_date
      : unofficialEvent?.date && !unofficialEvent.date.startsWith("0001-01-01")
        ? unofficialEvent.date
        : record.created_at;

  const date = new Date(eventDateSource).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      <RecordInfoCardBase
        icon={<LuPencilLine className="w-6 h-6 text-default-500" />}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[10px] font-bold gap-0.5 pl-1.5 bg-default-200 text-default-600"
            >
              自由形式
            </Chip>
            {environment?.title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[10px] truncate" }}
              >
                {`『${environment.title}』`}
              </Chip>
            )}
            {record.ignore_stats_flg && (
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                className="h-5 text-[10px] font-bold"
              >
                ⚠ 集計対象外
              </Chip>
            )}
          </>
        }
        title={unofficialEvent?.title ?? "無題のイベント"}
        date={date}
        metaRows={[]}
      />
    </>
  );
}
