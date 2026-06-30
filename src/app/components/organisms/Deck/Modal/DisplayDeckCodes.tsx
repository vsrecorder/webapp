import { createHash } from "crypto";

import { useRef } from "react";

import { SetStateAction, Dispatch } from "react";

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

import { LuTrash2, LuLayers, LuFilePen, LuBook, LuBookPlus } from "react-icons/lu";

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
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  onOpenCreateDeckCode?: () => void;
};

export default function DisplayDeckCodesModal({
  deck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
  onClose,
  onOpenCreateDeckCode,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayDeckCode, setDisplayDeckCode] = useState<DeckCodeType | null>(null);
  const [displayDeckCodes, setDisplayDeckCodes] = useState<DeckCodeType[] | null>(null);
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
        setDisplayDeckCodes(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckCodesData();
  }, [isOpen, deck]);

  // 新しいバージョンが作成されたら、一覧の先頭に動的に追加する
  useEffect(() => {
    if (!isOpen || !deckcode?.id) return;

    setDisplayDeckCodes((prev) => {
      // まだ未取得（0件）の場合はそのまま先頭に
      if (!prev) return [deckcode];

      // すでに一覧に存在する場合は何もしない（重複防止）
      if (prev.some((dc) => dc.id === deckcode.id)) return prev;

      return [deckcode, ...prev];
    });
  }, [isOpen, deckcode]);

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
      const res = await fetch(`/api/deckcodes/${displayDeckCode?.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 409) {
        throw new Error(
          "このバージョンのデッキを利用した記録が存在するため削除できません",
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

      // 削除したバージョンを一覧から除外
      setDisplayDeckCodes((prev) => {
        if (!prev) return prev;

        const filtered = prev.filter((dc) => dc.id !== displayDeckCode?.id);

        // deckcodeも更新
        setDeckCode((prevDeckCode) => {
          if (!prevDeckCode) return prevDeckCode;

          // 削除対象が最新のものだった場合、次に新しいバージョンに変える
          if (prevDeckCode.id === displayDeckCode?.id) {
            if (filtered.length > 0) {
              return filtered[0];
            }

            return null;
          }

          return prevDeckCode;
        });

        return filtered;
      });

      // deckcodeをリセット
      setDisplayDeckCode(null);

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

  const isArchived = deck ? new Date(deck.archived_at).getFullYear() !== 1 : false;

  // バージョンが1件のときは、タイムラインの続きとして次バージョン作成を促す（アーカイブ済みは非表示）
  const showNextVersionPrompt =
    displayDeckCodes?.length === 1 && !!onOpenCreateDeckCode && !isArchived;

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
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                <div>バージョン一覧</div>
              </ModalHeader>
              <ModalBody className="px-2 py-3 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                <>
                  {loading ? (
                    <Spinner size="lg" className="pt-32" />
                  ) : !error ? (
                    <ol className="relative">
                      <div className="flex flex-col">
                        {(!displayDeckCodes || displayDeckCodes.length === 0) &&
                          (isArchived ? (
                            <div className="flex flex-col items-center gap-3 py-10 px-3 text-center">
                              <LuLayers className="text-default-300 text-4xl" />
                              <div className="text-default-400 text-sm">
                                バージョンが記録されていません
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-5 py-8 px-3">
                              <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                                <LuLayers className="text-white text-4xl" />
                              </div>

                              <div className="text-center">
                                <div className="font-bold text-lg">
                                  デッキのバージョンを記録しよう
                                </div>
                                <div className="text-default-400 text-sm mt-1">
                                  デッキの変遷を残して、強化の歴史を振り返ろう
                                </div>
                              </div>

                              <div className="w-full flex flex-col gap-2.5">
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuLayers className="text-blue-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">
                                      変更履歴を追跡
                                    </div>
                                    <div className="text-tiny text-default-400">
                                      どのカードを入れ替えたか一目でわかる
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuFilePen className="text-green-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">差分を比較</div>
                                    <div className="text-tiny text-default-400">
                                      バージョン間のカード増減をひと目で確認
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuBook className="text-purple-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">
                                      過去のデッキコードを保存
                                    </div>
                                    <div className="text-tiny text-default-400">
                                      バージョン変更前後の構成をいつでも見返せる
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {onOpenCreateDeckCode && (
                                <Button
                                  color="primary"
                                  variant="solid"
                                  size="lg"
                                  startContent={<LuBookPlus className="text-xl" />}
                                  onPress={() => {
                                    onOpenCreateDeckCode();
                                  }}
                                  className="font-bold w-full"
                                >
                                  最初のバージョンを作成する
                                </Button>
                              )}
                            </div>
                          ))}

                        {displayDeckCodes?.map(
                          (deckcode: DeckCodeType, index: number) => {
                            const date = new Date(deckcode.created_at).toLocaleString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              },
                            );

                            return (
                              <li
                                key={deckcode.id}
                                className={`border-s-2  ${
                                  index === displayDeckCodes.length - 1
                                    ? showNextVersionPrompt
                                      ? "border-blue-300 border-dashed"
                                      : "border-transparent"
                                    : "border-blue-300"
                                }`}
                              >
                                <div className="pb-5">
                                  <div className="flex items-center ">
                                    <div className="flex pb-3">
                                      <div className="-translate-x-1/2 w-3 h-3 rounded-full bg-blue-400" />
                                      <div className="text-tiny">
                                        作成日時：
                                        {date}
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
                                                  setDisplayDeckCode(deckcode);
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
                                                  {deckcode?.code
                                                    ? deckcode.code
                                                    : "なし"}
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
                                        {index === displayDeckCodes.length - 1 ? (
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
                                              {index !== displayDeckCodes.length - 1 ? (
                                                <DeckCardDiff
                                                  current_deckcode={
                                                    displayDeckCodes[index]
                                                  }
                                                  previous_deckcode={
                                                    displayDeckCodes[index + 1]
                                                  }
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
                            );
                          },
                        )}

                        {showNextVersionPrompt && (
                          <li className="border-s-2 border-transparent">
                            <div className="pb-2">
                              <div className="flex items-center">
                                <div className="flex pb-3 items-center">
                                  {/* 未作成を示す中空ノード */}
                                  <div className="-translate-x-1/2 w-3 h-3 rounded-full border-2 border-blue-400 bg-content1" />
                                  <div className="text-tiny text-default-400">
                                    次のバージョン
                                  </div>
                                </div>
                              </div>

                              <div className="pl-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenCreateDeckCode?.();
                                  }}
                                  className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-primary-50/50 px-4 py-5 transition-colors hover:border-blue-400 hover:bg-primary-50 active:opacity-80"
                                >
                                  <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center transition-colors group-hover:bg-primary-200">
                                    <LuBookPlus className="text-2xl text-primary" />
                                  </div>
                                  <div className="font-bold text-sm text-primary">
                                    次のバージョンを作成
                                  </div>
                                  <div className="text-tiny text-default-400 text-center">
                                    デッキを更新したら記録して、
                                    <br />
                                    変化を時系列で振り返ろう
                                  </div>
                                </button>
                              </div>
                            </div>
                          </li>
                        )}
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
