"use client";

import { useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckData: DeckGetByIdResponseType | null;
  deckcodeData: DeckCodeType | null;
};

export default function DeckCard({ deckData, deckcodeData }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  if (!deck) {
    return;
  }

  return (
    <>
      <div className="" onClick={onOpen}>
        <Card className="pt-3 w-full">
          <CardHeader className="pt-0 pb-0 px-3">
            <div className="flex flex-col gap-1">
              <div className="font-bold text-large">{deck.name}</div>
              <div className="pl-1">
                <div className="text-tiny">
                  作成日：
                  {new Date(deck.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-2 py-2">
            <DeckCodeCard deckcode={deckcode} />
          </CardBody>
        </Card>
      </div>

      <ShowDeckModal
        deck={deck}
        setDeck={setDeck}
        deckcode={deckcode}
        setDeckCode={setDeckCode}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </>
  );
}
