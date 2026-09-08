"use client";

import { SetStateAction, Dispatch } from "react";

import { useSeededResource } from "@app/hooks/useSeededResource";

import { addToast, useDisclosure } from "@heroui/react";

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
  // デッキコードの下に、展開でカード内訳を見られるカードリストのアコーディオンを置く
  enableCardList?: boolean;
  // true の間はデータが揃っていてもスケルトンを出し続ける。
  // モーダルの入場アニメーション中に実データへの差し替え(大きなコミット)が走ると
  // シートの動きが止まるため、着地までの間これを立てて差し替えを遅延させる。
  holdSkeleton?: boolean;
};

export default function UsedDeckById({
  record,
  setRecord,
  enableShowDeckModal,
  enableUpdateUsedDeckModal,
  compact = false,
  enableCardList = false,
  holdSkeleton = false,
}: Props) {
  const deckId = record?.deck_id;
  const deckCodeId = record?.deck_code_id;

  // 使用デッキ本体とバージョン。失敗したほうだけ retry(FetchError のリロード)で取り直す。
  // 新バージョンの作成やデッキ選択の結果は setData で差し替える
  const {
    data: deck,
    setData: setDeck,
    loading: loading1,
    error: deckError,
    retry: loadDeck,
  } = useSeededResource(deckId, fetchDeckById);
  const {
    data: deckcode,
    setData: setDeckCode,
    loading: loading2,
    error: codeError,
    retry: loadDeckCode,
  } = useSeededResource(deckCodeId, fetchDeckCodeById);

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
      regulation_id: targetRecord.regulation_id,
      tcg_meister_url: targetRecord.tcg_meister_url,
      memo: targetRecord.memo,
      event_date: targetRecord.event_date,
      unofficial_event_id: targetRecord.unofficial_event_id,
      // tag_ids は送った集合に置き換わるため、変更しない場合も現在の付与を送り直す。
      tag_ids: (targetRecord.tags ?? []).map((tag) => tag.id),
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

  if (loading1 || loading2 || holdSkeleton) {
    return <DeckCardSkeleton compact={compact} enableCardList={enableCardList} />;
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
          enableCardList={enableCardList}
        />
      </div>
    </>
  );
}
