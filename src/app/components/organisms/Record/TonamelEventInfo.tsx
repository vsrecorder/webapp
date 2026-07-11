import { useEffect, useState } from "react";

import { Link } from "@heroui/react";
import { Chip } from "@heroui/react";

import { LuLink } from "react-icons/lu";

import RecordInfoCardBase from "@app/components/organisms/Record/RecordInfoCardBase";
import RecordInfoCardSkeleton from "@app/components/organisms/Record/Skeleton/RecordInfoCardSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { EnvironmentType } from "@app/types/environment";

async function fetchTonamelEventById(id: string) {
  try {
    const res = await fetch(`/api/tonamel_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: TonamelEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
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

export default function TonamelEventInfo({ record }: Props) {
  const [tonamelEvent, setTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [loadingTonamelEvent, setLoadingTonamelEvent] = useState(true);

  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record?.tonamel_event_id) {
      setLoadingTonamelEvent(false);
      return;
    }

    setLoadingTonamelEvent(true);

    const fetchData = async () => {
      try {
        setLoadingTonamelEvent(true);

        const data = await fetchTonamelEventById(record.tonamel_event_id);

        setTonamelEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingTonamelEvent(false);
      }
    };

    fetchData();
  }, [record?.tonamel_event_id]);

  // 開催日(event_date 優先、ゼロ値なら created_at)を基に対戦環境を取得する
  useEffect(() => {
    const dateStr =
      record?.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
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
  }, [record?.event_date, record?.created_at]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loadingTonamelEvent || !tonamelEvent) {
    return <RecordInfoCardSkeleton />;
  }

  if (!record) {
    return;
  }

  const dateStr =
    record.event_date && !record.event_date.startsWith("0001-01-01")
      ? record.event_date
      : record.created_at;
  const date = new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      <RecordInfoCardBase
        iconBoxClassName="bg-orange-500"
        icon={<span className="text-xl font-black text-white">T</span>}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[10px] font-bold bg-orange-100 text-orange-500"
            >
              Tonamel
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
        title={tonamelEvent.title}
        date={date}
        action={
          <Link
            isExternal
            href={`https://tonamel.com/competition/${record.tonamel_event_id}`}
            aria-label="Tonamelで開く"
            className="p-2 rounded-lg text-default-400 hover:text-default-600 hover:bg-default-100 transition-colors"
          >
            <LuLink className="w-4 h-4" />
          </Link>
        }
        metaRows={[]}
      />
    </>
  );
}
