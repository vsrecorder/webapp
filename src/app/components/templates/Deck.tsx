"use client";

import { useEffect, useState } from "react";

import { Image } from "@heroui/react";

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

async function fetchDeckCodesByDeckId(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}/deckcodes`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType[] = await res.json();

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
  const [deckcodes, setDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    const fetchDeckData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckById(id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeckCodesData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCodesByDeckId(id);
        setDeckCodes(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckData();
    fetchDeckCodesData();
  }, [id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck || !deckcodes) {
    return <div>データが存在しません</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div>ID: {deck.id}</div>
      <div>作成日: {new Date(deck.created_at).toLocaleString()}</div>
      <div>デッキ名: {deck.name}</div>
      <div>デッキの非公開: {deck.private_flg === true ? "true" : "false"}</div>
      {deckcodes.map((deckcode) => (
        <div key={deckcode.id}>
          {deckcode.code ? (
            <Image
              radius="none"
              shadow="none"
              alt={deckcode.code}
              src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
            />
          ) : (
            <></>
          )}
        </div>
      ))}
    </div>
  );
}
