"use client";

import { useEffect, useRef, useState, useCallback } from "react";

//import { Spinner } from "@heroui/spinner";

import Record from "@app/components/organisms/Record/Record";
import OfficialEventRecordSkeleton from "@app/components/organisms/Record/Skeleton/OfficialEventRecordSkeleton";

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

export default function OfficialEventRecords() {
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<RecordType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    console.log("loadMore");

    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const newItems: RecordGetResponseType = await fetchOfficialEventRecords(nextCursor);

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
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, isLoading, hasMore]);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0,
        rootMargin: "200px",
      },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [isLoading, hasMore, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 空状態 */}
      {!isLoading && !hasMore && items.length === 0 && <>レコードがありません</>}

      <div className="flex flex-col w-full">
        {items.map((record) => (
          <Record key={record.data.id} record={record} />
        ))}

        {/* ローディング表示 */}
        {/*
        {isLoading && hasMore && <Spinner size="lg" className="pt-14" />}
        */}
        {isLoading && hasMore && <OfficialEventRecordSkeleton />}

        {hasMore && <div ref={observerTarget} className="h-10 w-full" />}
      </div>
    </div>
  );
}
