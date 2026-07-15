import { useCallback, useEffect, useState, useRef } from "react";

import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";
import DisplayRecordModal from "@app/components/organisms/Record/Modal/DisplayRecordModal";
import { RecordCardSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

import { RecordType, RecordGetByIdResponseType } from "@app/types/record";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { MatchGetResponseType } from "@app/types/match";
import { countMatchResults, hasGroupMatch, hasBo3Match } from "@app/utils/match";

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

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchMatchesByRecordId(record_id: string) {
  try {
    const res = await fetch(`/api/records/${record_id}/matches`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: MatchGetResponseType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  recordData: RecordType;
  enableDisplayRecordModal: boolean;
  onReopenComplete?: () => void;
  // 再開対象として reopenModalRecordId を消費してよいか。
  // 記録一覧では「すべて」タブと種別タブで同じ記録が重複マウントされるため、
  // アクティブなタブのインスタンスだけ true にしてキーの奪い合いを防ぐ。
  enableReopen?: boolean;
  // 親モーダルが落ち着き、記録モーダルを開いてよい状態か。
  // 親モーダル（デッキの記録一覧モーダル）が無い場合は常に true。
  reopenReady?: boolean;
  // デッキの記録一覧モーダル内で表示されているか（記録モーダルのバックドロップ調整用）。
  nestedInModal?: boolean;
};

export default function UnofficialEventRecord({
  recordData,
  enableDisplayRecordModal,
  onReopenComplete,
  enableReopen = true,
  reopenReady = true,
  nestedInModal = false,
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);

  const [matches, setMatches] = useState<MatchGetResponseType[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [unofficialEvent, setUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [loadingUnofficialEvent, setLoadingUnofficialEvent] = useState(true);

  const [eventError, setEventError] = useState(false);
  const [deckError, setDeckError] = useState(false);

  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(recordData.data);

  const [shouldReopen, setShouldReopen] = useState(false);
  const onReopenCompleteRef = useRef(onReopenComplete);
  onReopenCompleteRef.current = onReopenComplete;

  const {
    isOpen: isOpenForDisplayRecordModal,
    onOpen: onOpenForDisplayRecordModal,
    onOpenChange: onOpenChangeForDisplayRecordModal,
    onClose: onCloseForDisplayRecordModal,
  } = useDisclosure();

  // マウント時に対象 record か判定だけ行う
  useEffect(() => {
    if (!enableReopen) return;
    const pendingId = sessionStorage.getItem("reopenModalRecordId");
    if (pendingId && pendingId === recordData.data.id) {
      sessionStorage.removeItem("reopenModalRecordId");
      setShouldReopen(true);
    }
  }, [enableReopen]);

  // データロード完了後にスクロール通知 + モーダルオープン
  // 親モーダルが落ち着く（reopenReady）まで待ってから開く。
  useEffect(() => {
    if (!shouldReopen || loadingUnofficialEvent || !reopenReady) return;
    setShouldReopen(false);
    onReopenCompleteRef.current?.();
    onOpenForDisplayRecordModal();
  }, [shouldReopen, loadingUnofficialEvent, reopenReady]);

  // 自由形式イベント情報だけを取得（失敗時のリロードから再利用）
  const loadUnofficialEvent = useCallback(async () => {
    if (!recordData.data.unofficial_event_id) {
      setLoadingUnofficialEvent(false);
      return;
    }

    setEventError(false);
    setLoadingUnofficialEvent(true);

    try {
      const data = await fetchUnofficialEventById(recordData.data.unofficial_event_id);
      setUnofficialEvent(data);
    } catch (err) {
      console.log(err);
      setEventError(true);
    } finally {
      setLoadingUnofficialEvent(false);
    }
  }, [recordData.data.unofficial_event_id]);

  useEffect(() => {
    loadUnofficialEvent();
  }, [loadUnofficialEvent]);

  // 使用デッキだけを取得
  const loadDeck = useCallback(async () => {
    if (!record?.deck_id) {
      setLoadingDeck(false);
      return;
    }

    setDeckError(false);
    setLoadingDeck(true);

    try {
      const data = await fetchDeckById(record.deck_id);
      setDeck(data);
    } catch (err) {
      console.log(err);
      setDeckError(true);
    } finally {
      setLoadingDeck(false);
    }
  }, [record?.deck_id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    if (!record?.id) {
      setLoadingMatches(false);
      return;
    }

    setLoadingMatches(true);

    const fetchData = async () => {
      try {
        setLoadingMatches(true);
        const data = await fetchMatchesByRecordId(record.id);
        setMatches(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchData();
  }, [record?.id]);

  if (eventError) {
    return <FetchError onRetry={loadUnofficialEvent} compact />;
  }

  if (deckError) {
    return <FetchError onRetry={loadDeck} compact />;
  }

  if (loadingUnofficialEvent) {
    return <RecordCardSkeleton />;
  }

  if (!record) {
    return;
  }

  const { wins, losses } = countMatchResults(matches);

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
      {enableDisplayRecordModal && (
        <DisplayRecordModal
          record={record}
          setRecord={setRecord}
          isOpen={isOpenForDisplayRecordModal}
          onOpenChange={onOpenChangeForDisplayRecordModal}
          onClose={onCloseForDisplayRecordModal}
          nestedInModal={nestedInModal}
        />
      )}

      <RecordCardBase
        cardId={`record-card-${recordData.data.id}`}
        onClick={onOpenForDisplayRecordModal}
        accentColorClass="bg-default-400"
        date={date}
        title={unofficialEvent?.title ?? ""}
        loadingTitle={loadingUnofficialEvent}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 text-[10px] font-bold gap-0.5 pl-1.5 bg-default-200 text-default-600"
            >
              自由形式
            </Chip>
          </>
        }
        ignoreStatsFlg={record.ignore_stats_flg}
        icon={<LuPencilLine className="w-4 h-4 text-default-500" />}
        deckName={deck ? deck.name : null}
        deckSprites={deck?.pokemon_sprites}
        loadingDeck={loadingDeck}
        winCount={wins}
        lossCount={losses}
        hasGroupMatch={hasGroupMatch(matches)}
        hasBo3={hasBo3Match(matches)}
        loadingMatches={loadingMatches}
      />
    </>
  );
}
