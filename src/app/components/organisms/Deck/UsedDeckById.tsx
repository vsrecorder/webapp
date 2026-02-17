"use client";

import { useEffect, useState } from "react";

import DeckCard from "@app/components/organisms/Deck/DeckCard";
import { DeckCardSkeleton } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckCodeById(id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  deck_id: string;
  deck_code_id: string;
};

export default function UsedDeckById({ deck_id, deck_code_id }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deck_id) {
      setLoading1(false);
      setLoading2(false);
      return;
    }

    setLoading1(true);
    setLoading2(true);

    const fetchDeckData = async () => {
      try {
        setLoading1(true);
        const data = await fetchDeckById(deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading1(false);
      }
    };

    const fetchDeckCodesData = async () => {
      try {
        setLoading2(true);
        const data = await fetchDeckCodeById(deck_code_id);
        setDeckCode(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading2(false);
      }
    };

    fetchDeckData();
    fetchDeckCodesData();
  }, [deck_id, deck_code_id]);

  if (loading1 || loading2) {
    return <DeckCardSkeleton />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck) {
    return;
  }

  return (
    <>
      <DeckCard deckData={deck} deckcodeData={deckcode} />;
    </>
  );
}
