"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react";
import { Snippet } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuPlus } from "react-icons/lu";

import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";

import { Result } from "@app/types/cityleague_result";

type Props = {
  result: Result;
};

export default function CityleagueResultCard({ result }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  useEffect(() => {
    if (!result.deck_code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`;
  }, [result.deck_code]);

  return (
    <>
      <CreateDeckModal
        deck_code={result.deck_code}
        isOpen={isOpenForCreateDeckModal}
        onOpenChange={onOpenChangeForCreateDeckModal}
        onCreated={() => {}}
      />

      <div
        onClick={() => {
          onOpen();
        }}
      >
        <Card shadow="sm" className="py-3 w-full">
          <CardHeader className="pb-0 pt-0 px-3">
            <div className="font-bold">
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
            <div className="flex flex-col items-start gap-1.5">
              <div className="text-tiny">プレイヤー名: {result.player_name}</div>
              <div className="text-tiny">プレイヤーID: {result.player_id}</div>
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
        size={"md"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="p-3 pb-0 flex flex-items-center">
                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="font-bold">
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

                  {/* 右側 */}
                  <div className="-translate-x-3">
                    <div
                      className="relative w-fit cursor-pointer"
                      onClick={onOpenForCreateDeckModal}
                    >
                      <LuLayers className="text-xl" />
                      {/* 右上に重ねる */}
                      <LuPlus className="absolute -top-1 -right-1 font-black text-xs bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="p-3 gap-3">
                <div className="flex flex-col items-start gap-1.5">
                  <div className="text-tiny">プレイヤー名: {result.player_name}</div>
                  <div className="text-tiny">プレイヤーID: {result.player_id}</div>
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
              <ModalFooter className="flex items-center justify-between w-full">
                <div className="flex flex-col text-tiny -translate-y-2">
                  <>デッキコード：</>
                  {result.deck_code ? (
                    <Snippet
                      size="sm"
                      radius="none"
                      timeout={3000}
                      disableTooltip={true}
                      hideSymbol={true}
                    >
                      {result.deck_code}
                    </Snippet>
                  ) : (
                    "なし"
                  )}
                </div>

                <Button
                  color="default"
                  variant="solid"
                  onPress={onClose}
                  className="font-bold"
                >
                  閉じる
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
