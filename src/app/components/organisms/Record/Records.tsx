"use client";

import { useEffect, useState, useCallback } from "react";

import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/react";

import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import { OfficialEventRecordSkeletons } from "@app/components/organisms/Record/Skeleton/OfficialEventRecordSkeleton";

import { LuCirclePlus } from "react-icons/lu";

import { RecordType, RecordGetResponseType } from "@app/types/record";

async function fetchOfficialEventRecords(cursor: string) {
  try {
    const res = await fetch(`/api/records?event_type=official&cursor=${cursor}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchTonamelEventRecords(cursor: string) {
  try {
    const res = await fetch(`/api/records?event_type=tonamel&cursor=${cursor}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

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
};

export default function Records({ event_type }: Props) {
  const [items, setItems] = useState<RecordType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    if (event_type === "official") {
      try {
        const newItems: RecordGetResponseType =
          await fetchOfficialEventRecords(nextCursor);

        if (newItems.records.length === 0) {
          setHasMore(false);
          return;
        }

        setItems((prev) => [...prev, ...newItems.records]);

        const lastItem = newItems.records[newItems.records.length - 1];
        if (lastItem && lastItem.cursor) {
          const nextItems: RecordGetResponseType = await fetchOfficialEventRecords(
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
    } else if (event_type === "tonamel") {
      try {
        const newItems: RecordGetResponseType =
          await fetchTonamelEventRecords(nextCursor);

        if (newItems.records.length === 0) {
          setHasMore(false);
          return;
        }

        setItems((prev) => [...prev, ...newItems.records]);

        const lastItem = newItems.records[newItems.records.length - 1];
        if (lastItem && lastItem.cursor) {
          const nextItems: RecordGetResponseType = await fetchTonamelEventRecords(
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
    }
  }, [event_type, nextCursor, isLoading, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-4 pb-3">
      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <>レコードがありません</>
      )}

      <div className="flex flex-col w-full gap-3">
        {items.map((record) =>
          event_type === "official" ? (
            <OfficialEventRecord key={record.data.id} record={record} />
          ) : (
            event_type === "tonamel" && <div>{record.data.id}</div>
          ),
        )}

        {/* ローディング表示 */}
        {!isInitialLoaded && <OfficialEventRecordSkeletons />}
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
