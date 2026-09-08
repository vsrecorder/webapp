"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

//import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Card, CardBody } from "@heroui/react";

import { Button } from "@heroui/react";

import { ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { LuRepeat } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import FetchError from "@app/components/molecules/FetchError";

import { closingPassthroughClassNames } from "@app/utils/modal";

import { fetchDeckCardList } from "@app/utils/deckcard";
import { useSeededResource } from "@app/hooks/useSeededResource";

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

// 手札・サイドの枚数(取得した並びの先頭から順に配る)
const HAND_SIZE = 7;
const PRIZE_SIZE = 6;

// デッキのカード一覧を取り、シャッフルして返す(初回の配りはこの並びそのもの)。
// 裏面とカードの画像も先読みしておく(めくったときに待たせない)
async function fetchShuffledDeckCardList(code: string): Promise<DeckCardListType> {
  const data = await fetchDeckCardList(code);
  const shuffled = shuffleArray(data);

  const back = new window.Image();
  back.src = "https://www.pokemon-card.com/assets/images/noimage/poke_ura.jpg";

  const urls = [...shuffled].map((c) => c.image_url);
  const uniqueUrls = [...new Set(urls)];
  uniqueUrls.forEach((url) => {
    const img = new window.Image();
    img.src = url;
  });

  return shuffled;
}

/*
 * 配った状態。シャッフルした並び(order)と、山札から引いた枚数(drawn)だけを持ち、
 * 手札・サイド・山札はそこから導く。base は配りの元になった取得結果で、
 * 取り直して変わったら(deckcode が変わった等)最初から配り直す
 */
type Deal = {
  base: DeckCardListType;
  order: DeckCardListType;
  drawn: number;
};

type Props = {
  deckcode: DeckCodeType | null;
  // true の間はデータが揃っていてもローディング表示(裏向きカード)を出し続ける。
  // モーダルの入場アニメーション中にカード一覧の実体化(大きなコミット)が走ると
  // シートの動きが止まるため、着地までの間これを立てて実体化を遅延させる。
  holdSkeleton?: boolean;
};

export default function InspectDeck({ deckcode, holdSkeleton = false }: Props) {
  // デッキのカード一覧(取得時にシャッフル済み)。失敗時は retry で取り直す
  const {
    data: fetchedCardList,
    loading,
    error,
    retry: loadDeckCardList,
  } = useSeededResource(deckcode?.code, fetchShuffledDeckCardList);

  const [deal, setDeal] = useState<Deal | null>(null);
  // 取得結果が変わっていたら(まだ配っていなければ)取得した並びで配る
  const current: Deal | null = useMemo(() => {
    if (deal && deal.base === fetchedCardList) return deal;
    return fetchedCardList ? { base: fetchedCardList, order: fetchedCardList, drawn: 0 } : null;
  }, [deal, fetchedCardList]);

  const cardList = current?.order ?? null;
  const { handcardList, prizecardList, deckcardList } = useMemo(() => {
    if (!current) {
      return {
        handcardList: [] as DeckCardListType,
        prizecardList: [] as DeckCardListType,
        deckcardList: [] as DeckCardListType,
      };
    }
    const { order, drawn } = current;
    const deckStart = HAND_SIZE + PRIZE_SIZE;
    return {
      // 最初の手札に、山札の上から引いた分を続ける
      handcardList: [...order.slice(0, HAND_SIZE), ...order.slice(deckStart, deckStart + drawn)],
      prizecardList: order.slice(HAND_SIZE, deckStart),
      deckcardList: order.slice(deckStart + drawn),
    };
  }, [current]);

  const [prizecardsReversedState, setPrizeCardsReversedState] = useState<boolean>(false);

  const [card, setCard] = useState<CardType>();
  const {
    isOpen: isOpenForShowCardModal,
    onOpen: onOpenForShowCardModal,
    onOpenChange: onOpenChangeForShowCardModal,
  } = useDisclosure();

  const handScrollRef = useRef<HTMLDivElement | null>(null);

  // 手札の行が実際に横へ溢れているときだけ overflow-x-auto にする。
  // 溢れていないのに overflow を持つ要素から始まるスワイプは、iOS のモーダル内で
  // react-aria に殺されてスクロールできなくなるため(HScrollRow と同じ対策。
  // この行は自動スクロール用の ref を使うため、共通部品ではなく同じ判定を持つ)。
  // 手札はドローで増えるため、毎レンダー後に測り直す。
  //
  // 判定(scrollWidth > clientWidth)が成り立つのは、この行自身が親の幅に固定される
  // ブロック要素のときだけ。かつてはこの行を `flex justify-center` で包んで中央寄せしており、
  // overflow-x-visible の間は行が「中身なりの幅」まで広がる(フレックス項目の min-width:auto)ため
  // scrollWidth === clientWidth のまま溢れを検知できず、ドローで増えた手札が
  // overflow-x-visible のまま Card(overflow-hidden)に左右で切られていた。
  // 中央寄せは包む要素ではなく、この行自身の justify-center で行うこと。
  const [isHandOverflowing, setIsHandOverflowing] = useState(true);
  useLayoutEffect(() => {
    const el = handScrollRef.current;
    if (!el) return;

    const update = () => setIsHandOverflowing(el.scrollWidth > el.clientWidth);
    update();

    // 画面回転やモーダル幅の変化に追従する
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  });

  // ドローしたカード(末尾)が見えるよう、手札が増えるたび右端まで送る。
  //
  // isHandOverflowing も依存に入れる。ドローで初めて溢れた回は、この effect が走る時点では
  // 行がまだ overflow-x-visible(スクロールコンテナではない)で、scrollTo が何もせずに終わる。
  // handcardList はもう変わらないので、依存が枚数だけだと二度と送られず
  // 「1回目のドローだけ引いたカードが見えない」状態になる。
  // overflow-x-auto が当たったコミットの後にもう一度走らせて送り直す。
  useEffect(() => {
    const el = handScrollRef.current;
    if (!el) return;

    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [handcardList, isHandOverflowing]);

  // カードをシャッフルして配り直す
  const handleShuffle = () => {
    if (!current) return;

    setDeal({ base: current.base, order: shuffleArray(current.order), drawn: 0 });
  };

  // デッキのトップカードを手札に加える
  const handleDraw = () => {
    if (!current || deckcardList.length === 0) return;

    setDeal({ ...current, drawn: current.drawn + 1 });
  };

  if (!deckcode) {
    return <></>;
  }

  if (loading || holdSkeleton) {
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
                      className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0 flex items-center justify-center"
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
                    <div key={index} className="w-12 aspect-686/1212 shrink-0 flex items-center justify-center">
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
                  <div key={index} className="w-12 aspect-686/1212 shrink-0 flex items-center justify-center">
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
                        className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0 flex items-center justify-center"
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
                        className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0 flex items-center justify-center"
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
                    <div className="w-12 aspect-686/1212 shrink-0 flex items-center justify-center">
                      <div className="w-12 h-17.5" />
                    </div>
                  )}

                  {deckcardList.slice(0, 1).map((deckcard, index) => (
                    <div
                      key={`${deckcard.card_id}-${index}`}
                      className="w-12 aspect-686/1212 shrink-0 flex items-center justify-center"
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
              <div
                ref={handScrollRef}
                className={`flex gap-1 whitespace-nowrap ${
                  isHandOverflowing
                    ? // 溢れているときに justify-center のままだと、はみ出した左側が
                      // スクロールで辿り着けない位置に固定されてしまう
                      "justify-start overflow-x-auto"
                    : "justify-center overflow-x-visible"
                }`}
              >
                {handcardList.map((handcard, index) => (
                  // 枠は実物の縦横比(aspect-686/1212 → 48x84.8)で取り、画像は上下を詰めた
                  // 48x70(h-17.5)で描くため、枠内で中央に置く
                  // (置かないと画像が上端に寄り、Card の下側だけ余白が残る)
                  <div
                    key={`${handcard.card_id}-${index}`}
                    onClick={() => {
                      setCard(handcard);
                      onOpenForShowCardModal();
                    }}
                    className="w-12 aspect-686/1212 shrink-0 flex items-center justify-center"
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
          // 閉じるアニメーション中の wrapper がタップを塞ぎ、
          // 閉じた直後に手札の別カードを開けなくなるのを防ぐ
          ...closingPassthroughClassNames(isOpenForShowCardModal),
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={card?.card_name}
                  src={card?.image_url}
                  onClick={onClose}
                  className="rounded-[20px] cursor-pointer"
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
