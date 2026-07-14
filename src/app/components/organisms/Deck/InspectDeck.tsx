"use client";

import { useCallback, useEffect, useRef, useState } from "react";

//import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Card, CardBody } from "@heroui/react";

import { Button } from "@heroui/react";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { LuRepeat } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardList } from "@app/utils/deckcard";

import { DeckCodeType } from "@app/types/deck_code";
import { DeckCardListType } from "@app/types/deckcard";

import { CardType } from "@app/types/deckcard";

function unbiasedRandom(max: number): number {
  const limit = Math.floor(2 ** 32 / max) * max;
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return value % max;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = unbiasedRandom(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type Props = {
  deckcode: DeckCodeType | null;
};

export default function InspectDeck({ deckcode }: Props) {
  const [cardList, setCardList] = useState<DeckCardListType | null>(null);
  const [handcardList, setHandCardList] = useState<DeckCardListType>([]);
  const [prizecardList, setPrizeCardList] = useState<DeckCardListType>([]);
  const [deckcardList, setDeckCardList] = useState<DeckCardListType>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [prizecardsReversedState, setPrizeCardsReversedState] = useState<boolean>(false);

  const [card, setCard] = useState<CardType>();
  const {
    isOpen: isOpenForShowCardModal,
    onOpen: onOpenForShowCardModal,
    onOpenChange: onOpenChangeForShowCardModal,
  } = useDisclosure();

  const handScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!handScrollRef.current) return;

    handScrollRef.current.scrollTo({
      left: handScrollRef.current.scrollWidth,
      behavior: "smooth",
    });
  }, [handcardList]);

  // デッキのカード一覧だけを取得（失敗時のリロードから再利用）
  const loadDeckCardList = useCallback(async () => {
    if (!deckcode) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCardList(deckcode.code);

      const shuffledData = shuffleArray(data); // カードをシャッフル

      setCardList(shuffledData);
      setHandCardList(shuffledData.slice(0, 7)); // デッキの上から7枚を取得
      setPrizeCardList(shuffledData.slice(7, 13)); // サイドカードを取得
      setDeckCardList(shuffledData.slice(13)); // デッキのトップカードを取得

      const img = new window.Image();
      img.src = "https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg";

      const urls = [...shuffledData].map((c) => c.image_url);
      const uniqueUrls = [...new Set(urls)];
      uniqueUrls.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [deckcode]);

  useEffect(() => {
    loadDeckCardList();
  }, [loadDeckCardList]);

  const handleShuffle = () => {
    if (!cardList) return;

    const shuffledData = shuffleArray(cardList); // カードをシャッフル

    setCardList(shuffledData);
    setHandCardList(shuffledData.slice(0, 7)); // デッキの上から7枚を取得
    setPrizeCardList(shuffledData.slice(7, 13)); // サイドカードを取得
    setDeckCardList(shuffledData.slice(13)); // デッキのトップカードを取得
  };

  const handleDraw = () => {
    if (!deckcardList || deckcardList.length === 0) return;

    const drawnCard = deckcardList[0]; // デッキのトップカードを取得
    const newDeck = deckcardList.slice(1); // デッキのトップカードを除いたすべてのカードを取得

    setDeckCardList(newDeck);
    setHandCardList((prev) => [...prev, drawnCard]);

    console.log(handcardList.length);
  };

  if (!deckcode) {
    return <></>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-6 flex justify-between w-full">
          <div className="flex flex-col justify-center gap-1">
            <div className="px-3 font-bold text-tiny">サイド</div>
            <Card shadow="md" className="w-fit">
              <CardBody className="">
                <div className="flex justify-center items-center gap-1">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0"
                    >
                      <Image
                        radius="none"
                        shadow="none"
                        alt="ポケモンカード"
                        src="https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg"
                        className="w-12 h-17.5 rounded-xs object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="pr-3 flex flex-col items-center justify-center gap-1">
            <div className="font-bold text-tiny">山札：47</div>
            <Card shadow="md" className="w-fit">
              <CardBody className="">
                <div className="flex justify-center items-center gap-1">
                  {Array.from({ length: 1 }).map((_, index) => (
                    <div key={index} className="w-12 aspect-686/1212 shrink-0">
                      <Image
                        radius="none"
                        shadow="none"
                        alt="ポケモンカード"
                        src="https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg"
                        className="w-12 h-17.5 rounded-xs object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-1">
          <div className="px-3 font-bold text-tiny">手札：7</div>
          <Card shadow="md">
            <CardBody className="px-2.5">
              <div className="flex justify-center items-center gap-1">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="w-12 aspect-686/1212 shrink-0">
                    <Image
                      radius="none"
                      shadow="none"
                      alt="ポケモンカード"
                      src="https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg"
                      className="w-12 h-17.5 rounded-xs object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="pt-3 w-full">
          <Button size="md" radius="full" isDisabled className="w-full">
            <div className="flex items-center justify-center gap-3">
              <span className="font-bold ">
                <LuRepeat />
              </span>
              <span className="font-bold">再試行</span>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return <FetchError onRetry={loadDeckCardList} compact />;
  }

  if (!cardList) {
    return <></>;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="px-6 flex justify-between w-full">
          <div
            onClick={() => setPrizeCardsReversedState((prev) => !prev)}
            className="flex flex-col justify-center gap-1"
          >
            <div className="px-3 font-bold text-tiny">サイド</div>
            {prizecardsReversedState ? (
              <Card shadow="md" className="w-fit">
                <CardBody className="">
                  <div className="flex justify-center items-center gap-1">
                    {prizecardList.map((prizecard, index) => (
                      <div
                        key={index}
                        className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0"
                      >
                        <Image
                          radius="none"
                          shadow="none"
                          alt={prizecard.card_name}
                          src={prizecard.image_url}
                          className="w-12 h-17.5 rounded-xs object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card shadow="md" className="w-fit">
                <CardBody className="">
                  <div className="flex justify-center items-center gap-1">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0"
                      >
                        <Image
                          radius="none"
                          shadow="none"
                          alt="ポケモンカード"
                          src="https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg"
                          className="w-12 h-17.5 rounded-xs object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          <div
            onClick={handleDraw}
            className="pr-3 flex flex-col items-center justify-center gap-1"
          >
            <div className="font-bold text-tiny">山札：{deckcardList.length}</div>
            <Card shadow="md" className="w-fit">
              <CardBody className="">
                <div className="flex justify-center items-center gap-1">
                  {deckcardList.length === 0 && (
                    <div className="w-12 aspect-686/1212 shrink-0">
                      <div className="w-12 h-17.5" />
                    </div>
                  )}

                  {deckcardList.slice(0, 1).map((deckcard, index) => (
                    <div
                      key={`${deckcard.card_id}-${index}`}
                      className="w-12 aspect-686/1212 shrink-0"
                    >
                      {/* 裏面 */}
                      <Image
                        radius="none"
                        shadow="none"
                        alt="ポケモンカード"
                        src="https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg"
                        className="w-12 h-17.5 rounded-xs object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-1">
          <div className="px-3 font-bold text-tiny">手札：{handcardList.length}</div>
          <Card shadow="md">
            <CardBody className="px-2.5">
              <div className="flex justify-center">
                <div
                  ref={handScrollRef}
                  className="flex overflow-x-scroll gap-1 whitespace-nowrap"
                >
                  {handcardList.map((handcard, index) => (
                    <div
                      key={`${handcard.card_id}-${index}`}
                      onClick={() => {
                        setCard(handcard);
                        onOpenForShowCardModal();
                      }}
                      className="w-12 aspect-686/1212 shrink-0"
                    >
                      <Image
                        radius="none"
                        shadow="none"
                        alt={handcard.card_name}
                        src={handcard.image_url}
                        className="w-12 h-17.5 rounded-xs object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="pt-3 w-full">
          <Button size="md" radius="full" onPress={handleShuffle} className="w-full">
            <div className="flex items-center justify-center gap-3">
              <span className="font-bold ">
                <LuRepeat />
              </span>
              <span className="font-bold">再試行</span>
            </div>
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isOpenForShowCardModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForShowCardModal}
        classNames={{
          base: "sm:max-w-full bg-transparent shadow-none border-none",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={card?.card_name}
                  src={card?.image_url}
                  className="rounded-[20px]"
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
