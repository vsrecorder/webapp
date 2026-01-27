"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import Record from "@app/components/molecules/Record";

import { RecordType, RecordGetResponseType } from "@app/types/record";

async function fetchOfficialEventRecords(cursor: string) {
  try {
    const res = await fetch(`/api/records?event_type=official&cursor=` + cursor, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

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
        setNextCursor(lastItem.cursor);
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoading) {
            loadMore();
          }
        });
      },
      { threshold: 0.25 },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [items, hasMore, isLoading, loadMore]);

  return (
    <div className="space-y-4">
      {items.map((record) => (
        <Record key={record.data.id} {...record} />
      ))}

      {hasMore && (
        <div ref={observerTarget} className="h-10 flex justify-center items-center">
          {isLoading && <span>読み込み中...</span>}
        </div>
      )}

      {!hasMore && (
        <p className="text-center text-sm text-gray-500">これ以上データはありません</p>
      )}
    </div>
  );
}
