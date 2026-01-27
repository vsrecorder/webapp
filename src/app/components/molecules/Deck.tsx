"use client";

import { DeckType } from "@app/types/deck";

import Link from "next/link";

export default function Deck(deck: DeckType) {
  return (
    <Link color="foreground" href={`/decks/${deck.data.id}`}>
      <div key={deck.data.id} className="rounded border p-3">
        <p className="font-medium">デッキID:</p>
        <p>{deck.data.id}</p>
        <p className="text-sm text-gray-500">
          作成日: {new Date(deck.data.created_at).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
