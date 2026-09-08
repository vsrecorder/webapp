"use client";

import { SetStateAction, Dispatch } from "react";

import { useSeededResource } from "@app/hooks/useSeededResource";

import { Image } from "@heroui/react";
import { Link } from "@heroui/react";
import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuLink } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordInfoCardBase from "@app/components/organisms/Record/RecordInfoCardBase";
import RecordInfoCardSkeleton from "@app/components/organisms/Record/Skeleton/RecordInfoCardSkeleton";
import {
  cleanOfficialEventTitle,
  getEventIconUrl,
  shouldShowEnvironmentChip,
} from "@app/components/organisms/Record/officialEventHelpers";
import EditTCGMeisterURLModal from "@app/components/organisms/Record/Modal//EditTCGMeisterURLModal";

import { RecordGetByIdResponseType } from "@app/types/record";

import { safeExternalUrl } from "@app/utils/url";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { formatJSTDateWithWeekday, isZeroDate } from "@app/utils/date";

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

    ret.title = cleanOfficialEventTitle(ret.title);

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
  // 公式イベント情報。参照先が変わると取り直し、失敗時は retry(FetchError のリロード)で取り直す
  const {
    data: officialEvent,
    loading: loadingOfficialEvent,
    error,
    retry: loadOfficialEvent,
  } = useSeededResource(record?.official_event_id, fetchOfficialEventById);

  const {
    isOpen: isOpenForTCGMeisterURLModal,
    onOpen: onOpenForTCGMeisterURLModal,
    onOpenChange: onOpenChangeForTCGMeisterURLModal,
  } = useDisclosure();

  if (error) {
    return <FetchError onRetry={loadOfficialEvent} compact />;
  }

  if (loadingOfficialEvent || !officialEvent) {
    return <RecordInfoCardSkeleton />;
  }

  if (!record) {
    return;
  }

  const dateStr =
    !isZeroDate(record.event_date)
      ? record.event_date
      : record.created_at;
  const date = formatJSTDateWithWeekday(dateStr);

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
            {officialEvent.environment_title &&
              shouldShowEnvironmentChip(officialEvent) && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="h-5 max-w-30"
                  classNames={{ content: "text-[0.625rem] truncate min-w-0" }}
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
                classNames={{ content: "text-[0.625rem] truncate min-w-0" }}
              >
                {officialEvent.shop_name?.trim() || officialEvent.venue?.trim()}
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
          ) : safeExternalUrl(record.tcg_meister_url) ? (
            <Link
              isExternal
              href={safeExternalUrl(record.tcg_meister_url)}
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
