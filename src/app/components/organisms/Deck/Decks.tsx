"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/react";

import DeckCard from "@app/components/organisms/Deck/DeckCard";
import { DeckCardSkeletons } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";

import { LuCirclePlus } from "react-icons/lu";

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
  const [items, setItems] = useState<DeckType[]>([]);
  const [nextCursor, setNextCursor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((d) => d.data.id !== id));
  };

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
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [isArchived, nextCursor, isLoading, hasMore]);

  useEffect(() => {
    if (isInitialLoaded) return;
    loadMore();
  }, [isInitialLoaded, loadMore]);

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <>デッキがありません</>
      )}

      <div className="flex flex-col w-full gap-3">
        {items.map((deck) => (
          <DeckCard
            key={deck.data.id}
            deckData={deck.data}
            deckcodeData={deck.data.latest_deck_code}
            onRemove={handleRemove}
            enableShowDeckModal={true}
          />
        ))}

        {/* ローディング表示 */}
        {isLoading && <DeckCardSkeletons />}
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
