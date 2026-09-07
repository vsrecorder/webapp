"use client";

import { Chip } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";
import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";
import TonamelCardBg from "@app/components/organisms/Record/TonamelCardBg";
import { RecordCardSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import {
  RecordCardProps,
  fetchTonamelEventById,
  useRecordCard,
} from "@app/components/organisms/Record/useRecordCard";
import { useSeededResource } from "@app/hooks/useSeededResource";
import { createLazyModal } from "@app/utils/lazyModal";
import { formatJSTDateWithWeekday, nonZeroDate } from "@app/utils/date";

// 記録詳細モーダルは使用デッキ編集(react-select)とシェア(画像書き出し)を抱える。
// 初期JSと初期マウントから外すため、開くまで読み込まない(理由は createLazyModal を参照)。
const DisplayRecordModal = createLazyModal(
  () => import("@app/components/organisms/Record/Modal/DisplayRecordModal"),
);

export default function TonamelEventRecord(props: RecordCardProps) {
  const { recordData, enableDisplayRecordModal, nestedInModal = false } = props;

  // Tonamel イベント情報。一覧 API が付けていればそれを使い、無ければ自分で取る
  const event = useSeededResource(
    recordData.data.tonamel_event_id,
    fetchTonamelEventById,
    recordData.details?.tonamel_event,
  );
  const tonamelEvent = event.data;

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

  if (event.loading || !tonamelEvent) {
    return <RecordCardSkeleton />;
  }

  if (!record) {
    return;
  }

  const date = formatJSTDateWithWeekday(nonZeroDate(record.event_date) ?? record.created_at);

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
        accentColorClass="bg-orange-500"
        bgMedia={<TonamelCardBg image={tonamelEvent.image} />}
        date={date}
        title={tonamelEvent.title}
        loadingTitle={false}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[0.625rem] font-bold bg-orange-100 text-orange-500"
            >
              Tonamel
            </Chip>
          </>
        }
        tags={record.tags}
        ignoreStatsFlg={record.ignore_stats_flg}
        regulationId={record.regulation_id}
        icon={
          <div className="w-full h-full bg-orange-500 flex items-center justify-center">
            <span className="text-sm font-black text-white">T</span>
          </div>
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
