"use client";

import { useMemo } from "react";

import { Image } from "@heroui/react";

import { LuMapPin, LuSwords } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";
import { type RecordMetaRow } from "@app/components/organisms/Record/RecordMetaRows";
import { RecordCardSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import {
  getEventIconUrl,
  getEventAccentColor,
  cleanOfficialEventTitle,
  shouldShowEnvironmentChip,
} from "@app/components/organisms/Record/officialEventHelpers";
import {
  RecordCardProps,
  fetchOfficialEventById,
  useRecordCard,
} from "@app/components/organisms/Record/useRecordCard";
import { useRecordCardResource } from "@app/hooks/useRecordCardResource";
import { createLazyModal } from "@app/utils/lazyModal";
import { formatJSTDateWithWeekday, nonZeroDate } from "@app/utils/date";

// 記録詳細モーダルは使用デッキ編集(react-select)とシェア(画像書き出し)を抱える。
// 初期JSと初期マウントから外すため、開くまで読み込まない(理由は createLazyModal を参照)。
const DisplayRecordModal = createLazyModal(
  () => import("@app/components/organisms/Record/Modal/DisplayRecordModal"),
);

export default function OfficialEventRecord(props: RecordCardProps) {
  const { recordData, enableDisplayRecordModal, nestedInModal = false } = props;

  // 公式イベント情報。一覧 API が付けていればそれを使い、無ければ自分で取る
  const event = useRecordCardResource(
    recordData.data.official_event_id,
    fetchOfficialEventById,
    recordData.details?.official_event,
  );
  // 表示用にタイトルを整形したもの(元の値は書き換えない)
  const officialEvent = useMemo(
    () =>
      event.data ? { ...event.data, title: cleanOfficialEventTitle(event.data.title) } : null,
    [event.data],
  );

  const { record, setRecord, deck, matchSummary, loadingMatches, disclosure } = useRecordCard({
    ...props,
    eventLoading: event.loading,
  });

  if (event.error) {
    return <FetchError onRetry={event.retry} compact />;
  }

  if (deck.error) {
    return <FetchError onRetry={deck.retry} compact />;
  }

  if (event.loading || !officialEvent) {
    return <RecordCardSkeleton />;
  }

  if (!record) {
    return;
  }

  const date = formatJSTDateWithWeekday(nonZeroDate(record.event_date) ?? record.created_at);

  // 補足行。会場 → 対戦環境の順で、記録詳細のヒーローと同じ並び・同じアイコンにする
  const metaCandidates: (RecordMetaRow | null)[] = [
    officialEvent.shop_name
      ? { icon: <LuMapPin className="h-3 w-3" />, text: officialEvent.shop_name }
      : null,
    officialEvent.environment_title && shouldShowEnvironmentChip(officialEvent)
      ? {
          icon: <LuSwords className="h-3 w-3" />,
          text: `『${officialEvent.environment_title}』`,
        }
      : null,
  ];
  const meta = metaCandidates.filter((row): row is RecordMetaRow => row !== null);

  return (
    <>
      {enableDisplayRecordModal && (
        <DisplayRecordModal
          record={record}
          setRecord={setRecord}
          isOpen={disclosure.isOpen}
          onOpenChange={disclosure.onOpenChange}
          onClose={disclosure.onClose}
          nestedInModal={nestedInModal}
        />
      )}

      <RecordCardBase
        cardId={`record-card-${recordData.data.id}`}
        onClick={disclosure.onOpen}
        accentColorClass={getEventAccentColor(officialEvent)}
        date={date}
        title={officialEvent.title}
        loadingTitle={false}
        meta={meta}
        tags={record.tags}
        ignoreStatsFlg={record.ignore_stats_flg}
        regulationId={record.regulation_id}
        icon={
          <Image
            alt={officialEvent.title}
            src={getEventIconUrl(officialEvent)}
            radius="none"
            className="w-7 h-7 object-contain"
          />
        }
        deckName={deck.data ? deck.data.name : null}
        deckSprites={deck.data?.pokemon_sprites}
        loadingDeck={deck.loading}
        winCount={matchSummary.wins}
        lossCount={matchSummary.losses}
        drawCount={matchSummary.draws}
        hasGroupMatch={matchSummary.has_group_match}
        hasBo3={matchSummary.has_bo3}
        loadingMatches={loadingMatches}
      />
    </>
  );
}
