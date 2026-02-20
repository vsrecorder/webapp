import { createHash } from "crypto";

import { useRef } from "react";

import { useEffect, useState } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { Skeleton } from "@heroui/react";
//import { Chip } from "@heroui/react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";
import { Spinner } from "@heroui/spinner";

import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

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
  onClose: () => void;
};

export default function DisplayDeckCodesModal({
  deck,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [deckcodes, setDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isOpen: isOpenForDeleteDeckCodeModal,
    onOpen: onOpenForDeleteDeckCodeModal,
    onOpenChange: onOpenChangeForDeleteDeckCodeModal,
  } = useDisclosure();

  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

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
      onClose();
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

  const deleteDeckCode = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "削除中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes/${deckcode?.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 409) {
        throw new Error(
          "このバージョンのデッキを利用したレコードが存在するため削除できません",
        );
      }

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "削除完了",
        description: "削除しました",
        color: "success",
        timeout: 3000,
      });

      // 削除したdeckcodeを一覧から除外
      setDeckCodes((prev) => (prev ? prev.filter((dc) => dc.id !== deckcode?.id) : prev));

      // deckcodeをリセット
      setDeckCode(null);

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "削除失敗",
        description: (
          <>
            削除に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpenForDeleteDeckCodeModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForDeleteDeckCodeModal}
        onClose={() => {
          setIsSelected(false);
          setIsDisabled(false);
        }}
        isDismissable={!isDisabled}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex items-center gap-2">
                このバージョンを削除しますか？
              </ModalHeader>
              <ModalBody className="px-2 py-1">
                <Alert color="danger">
                  <Checkbox
                    size={"sm"}
                    color="danger"
                    isDisabled={isDisabled}
                    isSelected={isSelected}
                    defaultSelected={false}
                    onValueChange={setIsSelected}
                  >
                    削除する
                  </Checkbox>
                </Alert>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isDisabled}
                  onPress={() => {
                    onClose();
                  }}
                  className="font-bold"
                >
                  戻る
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  isDisabled={isDisabled || !isSelected}
                  onPress={() => {
                    deleteDeckCode(onClose);
                  }}
                  className="text-white font-bold"
                >
                  削除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isOpen}
        size="md"
        placement="bottom"
        hideCloseButton
        onOpenChange={onOpenChange}
        onClose={() => {}}
        isDismissable={false}
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
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                <div>バージョン一覧</div>
              </ModalHeader>
              <ModalBody className="px-2 py-3 flex flex-col overflow-y-auto">
                <>
                  {loading ? (
                    <Spinner size="lg" className="pt-32" />
                  ) : !error ? (
                    <ol className="relative">
                      <div className="flex flex-col">
                        {!deckcodes && (
                          <div className="text-center">バージョンがありません</div>
                        )}

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
                                    作成日：
                                    {new Date(deckcode.created_at).toLocaleString(
                                      "ja-JP",
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        weekday: "short",
                                      },
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="pl-2">
                                {deckcode.code ? (
                                  <Card shadow="sm" className="py-3">
                                    <CardHeader className="pb-0 pt-0 flex-col items-start gap-2 w-full">
                                      {/* 両端配置 */}
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
                                            className="text-xl cursor-pointer text-red-500"
                                            onClick={() => {
                                              setDeckCode(deckcode);
                                              onOpenForDeleteDeckCodeModal();
                                            }}
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

                                          {/*
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
                                          */}
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
                                            <div className="font-bold text-tiny">
                                              メモ
                                            </div>
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
                                            <div className="font-bold text-tiny">
                                              メモ
                                            </div>
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
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
