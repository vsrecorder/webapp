"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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
  // true の間はデータが揃っていてもローディング表示(裏向きカード)を出し続ける。
  // モーダルの入場アニメーション中にカード一覧の実体化(大きなコミット)が走ると
  // シートの動きが止まるため、着地までの間これを立てて実体化を遅延させる。
  holdSkeleton?: boolean;
};

export default function InspectDeck({ deckcode, holdSkeleton = false }: Props) {
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
