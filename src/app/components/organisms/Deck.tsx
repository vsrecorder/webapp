"use client";

import { useEffect, useState } from "react";

import DeckCard from "@app/components/organisms/DeckCard";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckById(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}`, {
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

async function fetchDeckCodeById(deck_code_id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${deck_code_id}`, {
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

export default function Deck({ deck_id, deck_code_id }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deck_id || !deck_code_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckById(deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeckCodeData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCodeById(deck_code_id);
        setDeckCode(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckData();
    fetchDeckCodeData();
  }, [deck_id, deck_code_id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck || !deckcode) {
    return <div>データが存在しません</div>;
  }

  return <DeckCard deck={deck} deckcode={deckcode} />;
}
