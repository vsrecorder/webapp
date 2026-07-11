"use client";

import { useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

import { Image } from "@heroui/react";
import { Link } from "@heroui/react";
import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuLink } from "react-icons/lu";

import RecordInfoCardBase from "@app/components/organisms/Record/RecordInfoCardBase";
import RecordInfoCardSkeleton from "@app/components/organisms/Record/Skeleton/RecordInfoCardSkeleton";
import {
  getEventIconUrl,
  getChipColor,
  getEventTypeName,
} from "@app/components/organisms/Record/officialEventHelpers";
import EditTCGMeisterURLModal from "@app/components/organisms/Record/Modal//EditTCGMeisterURLModal";

import { RecordGetByIdResponseType } from "@app/types/record";
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
  record: RecordGetByIdResponseType | null;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  enableEditTCGMeisterURL: boolean;
};

export default function OfficialEventInfo({
  record,
  setRecord,
  enableEditTCGMeisterURL,
}: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [loadingOfficialEvent, setLoadingOfficialEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isOpen: isOpenForTCGMeisterURLModal,
    onOpen: onOpenForTCGMeisterURLModal,
    onOpenChange: onOpenChangeForTCGMeisterURLModal,
  } = useDisclosure();

  useEffect(() => {
    if (!record?.official_event_id) {
      setLoadingOfficialEvent(false);
      return;
    }

    setLoadingOfficialEvent(true);

    const fetchData = async () => {
      try {
        setLoadingOfficialEvent(true);

        const data = await fetchOfficialEventById(record.official_event_id);

        data.title = data.title.replace(/【.*?】ポケモンカードジム　/g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードジム /g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードジム  /g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードジム   /g, "");
        data.title = data.title.replace(
          /【.*?】エクストラバトルの日/g,
          "エクストラバトルの日",
        );
        data.title = data.title.replace(/【.*?】ポケモンカードゲーム　/g, "");
        data.title = data.title.replace(/ポケモンカードゲーム /g, "");
        data.title = data.title.replace(/（オープンリーグ）/g, "");
        data.title = data.title.replace(/（マスターリーグ）/g, "");
        data.title = data.title.replace(/（シニアリーグ）/g, "");
        data.title = data.title.replace(/（ジュニアリーグ）/g, "");
        data.title = data.title.replace(/（スタンダード）/g, "");
        data.title = data.title.replace(/（.*?）/g, "");

        setOfficialEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingOfficialEvent(false);
      }
    };

    fetchData();
  }, [record?.official_event_id]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loadingOfficialEvent || !officialEvent) {
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
      <EditTCGMeisterURLModal
        record={record}
        setRecord={setRecord}
        isOpen={isOpenForTCGMeisterURLModal && enableEditTCGMeisterURL}
        onOpenChange={onOpenChangeForTCGMeisterURLModal}
      />

      <RecordInfoCardBase
        iconBoxClassName="bg-default-50"
        icon={
          <Image
            alt={officialEvent.title}
            src={getEventIconUrl(officialEvent)}
            radius="none"
            className="w-10 h-10 object-contain"
          />
        }
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              color={getChipColor(officialEvent)}
              className="h-5 text-[10px] font-bold"
            >
              {getEventTypeName(officialEvent)}
            </Chip>
            {officialEvent.environment_title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[10px] truncate min-w-0" }}
              >
                {`『${officialEvent.environment_title}』`}
              </Chip>
            )}
            {(officialEvent.shop_name?.trim() || officialEvent.venue?.trim()) && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[10px] truncate min-w-0" }}
              >
                {officialEvent.shop_name?.trim() || officialEvent.venue?.trim()}
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
        title={officialEvent.title}
        date={date}
        action={
          enableEditTCGMeisterURL ? (
            <button
              type="button"
              aria-label="TCGマイスターURLを編集"
              onClick={onOpenForTCGMeisterURLModal}
              className="p-2 rounded-lg text-default-400 hover:text-default-600 hover:bg-default-100 transition-colors"
            >
              <LuLink className="w-4 h-4" />
            </button>
          ) : record.tcg_meister_url ? (
            <Link
              isExternal
              href={record.tcg_meister_url}
              aria-label="TCGマイスターURLを開く"
              className="p-2 rounded-lg text-default-400 hover:text-default-600 hover:bg-default-100 transition-colors"
            >
              <LuLink className="w-4 h-4" />
            </Link>
          ) : null
        }
        metaRows={[]}
      />
    </>
  );
}
