"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Image } from "@heroui/react";
import { Chip } from "@heroui/react";
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
import { AcespecType } from "@app/types/acespec";
import { EnvironmentType } from "@app/types/environment";
import { DeckTypeData } from "@app/types/decktype";
import { env } from "process";

async function fetchAcespec(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 204) {
      return null;
    }

    const ret: AcespecType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchEnvironment(date: Date) {
  try {
    const res = await fetch(`/api/environments?date=${date.toString().split("T")[0]}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: EnvironmentType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckType(code: string, environment_id: string) {
  try {
    const res = await fetch(`/api/decktypes/${code}/environments/${environment_id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 204) {
      return null;
    }

    const ret: DeckTypeData[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  result: Result;
  date: Date;
};

export default function CityleagueResultCard({ result, date }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [imageLoaded, setImageLoaded] = useState(false);

  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);
  const [loadingEnvrionment, setLoadingEnvironment] = useState(true);
  const [errorEnvironment, setErrorEnvironment] = useState<string | null>(null);

  const [acespec, setAcespec] = useState<AcespecType | null>(null);
  const [loadingAcespec, setLoadingAcespec] = useState(true);
  const [errorAcespec, setErrorAcespec] = useState<string | null>(null);

  const [decktype, setDeckType] = useState<DeckTypeData[] | null>(null);
  const [loadingDeckType, setLoadingDeckType] = useState(true);
  const [errorDeckType, setErrorDeckType] = useState<string | null>(null);

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  const { status } = useSession();

  useEffect(() => {
    if (!result.deck_code) {
      setLoadingAcespec(false);
      setLoadingEnvironment(false);
      return;
    }

    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`;

    setLoadingAcespec(true);
    setLoadingEnvironment(true);

    const fetchAcespecData = async () => {
      try {
        setLoadingAcespec(true);
        const data = await fetchAcespec(result.deck_code);
        setAcespec(data);
      } catch (err) {
        console.log(err);
        setErrorAcespec(
          `Acespecカードのデータ取得に失敗しました(デッキコード: ${result.deck_code})`,
        );
      } finally {
        setLoadingAcespec(false);
      }
    };

    const fetchEnvironmentData = async () => {
      try {
        setLoadingEnvironment(true);
        const data = await fetchEnvironment(date);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
        setErrorEnvironment("環境名のデータ取得に失敗しました");
      } finally {
        setLoadingEnvironment(false);
      }
    };

    fetchAcespecData();
    fetchEnvironmentData();
  }, [result.deck_code]);

  useEffect(() => {
    if (!result.deck_code || !environment || !environment.id) {
      setLoadingDeckType(false);
      return;
    }

    setLoadingDeckType(true);

    const fetchDeckTypeData = async () => {
      try {
        setLoadingDeckType(true);
        const data = await fetchDeckType(result.deck_code, environment.id);
        setDeckType(data);
      } catch (err) {
        console.log(err);
        setErrorDeckType(
          `デッキタイプのデータ取得に失敗しました(デッキコード: ${result.deck_code}, 環境ID: ${environment.id})`,
        );
      } finally {
        setLoadingDeckType(false);
      }
    };

    fetchDeckTypeData();
  }, [result.deck_code, environment]);

  const getBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-amber-400 bg-amber-50";
      case 2:
        return "border-gray-400 bg-gray-100";
      case 3:
        return "border-orange-700  bg-orange-100";
      case 5:
        return "border-blue-500 bg-blue-50";
      //return "border-green-500 bg-green-50";
      default:
        return "";
    }
  };

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
        <Card
          shadow="sm"
          className={`py-3 w-full border-3 border-gray-100 ${getBorderColor(result.rank)}`}
        >
          <CardHeader className="pb-0 pt-0 px-3">
            <div className="font-bold">
              {result.rank === 1
                ? "🥇 優勝"
                : result.rank === 2
                  ? "🥈 準優勝"
                  : result.rank === 3
                    ? "🥉 ベスト4"
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
          <CardFooter>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {loadingEnvrionment || loadingDeckType ? (
                  <Skeleton className="h-6 w-32 rounded-2xl" />
                ) : (
                  decktype &&
                  decktype.map((type, index) => (
                    <Chip
                      key={index}
                      size="sm"
                      radius="md"
                      classNames={{
                        //base: "bg-[#ee0077]",
                        content: "font-bold",
                      }}
                    >
                      {type.title}
                    </Chip>
                  ))
                )}
              </div>

              <div className="flex gap-1">
                {loadingAcespec ? (
                  <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
                ) : (
                  acespec && (
                    <Chip
                      size="sm"
                      radius="md"
                      classNames={{
                        base: "bg-[#ee0077]",
                        content: "text-white font-bold",
                      }}
                    >
                      {acespec.card_name}
                    </Chip>
                  )
                )}
              </div>
            </div>
          </CardFooter>
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
                  {status === "authenticated" && (
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
                  )}
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
