"use client";

import { Chip } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";
import { RecordCardSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import {
  RecordCardProps,
  fetchUnofficialEventById,
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

export default function UnofficialEventRecord(props: RecordCardProps) {
  const { recordData, enableDisplayRecordModal, nestedInModal = false } = props;

  // 自由形式イベント情報。一覧 API が付けていればそれを使い、無ければ自分で取る
  const event = useSeededResource(
    recordData.data.unofficial_event_id,
    fetchUnofficialEventById,
    recordData.details?.unofficial_event,
  );
  const unofficialEvent = event.data;

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

  if (event.loading) {
    return <RecordCardSkeleton />;
  }

  if (!record) {
    return;
  }

  // 開催日は records.event_date(ユーザ入力値)を優先し、
  // 未設定(ゼロ値)の場合は unofficial_events.date または記録の作成日へフォールバックする。
  const date = formatJSTDateWithWeekday(
    nonZeroDate(record.event_date) ?? nonZeroDate(unofficialEvent?.date) ?? record.created_at,
  );

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
        accentColorClass="bg-default-400"
        date={date}
        title={unofficialEvent?.title ?? ""}
        loadingTitle={event.loading}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[0.625rem] font-bold gap-0.5 pl-1.5 bg-default-200 text-default-600"
            >
              自由形式
            </Chip>
          </>
        }
        tags={record.tags}
        ignoreStatsFlg={record.ignore_stats_flg}
        regulationId={record.regulation_id}
        icon={<LuPencilLine className="w-5 h-5 text-default-500" />}
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
