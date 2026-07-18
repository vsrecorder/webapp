"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react";
import { Snippet } from "@heroui/react";
import { Link } from "@heroui/react";

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
import DeckCardDetailRow from "@app/components/organisms/Deck/DeckCardDetailRow";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";

import { Result } from "@app/types/cityleague_result";

type Props = {
  result: Result;
  date: Date;
  // 個別ページのように順位ごとの見出しがある場所では、カード側のラベルが冗長になるため隠す。
  showRankLabel?: boolean;
};

export default function CityleagueResultCard({ result, showRankLabel = true }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    isOpen: isOpenForCreateDeckModal,
    onOpen: onOpenForCreateDeckModal,
    onOpenChange: onOpenChangeForCreateDeckModal,
  } = useDisclosure();

  const { status } = useSession();

  useEffect(() => {
    if (!result.deck_code) {
      return;
    }

    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`;
  }, [result.deck_code]);

  {
    /*
  useEffect(() => {
    if (!result.deck_code) {
      setLoadingAcespec(false);
      setLoadingEnvironment(false);
      return;
    }

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
    */
  }

  {
    /*
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
  */
  }

  const getRankLabel = (rank: number, withMedal: boolean) => {
    switch (rank) {
      case 1:
        return withMedal ? "🥇 優勝" : "優勝";
      case 2:
        return withMedal ? "🥈 準優勝" : "準優勝";
      case 3:
        return withMedal ? "🥉 ベスト4" : "ベスト4";
      case 5:
        return "ベスト8";
      case 9:
        return "ベスト16";
      default:
        return "";
    }
  };

  const getBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        // ダークモードでは淡色背景に白文字が埋もれるため、背景を暗いトーンに切り替える
        return "border-amber-400 bg-amber-50 dark:bg-amber-900/30";
      case 2:
        return "border-default-400 bg-default-100";
      case 3:
        return "border-orange-700 bg-orange-100 dark:bg-orange-900/30";
      case 5:
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/30";
      //return "border-green-500 bg-green-50 dark:bg-green-900/30";
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
          className={`py-3 w-full border-3 border-default-100 ${getBorderColor(result.rank)}`}
        >
          {showRankLabel && (
            <CardHeader className="pb-0 pt-0 px-3">
              <div className="font-bold">{getRankLabel(result.rank, true)}</div>
            </CardHeader>
          )}
          <CardBody className="p-3 gap-3">
            <div className="flex flex-col items-start gap-1.5">
              <div className="text-tiny">プレイヤー名: {result.player_name}</div>
              <div className="text-tiny">プレイヤーID: {result.player_id}</div>
            </div>

            {result.deck_code ? (
              // カード内ではタップで詳細モーダルを開くため、画像タップのZoomは無効化する
              <ZoomableDeckImage code={result.deck_code} disableZoom />
            ) : (
              <div className="relative w-full aspect-2/1">
                {!imageLoaded && (
                  <Skeleton className="absolute inset-0 rounded-lg" />
                )}
                <Image
                  radius="sm"
                  shadow="none"
                  alt="デッキコードなし"
                  src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                  className=""
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            )}
          </CardBody>
          <CardFooter>
            {/*
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
            */}
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
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="p-3 pb-0 flex flex-items-center">
                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="font-bold">{getRankLabel(result.rank, false)}</div>

                  {/* 右側 */}
                  {status === "authenticated" && (
                    <div className="-translate-x-3">
                      <div
                        className="relative w-fit cursor-pointer"
                        onClick={onOpenForCreateDeckModal}
                      >
                        <LuLayers className="text-xl" />
                        {/* 右上に重ねる */}
                        <LuPlus className="absolute -top-1 -right-1 font-black text-xs bg-background rounded-full" />
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
                {result.deck_code ? (
                  // デッキ画像の表示・タップ全画面表示は共通コンポーネントに委譲する
                  <ZoomableDeckImage code={result.deck_code} />
                ) : (
                  <div className="relative w-full aspect-2/1">
                    {!imageLoaded && (
                      <Skeleton className="absolute inset-0 rounded-lg" />
                    )}
                    <Image
                      radius="sm"
                      shadow="none"
                      alt="デッキコードなし"
                      src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                      className=""
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                )}

                {result.deck_code && (
                  <>
                    <div className="-translate-y-2">
                      <Link
                        isExternal
                        showAnchorIcon
                        underline="always"
                        href={`https://www.pokemon-card.com/deck/deck.html?deckID=${result.deck_code}`}
                        className="pl-1 text-tiny"
                      >
                        [{result.deck_code}] から新しいデッキコードを作成
                      </Link>
                    </div>
                    <div className="px-1 overflow-y-auto">
                      <DeckCardDetailRow code={result.deck_code} />
                    </div>
                  </>
                )}
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
