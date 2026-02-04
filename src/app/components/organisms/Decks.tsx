"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import DeckCard from "@app/components/organisms/DeckCard";

import { DeckType, DeckGetResponseType } from "@app/types/deck";

async function fetchDecks(isArchived: boolean, cursor: string) {
  try {
    const res = await fetch(`/api/decks?archived=${isArchived}&cursor=${cursor}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: DeckGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  isArchived: boolean;
};

export default function Decks({ isArchived }: Props) {
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<DeckType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const newItems: DeckGetResponseType = await fetchDecks(isArchived, nextCursor);

      if (newItems.decks.length === 0) {
        setHasMore(false);
        return;
      }

      setItems((prev) => [...prev, ...newItems.decks]);

      const lastItem = newItems.decks[newItems.decks.length - 1];
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
  }, [isArchived, nextCursor, isLoading, hasMore]);

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
      {items.map((deck) => (
        <DeckCard
          key={deck.data.id}
          isArchived={isArchived}
          deck_id={deck.data.id}
          deck_code_id={deck.data.latest_deck_code.id}
        />
      ))}

      {hasMore && (
        <div ref={observerTarget} className="h-10 flex justify-center items-center">
          {/*{isLoading && <span>読み込み中...</span>}*/}
          {isLoading}
        </div>
      )}
    </div>
  );
}
