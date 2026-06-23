"use client";

import { useEffect, useState, useCallback, Fragment } from "react";

import { Spinner } from "@heroui/spinner";
import { Button, Link } from "@heroui/react";

import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import TonamelEventRecord from "@app/components/organisms/Record/TonamelEventRecord";
import { OfficialEventRecordSkeletons } from "@app/components/organisms/Record/Skeleton/OfficialEventRecordSkeleton";
import { TonamelEventRecordSkeletons } from "@app/components/organisms/Record/Skeleton/TonamelEventRecordSkeleton";

import { LuCirclePlus, LuFilePen, LuClipboardList } from "react-icons/lu";

import { RecordType, RecordGetResponseType } from "@app/types/record";

async function fetchRecords(event_type: string, deck_id: string, cursor: string) {
  try {
    const res = await fetch(
      `/api/records?event_type=${event_type}&deck_id=${deck_id}&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  event_type: string;
  deck_id: string;
};

export default function Records({ event_type, deck_id }: Props) {
  const [items, setItems] = useState<RecordType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [pendingReopenId, setPendingReopenId] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const newItems: RecordGetResponseType = await fetchRecords(
        event_type,
        deck_id,
        nextCursor,
      );

      if (newItems.records.length === 0) {
        setHasMore(false);
        return;
      }

      setItems((prev) => [...prev, ...newItems.records]);

      const lastItem = newItems.records[newItems.records.length - 1];
      if (lastItem && lastItem.cursor) {
        const nextItems: RecordGetResponseType = await fetchRecords(
          event_type,
          deck_id,
          lastItem.cursor,
        );

        if (nextItems.records.length === 0) {
          setHasMore(false);
        } else {
          setNextCursor(lastItem.cursor);
        }

        setNextCursor(lastItem.cursor);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [event_type, deck_id, nextCursor, isLoading, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  // 戻り遷移時に対象 record の event_type が一致する場合だけ ID を保持
  useEffect(() => {
    const id = sessionStorage.getItem("reopenModalRecordId");
    const storedType = sessionStorage.getItem("reopenModalEventType");
    if (id && storedType === event_type) {
      setPendingReopenId(id);
    }
  }, [event_type]);

  // 対象 record が描画されるまで自動ロード
  useEffect(() => {
    if (!pendingReopenId) return;
    if (!isInitialLoaded || isLoading) return;

    const found = items.some((item) => item.data.id === pendingReopenId);
    if (found || !hasMore) {
      setPendingReopenId(null);
      return;
    }

    loadMore();
  }, [pendingReopenId, isInitialLoaded, isLoading, items, hasMore, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 px-4 gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <LuClipboardList className="w-12 h-12 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-lg">記録を作成しましょう</p>
              <p className="text-sm text-default-500">
                {event_type === "official"
                  ? "公式イベントの対戦記録を管理できます"
                  : "Tonamelイベントの対戦記録を管理できます"}
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <p className="text-xs font-bold text-center text-default-400 uppercase tracking-wider">
              記録の作成方法
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">デッキを登録する</p>
                  <p className="text-xs text-default-500">
                    まだデッキを登録していない場合は先に
                    <Link href="/decks" className="text-xs text-primary" underline="always">
                      デッキページ
                    </Link>
                    で登録してください
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-default-100">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">記録を作成する</p>
                  <p className="text-xs text-default-500">
                    {event_type === "official"
                      ? "下のボタンから日付・イベント・デッキを選択して記録を作成してください"
                      : "下のボタンからTonamelイベントID・デッキを選択して記録を作成してください"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            as={Link}
            href="/records/create"
            color="primary"
            size="md"
            radius="full"
            startContent={<LuFilePen className="w-4 h-4" />}
            className="font-bold shadow-md"
          >
            記録を作成する
          </Button>
        </div>
      )}

      <div className="flex flex-col w-full gap-3">
        {event_type === "official"
          ? items.map((recordData, index) => {
              const d = new Date(recordData.data.created_at);
              const monthKey = `${d.getFullYear()}年${d.getMonth() + 1}月`;
              const prev = index > 0 ? new Date(items[index - 1].data.created_at) : null;
              const prevMonthKey = prev
                ? `${prev.getFullYear()}年${prev.getMonth() + 1}月`
                : null;

              return (
                <Fragment key={recordData.data.id}>
                  {monthKey !== prevMonthKey && (
                    <div className="flex items-center gap-3 pt-1 pb-0.5">
                      <span className="text-xs font-bold text-default-400 tracking-wide shrink-0">
                        {monthKey}
                      </span>
                      <div className="flex-1 h-px bg-divider" />
                    </div>
                  )}
                  <OfficialEventRecord
                    recordData={recordData}
                    enableDisplayRecordModal={true}
                  />
                </Fragment>
              );
            })
          : items.map(
              (recordData) =>
                event_type === "tonamel" && (
                  <TonamelEventRecord
                    key={recordData.data.id}
                    recordData={recordData}
                    enableDisplayRecordModal={true}
                  />
                ),
            )}

        {/* ローディング表示 */}
        {!isInitialLoaded && event_type === "official" && (
          <OfficialEventRecordSkeletons />
        )}
        {!isInitialLoaded && event_type === "tonamel" && <TonamelEventRecordSkeletons />}
        {isInitialLoaded && isLoading && <Spinner size="lg" className="pt-0" />}

        {isInitialLoaded && !isLoading && hasMore && (
          <Button size="sm" radius="full" onPress={loadMore}>
            <div className="flex items-center gap-1">
              <span className="text-xs">
                <LuCirclePlus />
              </span>
              <span className="font-bold text-xs">更に読み込む</span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}
