"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Spinner } from "@heroui/spinner";

import DisplayRecordById from "@app/components/organisms/Record//DisplayRecordById";

import { RecordGetByIdResponseType } from "@app/types/record";

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
  const [record, setRecord] = useState<RecordGetByIdResponseType>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session, status } = useSession();

  // モーダルから遷移してきた場合のフラグ管理。
  // マウント時に reopenModalRecordId を詳細ページ専用キーへ移動しておき、
  // ナビバー等のリンク遷移（router.push → pushState）が発生した場合はキーを削除する。
  // スワイプバック・ブラウザバック（popstate）では pushState が呼ばれないため
  // キーはそのまま残り、cleanup 時に reopenModalRecordId として復元することで
  // バック遷移時のみモーダルを再開する。
  useEffect(() => {
    const pendingId = sessionStorage.getItem("reopenModalRecordId");
    const pendingEventType = sessionStorage.getItem("reopenModalEventType");
    // デッキの記録一覧モーダルから遷移してきた場合の再開対象 deck.id。
    // record 系キーと同じライフサイクル（バック遷移時のみ復元）で扱う。
    const pendingDeckId = sessionStorage.getItem("reopenDeckModalDeckId");

    if (pendingId && pendingId === id) {
      sessionStorage.setItem("detailPagePendingReopenRecordId", pendingId);
      if (pendingEventType) {
        sessionStorage.setItem("detailPagePendingReopenEventType", pendingEventType);
      }
      if (pendingDeckId) {
        sessionStorage.setItem("detailPagePendingReopenDeckId", pendingDeckId);
      }
      sessionStorage.removeItem("reopenModalRecordId");
      sessionStorage.removeItem("reopenModalEventType");
      sessionStorage.removeItem("reopenDeckModalDeckId");
    }

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args: Parameters<typeof window.history.pushState>) {
      sessionStorage.removeItem("detailPagePendingReopenRecordId");
      sessionStorage.removeItem("detailPagePendingReopenEventType");
      sessionStorage.removeItem("detailPagePendingReopenDeckId");
      return originalPushState.apply(window.history, args);
    };

    return () => {
      window.history.pushState = originalPushState;

      const savedId = sessionStorage.getItem("detailPagePendingReopenRecordId");
      const savedEventType = sessionStorage.getItem("detailPagePendingReopenEventType");
      const savedDeckId = sessionStorage.getItem("detailPagePendingReopenDeckId");
      if (savedId) {
        // pushState が発生しなかった（バック遷移）場合のみここに来る
        sessionStorage.setItem("reopenModalRecordId", savedId);
        if (savedEventType) {
          sessionStorage.setItem("reopenModalEventType", savedEventType);
        }
        if (savedDeckId) {
          sessionStorage.setItem("reopenDeckModalDeckId", savedDeckId);
        }
        sessionStorage.removeItem("detailPagePendingReopenRecordId");
        sessionStorage.removeItem("detailPagePendingReopenEventType");
        sessionStorage.removeItem("detailPagePendingReopenDeckId");
      }
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const record = await fetchRecordById(id);
        setRecord(record);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      <div className="pt-15 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
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
