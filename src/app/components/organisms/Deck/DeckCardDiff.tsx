"use client";

import { useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { DeckCodeType } from "@app/types/deck_code";
import { DeckCardType } from "@app/types/deckcard";

async function fetchDeckCardListByDeckCodeId(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/list`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCardType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

function makeCardKey(card: DeckCardType): string {
  const attacks = Array.isArray(card.attacks) ? card.attacks : [];

  return [
    card.card_name ?? "",
    card.ability ?? "",
    [...attacks].sort().join(","), // 順序差吸収
  ].join("||");
}

function toCardCountMap(cards: DeckCardType[]) {
  const map = new Map<string, { card: DeckCardType; count: number }>();

  for (const card of cards) {
    const key = makeCardKey(card);
    const current = map.get(key);

    if (current) {
      current.count += card.card_count ?? 1;
    } else {
      map.set(key, {
        card,
        count: card.card_count ?? 1,
      });
    }
  }

  return map;
}

function diffByContentWithCount(a: DeckCardType[], b: DeckCardType[]): DeckCardType[] {
  const aMap = toCardCountMap(a);
  const bMap = toCardCountMap(b);

  const result: DeckCardType[] = [];

  for (const [key, { card, count }] of aMap) {
    const bCount = bMap.get(key)?.count ?? 0;
    const diffCount = count - bCount;

    if (diffCount > 0) {
      result.push({
        ...card,
        card_count: diffCount,
      });
    }
  }

  return result;
}

type Props = {
  current_deckcode: DeckCodeType;
  previous_deckcode: DeckCodeType;
};

export default function DeckCardDiff({ current_deckcode, previous_deckcode }: Props) {
  const [currentDeckCardList, setCurrentDeckCardList] = useState<DeckCardType[]>();
  const [previousDeckCardList, setPreviousDeckCardList] = useState<DeckCardType[]>();
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current_deckcode || !previous_deckcode) return;

    setLoading1(true);
    setLoading2(true);

    const fetchCurrentDeckCardListData = async () => {
      try {
        setLoading1(true);
        const data = await fetchDeckCardListByDeckCodeId(current_deckcode.code);
        setCurrentDeckCardList(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading1(false);
      }
    };

    const fetchPreviousDeckCardListData = async () => {
      try {
        setLoading2(true);
        const data = await fetchDeckCardListByDeckCodeId(previous_deckcode.code);
        setPreviousDeckCardList(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading2(false);
      }
    };

    fetchCurrentDeckCardListData();
    fetchPreviousDeckCardListData();
  }, [current_deckcode, previous_deckcode]);

  if (!current_deckcode || !previous_deckcode) return;

  if (loading1 || loading2) {
    return (
      <div className="flex flex-col gap-3">
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">追加されたカード</div>
          <div className="pl-1 flex flex-wrap gap-1">
            <div>
              <Skeleton className="h-6.5 w-22 rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-6.5 w-26 rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-6.5 w-18 rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">削除されたカード</div>
          <div className="pl-1 flex flex-wrap gap-1">
            <div>
              <Skeleton className="h-6.5 w-22 rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-6.5 w-26 rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-6.5 w-18 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return;
  }

  if (!currentDeckCardList || !previousDeckCardList) return;

  return (
    <div className="flex flex-col gap-3">
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">追加されたカード</div>
        <div className="pl-1 flex flex-wrap gap-1">
          {diffByContentWithCount(currentDeckCardList, previousDeckCardList).map(
            (deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="success"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ),
          )}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">削除されたカード</div>
        <div className="pl-1 flex flex-wrap gap-1">
          {diffByContentWithCount(previousDeckCardList, currentDeckCardList).map(
            (deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="danger"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
