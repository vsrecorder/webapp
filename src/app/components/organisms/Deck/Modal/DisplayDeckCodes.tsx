import { createHash } from "crypto";

import { useRef } from "react";

import { useEffect, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { Skeleton } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";
import { Spinner } from "@heroui/spinner";

import { LuTrash2 } from "react-icons/lu";

import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

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
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayDeckCodesModal({ deck, isOpen, onOpenChange }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deckcodes, setDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    // 下方向に30px以上スワイプしたら閉じる
    if (diff > 30) {
      startY.current = null;
      onOpenChange();
    }
  };

  useEffect(() => {
    if (!isOpen || !deck || !deck.id || !deck.latest_deck_code.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckCodesData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCodesByDeckId(deck.id);
        setDeckCodes(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckCodesData();
  }, [isOpen, deck]);

  if (!deck) {
    return;
  }

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="px-3 py-3 flex flex-col gap-1 cursor-grab"
            >
              <div className="mx-auto h-1 w-15 rounded-full bg-default-300" />
              <div>バージョン一覧</div>
            </ModalHeader>
            <ModalBody className="px-2 py-3 flex flex-col overflow-y-auto">
              <>
                {loading ? (
                  <Spinner size="lg" className="pt-32" />
                ) : !error ? (
                  <ol className="relative">
                    <div className="flex flex-col">
                      {deckcodes?.map((deckcode: DeckCodeType, index: number) => (
                        <li
                          key={deckcode.id}
                          className={`border-s-2  ${
                            index === deckcodes.length - 1
                              ? "border-transparent"
                              : "border-blue-300"
                          }`}
                        >
                          <div className="pb-5">
                            <div className="flex items-center ">
                              <div className="flex pb-3">
                                <div className="-translate-x-1/2 w-3 h-3 rounded-full bg-blue-400" />
                                <div className="text-tiny">
                                  登録日：
                                  {new Date(deckcode.created_at).toLocaleString("ja-JP", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="pl-2">
                              {deckcode.code ? (
                                <Card shadow="sm" className="py-3">
                                  <CardHeader className="pb-0 pt-0 flex-col items-start gap-2 w-full">
                                    <div className="flex items-center justify-between w-full">
                                      {/* 左側 */}
                                      <div className="flex flex-col items-start">
                                        <div className="font-bold text-medium">
                                          バージョン：
                                          {createHash("sha1")
                                            .update(deckcode.id)
                                            .digest("hex")
                                            .slice(0, 8)}
                                        </div>
                                      </div>

                                      {/* 右側 */}
                                      <div>
                                        <LuTrash2
                                          className="text-xl text-red-500"
                                          onClick={() => {}}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-0.5">
                                      <div className="flex items-center gap-3">
                                        <div className="text-tiny">
                                          <>デッキコード：</>
                                          <Snippet
                                            size="sm"
                                            radius="none"
                                            timeout={3000}
                                            disableTooltip={true}
                                            hideSymbol={true}
                                          >
                                            {deckcode?.code ? deckcode.code : "なし"}
                                          </Snippet>
                                        </div>

                                        {deckcode?.code && (
                                          <>
                                            <Chip
                                              size="sm"
                                              radius="md"
                                              variant="bordered"
                                            >
                                              <small className="font-bold">
                                                {deckcode.private_code_flg
                                                  ? "非公開"
                                                  : "公開"}
                                              </small>
                                            </Chip>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardBody className="px-1 py-2">
                                    <div className="relative w-full aspect-2/1">
                                      {!imageLoaded && (
                                        <Skeleton className="absolute inset-0 rounded-lg" />
                                      )}
                                      <Image
                                        radius="sm"
                                        shadow="none"
                                        alt={deckcode.code}
                                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                                        className=""
                                        onLoad={() => setImageLoaded(true)}
                                      />
                                    </div>
                                  </CardBody>
                                  {index === deckcodes.length - 1 ? (
                                    deckcode.memo ? (
                                      <CardFooter>
                                        <div className="flex flex-col gap-3">
                                          <div className="font-bold text-tiny">メモ</div>
                                        </div>
                                      </CardFooter>
                                    ) : (
                                      <></>
                                    )
                                  ) : (
                                    <CardFooter>
                                      <div className="flex flex-col gap-3">
                                        {index !== deckcodes.length - 1 ? (
                                          <DeckCardDiff
                                            current_deckcode={deckcodes[index]}
                                            previous_deckcode={deckcodes[index + 1]}
                                          />
                                        ) : (
                                          <></>
                                        )}
                                        {deckcode.memo ? (
                                          <div className="font-bold text-tiny">メモ</div>
                                        ) : (
                                          <></>
                                        )}
                                      </div>
                                    </CardFooter>
                                  )}
                                </Card>
                              ) : (
                                <></>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </div>
                  </ol>
                ) : (
                  <>{error}</>
                )}
              </>
            </ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
