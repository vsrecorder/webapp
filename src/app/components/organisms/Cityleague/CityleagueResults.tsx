"use client";

import { useEffect, useState, useCallback } from "react";

import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";

import {
  CityleagueResultGetResponseType,
  CityleagueResultType,
} from "@app/types/cityleague_result";

async function fetchCityleagueResultsByTerm(
  league_type: number,
  from_date: string,
  to_date: string,
) {
  try {
    const res = await fetch(
      `/api/cityleague_results?league_type=${league_type}&from_date=${from_date}&to_date=${to_date}`,
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

    const ret: CityleagueResultGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  league_type: number;
};

export default function CityleagueResults({ league_type }: Props) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const [items, setItems] = useState<CityleagueResultType[]>([]);
  const [nextFromDate, setNextFromDate] = useState<Date>(yesterday);
  const [nextToDate, setNextToDate] = useState<Date>(now);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      for (let i = 0; i <= 7; i++) {
        const fromDate = new Date(nextFromDate);
        const toDate = new Date(nextToDate);

        fromDate.setDate(fromDate.getDate() - i);
        toDate.setDate(toDate.getDate() - i);

        const newItems: CityleagueResultGetResponseType =
          await fetchCityleagueResultsByTerm(
            league_type,
            fromDate.toISOString().split("T")[0],
            toDate.toISOString().split("T")[0],
          );

        if (newItems.count !== 0) {
          setItems((prev) => [...prev, ...newItems.event_results]);

          fromDate.setDate(fromDate.getDate() - 2);
          toDate.setDate(toDate.getDate() - 2);

          setNextFromDate(fromDate);
          setNextToDate(toDate);

          return;
        }
      }

      setHasMore(false);
      return;
    } catch (error) {
      console.error("Error loading items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [league_type, nextFromDate, nextToDate, isLoading, hasMore, isInitialLoaded]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <>直近でシティリーグの開催はありません</>
      )}

      <div className="flex flex-col w-full gap-3">
        {items.map((event_result) => (
          <div key={event_result.official_event_id}>
            <CityleagueResult event_result={event_result} />
          </div>
        ))}

        {/* ローディング表示 */}
        {!isInitialLoaded && <CityleagueResultSkeletons />}
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
