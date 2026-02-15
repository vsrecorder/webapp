"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import DeckCard from "@app/components/organisms/Deck/DeckCard";

import { DeckType, DeckGetResponseType } from "@app/types/deck";

import { DeckCardSkeletons } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";

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
        const nextItems: DeckGetResponseType = await fetchDecks(
          isArchived,
          lastItem.cursor,
        );

        if (nextItems.decks.length === 0) {
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
    }
  }, [isArchived, nextCursor, isLoading, hasMore]);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.5,
      },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [isLoading, hasMore, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態 */}
      {!isLoading && !hasMore && items.length === 0 && <>デッキがありません</>}

      <div className="flex flex-col w-full gap-3">
        {items.map((deck) => (
          <DeckCard
            key={deck.data.id}
            deckData={deck.data}
            deckcodeData={deck.data.latest_deck_code}
          />
        ))}

        {/* ローディング表示 */}
        {isLoading && <DeckCardSkeletons />}

        <div ref={observerTarget} className="h-1 w-full" />
      </div>
    </div>
  );
}
