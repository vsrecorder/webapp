import { useEffect, useState, useRef } from "react";

import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";
import DisplayRecordModal from "@app/components/organisms/Record/Modal/DisplayRecordModal";
import { RecordCardSkeleton } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";

import { RecordType, RecordGetByIdResponseType } from "@app/types/record";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { EnvironmentType } from "@app/types/environment";
import { MatchGetResponseType } from "@app/types/match";
import { countMatchResults } from "@app/utils/match";

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

  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);

  const [unofficialEvent, setUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [loadingUnofficialEvent, setLoadingUnofficialEvent] = useState(true);

  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!recordData.data.unofficial_event_id) {
      setLoadingUnofficialEvent(false);
      return;
    }

    setLoadingUnofficialEvent(true);

    const fetchData = async () => {
      try {
        setLoadingUnofficialEvent(true);
        const data = await fetchUnofficialEventById(recordData.data.unofficial_event_id);
        setUnofficialEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingUnofficialEvent(false);
      }
    };

    fetchData();
  }, [recordData.data.unofficial_event_id]);

  useEffect(() => {
    if (!record?.deck_id) {
      setLoadingDeck(false);
      return;
    }

    setLoadingDeck(true);

    const fetchData = async () => {
      try {
        setLoadingDeck(true);
        const data = await fetchDeckById(record.deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingDeck(false);
      }
    };

    fetchData();
  }, [record?.deck_id]);

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
    return <div className="text-red-500">{error}</div>;
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
              記入形式
            </Chip>
            {environment?.title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 text-[10px] font-bold"
              >
                {`『${environment.title}』`}
              </Chip>
            )}
          </>
        }
        icon={<LuPencilLine className="w-4 h-4 text-default-500" />}
        deckName={deck ? deck.name : null}
        deckSprites={deck?.pokemon_sprites}
        loadingDeck={loadingDeck}
        winCount={wins}
        lossCount={losses}
        loadingMatches={loadingMatches}
      />
    </>
  );
}
