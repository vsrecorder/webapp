"use client";

import { useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
//import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckData: DeckGetByIdResponseType | null;
  deckcodeData: DeckCodeType | null;
  onRemove: (id: string) => void;
  enableShowDeckModal: boolean;
};

export default function DeckCard({
  deckData,
  deckcodeData,
  onRemove,
  enableShowDeckModal,
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  if (!deck) {
    return (
      <>
        <div className="" onClick={onOpen}>
          <Card className="pt-3 w-full">
            <CardHeader className="pt-0 pb-0 px-3">
              <div className="flex flex-col gap-1 w-full">
                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="font-bold text-large truncate w-full min-w-0">
                    <>なし</>
                  </div>

                  {/* 右側 */}
                  {/*
                  <Chip size="sm" radius="md" variant="bordered">
                    <small className="font-bold">
                      {deck.private_flg ? "非公開" : "公開"}
                    </small>
                  </Chip>
                  */}
                </div>

                <div className="pl-1">
                  <div className="text-tiny">
                    <>登録日：なし</>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-2 py-2">
              <DeckCodeCard deckcode={deckcode} />
            </CardBody>
          </Card>
        </div>

        {enableShowDeckModal && (
          <ShowDeckModal
            deck={deck}
            setDeck={setDeck}
            deckcode={deckcode}
            setDeckCode={setDeckCode}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onRemove={onRemove}
          />
        )}
      </>
    );
  }

  const date = new Date(deck.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      <div className="" onClick={onOpen}>
        <Card className="pt-3 w-full">
          <CardHeader className="pt-0 pb-0 px-3">
            <div className="flex flex-col gap-1 w-full">
              {/* 両端配置 */}
              <div className="flex items-center justify-between w-full">
                {/* 左側 */}
                <div className="flex items-center gap-0 shrink-0">
                  {deck.pokemon_sprites[0] ? (
                    <Image
                      alt={deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                      className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-1"
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-2"
                    />
                  )}

                  {deck.pokemon_sprites[1] ? (
                    <Image
                      alt={deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                      className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-1"
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-2"
                    />
                  )}
                </div>

                {/* 右側 */}
                {/*
                <Chip size="sm" radius="md" variant="bordered">
                  <small className="font-bold">
                    {deck.private_flg ? "非公開" : "公開"}
                  </small>
                </Chip>
                */}
              </div>

              <div className="font-bold text-large truncate w-full min-w-0">
                {deck.name}
              </div>

              <div className="pl-1">
                <div className="text-tiny">
                  登録日：
                  {date}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-2 py-2">
            <DeckCodeCard deckcode={deckcode} />
          </CardBody>
        </Card>
      </div>

      {enableShowDeckModal && (
        <ShowDeckModal
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onRemove={onRemove}
        />
      )}
    </>
  );
}
