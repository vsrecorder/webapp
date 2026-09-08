"use client";

import { useSession } from "next-auth/react";

import { useEffect } from "react";

import { useSeededResource } from "@app/hooks/useSeededResource";

import { Spinner } from "@heroui/spinner";

import DisplayRecordById from "@app/components/organisms/Record//DisplayRecordById";
import FetchError from "@app/components/molecules/FetchError";

import { RecordGetByIdResponseType } from "@app/types/record";

import { isModalHistoryPushState } from "@app/utils/modalHistory";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";
import {
  REOPEN_DECK_MODAL_DECK_ID,
  REOPEN_DECK_MODAL_ARCHIVED,
  REOPEN_DECK_MODAL_WITH_RECORDS,
} from "@app/utils/deckModalReopen";
import {
  REOPEN_MODAL_RECORD_ID,
  REOPEN_MODAL_EVENT_TYPE,
  PENDING_REOPEN_RECORD_ID,
  PENDING_REOPEN_EVENT_TYPE,
  PENDING_REOPEN_DECK_ID,
  PENDING_REOPEN_ARCHIVED,
  PENDING_REOPEN_WITH_RECORDS,
} from "@app/utils/recordModalReopen";

async function fetchRecordById(id: string) {
  try {
    const res = await fetch(`/api/records/` + id, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: string;
};

export default function RecordById({ id }: Props) {
  // 記録本体。id が変わると取り直し、失敗時は retry(FetchError のリロード)で取り直す
  const { data: record, loading, error, retry: loadRecord } = useSeededResource(
    id,
    fetchRecordById,
  );

  const { data: session, status } = useSession();

  // モーダルから遷移してきた場合のフラグ管理。
  // マウント時に reopenModalRecordId を詳細ページ専用キーへ移動しておき、
  // ナビバー等のリンク遷移（router.push → pushState）が発生した場合はキーを削除する。
  // スワイプバック・ブラウザバック（popstate）では pushState が呼ばれないため
  // キーはそのまま残り、cleanup 時に reopenModalRecordId として復元することで
  // バック遷移時のみモーダルを再開する。
  useEffect(() => {
    const pendingId = sessionStorage.getItem(REOPEN_MODAL_RECORD_ID);
    const pendingEventType = sessionStorage.getItem(REOPEN_MODAL_EVENT_TYPE);
    // デッキの記録一覧モーダルから遷移してきた場合の再開対象 deck.id。
    // record 系キーと同じライフサイクル（バック遷移時のみ復元）で扱う。
    const pendingDeckId = sessionStorage.getItem(REOPEN_DECK_MODAL_DECK_ID);
    // 対象デッキがアーカイブ済みか（戻り時のデッキページのタブ切り替え用）。
    const pendingDeckArchived = sessionStorage.getItem(REOPEN_DECK_MODAL_ARCHIVED);
    // 記録一覧モーダルまで開き直すか。deck 系キーと必ず同じライフサイクルで扱う
    // （取り残すと、後のデッキモーダル発の遷移で誤って記録一覧モーダルが開く）。
    const pendingDeckWithRecords = sessionStorage.getItem(REOPEN_DECK_MODAL_WITH_RECORDS);

    if (pendingId && pendingId === id) {
      writeSessionStorage(PENDING_REOPEN_RECORD_ID, pendingId);
      if (pendingEventType) {
        writeSessionStorage(PENDING_REOPEN_EVENT_TYPE, pendingEventType);
      }
      if (pendingDeckId) {
        writeSessionStorage(PENDING_REOPEN_DECK_ID, pendingDeckId);
      }
      if (pendingDeckArchived) {
        writeSessionStorage(PENDING_REOPEN_ARCHIVED, pendingDeckArchived);
      }
      if (pendingDeckWithRecords) {
        writeSessionStorage(PENDING_REOPEN_WITH_RECORDS, pendingDeckWithRecords);
      }
      writeSessionStorage(REOPEN_MODAL_RECORD_ID, null);
      writeSessionStorage(REOPEN_MODAL_EVENT_TYPE, null);
      writeSessionStorage(REOPEN_DECK_MODAL_DECK_ID, null);
      writeSessionStorage(REOPEN_DECK_MODAL_ARCHIVED, null);
      writeSessionStorage(REOPEN_DECK_MODAL_WITH_RECORDS, null);
    }

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args: Parameters<typeof window.history.pushState>) {
      // モーダル表示中のバック対策（useCloseModalOnBack）が積む戻り先は
      // ページ遷移ではないため、モーダルを開いただけでフラグを捨てないよう除外する
      if (!isModalHistoryPushState(args[0])) {
        writeSessionStorage(PENDING_REOPEN_RECORD_ID, null);
        writeSessionStorage(PENDING_REOPEN_EVENT_TYPE, null);
        writeSessionStorage(PENDING_REOPEN_DECK_ID, null);
        writeSessionStorage(PENDING_REOPEN_ARCHIVED, null);
        writeSessionStorage(PENDING_REOPEN_WITH_RECORDS, null);
      }
      return originalPushState.apply(window.history, args);
    };

    return () => {
      window.history.pushState = originalPushState;

      const savedId = sessionStorage.getItem(PENDING_REOPEN_RECORD_ID);
      const savedEventType = sessionStorage.getItem(PENDING_REOPEN_EVENT_TYPE);
      const savedDeckId = sessionStorage.getItem(PENDING_REOPEN_DECK_ID);
      const savedDeckArchived = sessionStorage.getItem(PENDING_REOPEN_ARCHIVED);
      const savedDeckWithRecords = sessionStorage.getItem(PENDING_REOPEN_WITH_RECORDS);
      if (savedId) {
        // pushState が発生しなかった（バック遷移）場合のみここに来る
        writeSessionStorage(REOPEN_MODAL_RECORD_ID, savedId);
        if (savedEventType) {
          writeSessionStorage(REOPEN_MODAL_EVENT_TYPE, savedEventType);
        }
        if (savedDeckId) {
          writeSessionStorage(REOPEN_DECK_MODAL_DECK_ID, savedDeckId);
        }
        if (savedDeckArchived) {
          writeSessionStorage(REOPEN_DECK_MODAL_ARCHIVED, savedDeckArchived);
        }
        if (savedDeckWithRecords) {
          writeSessionStorage(REOPEN_DECK_MODAL_WITH_RECORDS, savedDeckWithRecords);
        }
        writeSessionStorage(PENDING_REOPEN_RECORD_ID, null);
        writeSessionStorage(PENDING_REOPEN_EVENT_TYPE, null);
        writeSessionStorage(PENDING_REOPEN_DECK_ID, null);
        writeSessionStorage(PENDING_REOPEN_ARCHIVED, null);
        writeSessionStorage(PENDING_REOPEN_WITH_RECORDS, null);
      }
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="pt-30 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  } else if (status == "unauthenticated") {
    return;
  }

  if (loading) {
    return (
      <div className="pt-30 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-15 px-4 flex items-center justify-center">
        <FetchError onRetry={loadRecord} />
      </div>
    );
  }

  if (!record || !session) {
    return;
  }

  if (record.user_id !== session.user.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-sm text-center">この記録は非公開に設定されています</div>
      </div>
    );
  }

  return (
    <>
      <DisplayRecordById recordData={record} />
    </>
  );
}
