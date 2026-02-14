"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { Result } from "@app/types/cityleague_result";

type Props = {
  result: Result;
};

export default function CityleagueResultCard({ result }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!result.deck_code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`;
  }, [result.deck_code]);

  return (
    <>
      <div
        onClick={() => {
          onOpen();
        }}
      >
        <Card shadow="sm" className="py-3">
          <CardHeader className="pb-0 pt-0 px-3">
            <div className="font-bold text-medium">
              {result.rank === 1
                ? "優勝"
                : result.rank === 2
                  ? "準優勝"
                  : result.rank === 3
                    ? "ベスト4"
                    : result.rank === 5
                      ? "ベスト8"
                      : result.rank === 9
                        ? "ベスト16"
                        : ""}
            </div>
          </CardHeader>
          <CardBody className="p-3 gap-3">
            <div className="flex flex-col items-start gap-0.5">
              <p className="text-tiny">プレイヤー名: {result.player_name}</p>
              <p className="text-tiny">プレイヤーID: {result.player_id}</p>
              <p className="text-tiny">
                デッキコード: {result.deck_code ? result.deck_code : "なし"}
              </p>
            </div>

            <div className="relative w-full aspect-2/1">
              {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
              {result.deck_code ? (
                <>
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={result.deck_code}
                    src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`}
                    className=""
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <>
                  <Image
                    radius="sm"
                    shadow="none"
                    alt="デッキコードなし"
                    src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                    className=""
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="p-3 pb-0">
                <div className="font-bold text-medium">
                  {result.rank === 1
                    ? "優勝"
                    : result.rank === 2
                      ? "準優勝"
                      : result.rank === 3
                        ? "ベスト4"
                        : result.rank === 5
                          ? "ベスト8"
                          : result.rank === 9
                            ? "ベスト16"
                            : ""}
                </div>
              </ModalHeader>
              <ModalBody className="p-3 gap-3">
                <div className="flex flex-col items-start gap-0.5">
                  <p className="text-tiny">プレイヤー名: {result.player_name}</p>
                  <p className="text-tiny">プレイヤーID: {result.player_id}</p>
                  <p className="text-tiny">
                    デッキコード: {result.deck_code ? result.deck_code : "なし"}
                  </p>
                </div>
                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  {result.deck_code ? (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt={result.deck_code}
                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  ) : (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt="デッキコードなし"
                        src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="solid" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
