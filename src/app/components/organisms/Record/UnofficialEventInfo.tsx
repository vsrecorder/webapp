import { useEffect, useState } from "react";

import { useSeededResource } from "@app/hooks/useSeededResource";

import { Chip } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordInfoCardBase from "@app/components/organisms/Record/RecordInfoCardBase";
import RecordInfoCardSkeleton from "@app/components/organisms/Record/Skeleton/RecordInfoCardSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { EnvironmentType } from "@app/types/environment";
import { formatJSTDateWithWeekday, nonZeroDate } from "@app/utils/date";

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
  // 自由形式イベント情報。参照先が変わると取り直し、失敗時は retry(FetchError のリロード)で取り直す
  const {
    data: unofficialEvent,
    loading: loadingUnofficialEvent,
    error,
    retry: loadUnofficialEvent,
  } = useSeededResource(record?.unofficial_event_id, fetchUnofficialEventById);

  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);

  // 開催日(event_date 優先、ゼロ値なら unofficial_events.date / created_at)を基に
  // 対戦環境を取得する
  useEffect(() => {
    const dateStr =
      nonZeroDate(record?.event_date) ?? nonZeroDate(unofficialEvent?.date) ?? record?.created_at;
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
    nonZeroDate(record.event_date) ?? nonZeroDate(unofficialEvent?.date) ?? record.created_at;

  const date = formatJSTDateWithWeekday(eventDateSource);

  return (
    <>
      <RecordInfoCardBase
        icon={<LuPencilLine className="w-6 h-6 text-default-500" />}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[0.625rem] font-bold gap-0.5 pl-1.5 bg-default-200 text-default-600"
            >
              自由形式
            </Chip>
            {environment?.title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[0.625rem] truncate" }}
              >
                {`『${environment.title}』`}
              </Chip>
            )}
            {record.ignore_stats_flg && (
              <Chip
                size="sm"
                variant="solid"
                color="warning"
                className="h-5 text-[0.625rem] font-bold"
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
