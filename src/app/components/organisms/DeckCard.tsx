"use client";

import { useEffect } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import Link from "next/link";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deck: DeckGetByIdResponseType;
  deckcode: DeckCodeType;
};

export default function DeckCard({ deck, deckcode }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    if (!deckcode.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode.code]);

  return (
    <>
      <div onClick={() => onOpen()}>
        <Card shadow="sm" className="py-3">
          <CardHeader className="pb-0 pt-0 flex-col items-start gap-0">
            <p className="font-bold">{deck.name}</p>
            <p className="font-bold text-tiny">
              {new Date(deck.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
          </CardHeader>
          <CardBody className="py-2">
            {deckcode ? (
              <>
                <Image
                  radius="none"
                  shadow="none"
                  alt={deckcode.code}
                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                />
              </>
            ) : (
              <>
                <Image
                  radius="none"
                  shadow="none"
                  alt="デッキコードなし"
                  src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        size={"sm"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <div className="pb-4">
                <ModalHeader className="">{deck.name}</ModalHeader>
                <ModalBody>
                  <p className="text-tiny">{deckcode.code}</p>
                  <p className="text-tiny">
                    {deckcode.private_code_flg === true
                      ? "デッキコード非公開"
                      : "デッキコード公開"}
                  </p>
                  {deckcode ? (
                    <>
                      <Image
                        radius="none"
                        shadow="none"
                        alt={deckcode.code}
                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                      />
                    </>
                  ) : (
                    <>
                      <Image
                        radius="none"
                        shadow="none"
                        alt="デッキコードなし"
                        src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                      />
                    </>
                  )}
                  <Link href={`/decks/${deck.id}`}>
                    <span>このデッキの詳細ページを見る</span>
                  </Link>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="solid" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
