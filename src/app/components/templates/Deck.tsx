"use client";

import { useEffect, useState } from "react";

import { DeckGetByIdResponseType } from "@app/types/deck";

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/` + id, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch record");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: string;
};

export default function Deck({ id }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const deck = await fetchDeckById(id);
        setDeck(deck);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck) {
    return <div>データが存在しません</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div>ID: {deck.id}</div>
      <div>作成日: {new Date(deck.created_at).toLocaleString()}</div>
      <div>デッキ名: {deck.name}</div>
      <div>デッキコード: {deck.code}</div>
      <div>デッキの非公開: {deck.private_flg === true ? "true" : "false"}</div>
      <div>デッキコードの非公開: {deck.private_code_flg === true ? "true" : "false"}</div>
    </div>
  );
}
