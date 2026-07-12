"use client";

import { SetStateAction, Dispatch } from "react";

import { useCallback, useEffect, useState } from "react";

import { addToast, useDisclosure } from "@heroui/react";

import { LuPencil } from "react-icons/lu";

import UpdateUsedDeckModal from "@app/components/organisms/Deck/Modal/UpdateUsedDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";
import UsedDeckCard from "@app/components/organisms/Deck/UsedDeckCard";
import { DeckCardSkeleton } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import FetchError from "@app/components/molecules/FetchError";

import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

import {
  RecordGetByIdResponseType,
  RecordUpdateRequestType,
  RecordUpdateResponseType,
} from "@app/types/record";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

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

async function fetchDeckCodeById(id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  record: RecordGetByIdResponseType | null;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  enableShowDeckModal: boolean;
  enableUpdateUsedDeckModal: boolean;
  // デッキ名ヘッダーを省いてデッキコードに特化する(ヒーローに使用デッキ名がある場合)
  compact?: boolean;
};

export default function UsedDeckById({
  record,
  setRecord,
  enableShowDeckModal,
  enableUpdateUsedDeckModal,
  compact = false,
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [deckError, setDeckError] = useState(false);
  const [codeError, setCodeError] = useState(false);

  const {
    isOpen: isOpenForUpdateUsedDeckModal,
    onOpen: onOpenForUpdateUsedDeckModal,
    onOpenChange: onOpenChangeForUpdateUsedDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForCreateDeckCodeModal,
    onOpen: onOpenForCreateDeckCodeModal,
    onOpenChange: onOpenChangeForCreateDeckCodeModal,
  } = useDisclosure();

  // CreateDeckCodeModalはsetDeckCode(ret)という形（更新関数ではなく値）でしか
  // 呼び出さないため、Dispatch<SetStateAction<...>>互換のシグネチャで受けつつ
  // 実質的にはDeckCodeTypeの値のみを扱う
  const attachNewDeckCodeToRecord: Dispatch<SetStateAction<DeckCodeType | null>> = (
    value,
  ) => {
    const newDeckCode = typeof value === "function" ? value(deckcode) : value;

    setDeckCode(newDeckCode);

    if (!record || !newDeckCode) return;

    void updateRecordDeckCode(record, newDeckCode);
  };

  const updateRecordDeckCode = async (
    targetRecord: RecordGetByIdResponseType,
    newDeckCode: DeckCodeType,
  ) => {
    const data: RecordUpdateRequestType = {
      official_event_id: targetRecord.official_event_id,
      tonamel_event_id: targetRecord.tonamel_event_id,
      friend_id: targetRecord.friend_id,
      deck_id: targetRecord.deck_id,
      deck_code_id: newDeckCode.id,
      private_flg: targetRecord.private_flg,
      ignore_stats_flg: targetRecord.ignore_stats_flg,
      tcg_meister_url: targetRecord.tcg_meister_url,
      memo: targetRecord.memo,
      event_date: targetRecord.event_date,
      unofficial_event_id: targetRecord.unofficial_event_id,
    };

    try {
      const res = await fetch(`/api/records/${targetRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to update record");
      }

      const ret: RecordUpdateResponseType = await res.json();

      setRecord((prev) =>
        prev ? { ...prev, deck_id: ret.deck_id, deck_code_id: ret.deck_code_id } : prev,
      );

      triggerNotificationsRefresh();
    } catch (error) {
      console.error(error);

      addToast({
        title: "記録の更新に失敗",
        description: "作成したバージョンを使用したデッキとして登録できませんでした",
        color: "danger",
        timeout: 5000,
      });
    }
  };

  // デッキ本体だけを取得（失敗時のリロードから再利用）
  const loadDeck = useCallback(async () => {
    if (!record?.deck_id) {
      setLoading1(false);
      return;
    }

    setDeckError(false);
    setLoading1(true);

    try {
      const data = await fetchDeckById(record.deck_id);
      setDeck(data);
    } catch (err) {
      console.log(err);
      setDeckError(true);
    } finally {
      setLoading1(false);
    }
  }, [record?.deck_id]);

  // デッキコードだけを取得
  const loadDeckCode = useCallback(async () => {
    if (!record?.deck_code_id) {
      setLoading2(false);
      return;
    }

    setCodeError(false);
    setLoading2(true);

    try {
      const data = await fetchDeckCodeById(record.deck_code_id);
      setDeckCode(data);
    } catch (err) {
      console.log(err);
      setCodeError(true);
    } finally {
      setLoading2(false);
    }
  }, [record?.deck_code_id]);

  useEffect(() => {
    loadDeck();
    loadDeckCode();
  }, [loadDeck, loadDeckCode]);

  if (loading1 || loading2) {
    return <DeckCardSkeleton compact={compact} />;
  }

  // デッキ本体が失敗 → デッキ分だけ再取得
  if (deckError) {
    return <FetchError onRetry={loadDeck} compact={compact} />;
  }

  // デッキコードが失敗 → デッキコード分だけ再取得
  if (codeError) {
    return <FetchError onRetry={loadDeckCode} compact={compact} />;
  }

  return (
    <>
      <UpdateUsedDeckModal
        record={record}
        setRecord={setRecord}
        // 使用デッキ・バージョンが両方とも登録済みの場合の編集は
        // enableUpdateUsedDeckModalに従うが、
        // どちらか未登録（＝これから登録する）場合は
        // 呼び出し元の設定に関わらず常に許可する
        isOpen={
          isOpenForUpdateUsedDeckModal &&
          (enableUpdateUsedDeckModal || !record?.deck_id || !record?.deck_code_id)
        }
        onOpenChange={onOpenChangeForUpdateUsedDeckModal}
      />

      <CreateDeckCodeModal
        deck={deck}
        setDeck={setDeck}
        deckcode={deckcode}
        setDeckCode={attachNewDeckCodeToRecord}
        isOpen={isOpenForCreateDeckCodeModal}
        onOpenChange={onOpenChangeForCreateDeckCodeModal}
      />

      {/* デッキ登録済みかつ編集可能なとき、明示的な「編集」ボタンを出す。
          ボードUIではデッキ画像やコピー用コードが主役でカードのタップが編集導線と
          気づきにくいため、確実に編集モーダルを開けるボタンを用意する。 */}
      {enableUpdateUsedDeckModal && record?.deck_id && (
        <div className="mb-2 flex justify-end" data-capture-hide="true">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenForUpdateUsedDeckModal();
            }}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-tiny font-bold text-primary active:opacity-70"
          >
            <LuPencil className="text-sm" />
            使用したデッキを編集
          </button>
        </div>
      )}

      <div onClick={onOpenForUpdateUsedDeckModal}>
        <UsedDeckCard
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          enableShowDeckModal={enableShowDeckModal}
          onSelectExistingVersion={onOpenForUpdateUsedDeckModal}
          onCreateVersion={onOpenForCreateDeckCodeModal}
          compact={compact}
        />
      </div>
    </>
  );
}
