"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardList } from "@app/utils/deckcard";

import { DeckCardType, CardType } from "@app/types/deckcard";

function makeCardKey(card: DeckCardType): string {
  const attacks = Array.isArray(card.attacks) ? card.attacks : [];

  return [
    card.card_name ?? "",
    card.ability ?? "",
    [...attacks].sort().join(","), // 順序差吸収
  ].join("||");
}

function toCardCountMap(cards: DeckCardType[] = []) {
  const map = new Map<string, { card: DeckCardType; count: number }>();

  for (const card of cards) {
    const key = makeCardKey(card);
    const current = map.get(key);

    if (current) {
      current.count += card.card_count ?? 1;
    } else {
      map.set(key, {
        card,
        count: card.card_count ?? 1,
      });
    }
  }

  return map;
}

function diffByContentWithCount(a: DeckCardType[], b: DeckCardType[]): DeckCardType[] {
  const aMap = toCardCountMap(a);
  const bMap = toCardCountMap(b);

  const result: DeckCardType[] = [];

  for (const [key, { card, count }] of aMap) {
    const bCount = bMap.get(key)?.count ?? 0;
    const diffCount = count - bCount;

    if (diffCount > 0) {
      result.push({
        ...card,
        card_count: diffCount,
      });
    }
  }

  return result;
}

type Props = {
  current_code: string;
  // 比較対象。空文字なら差分を出さない
  previous_code: string;
};

export default function DeckCardDiff({ current_code, previous_code }: Props) {
  const [currentDeckCardList, setCurrentDeckCardList] = useState<DeckCardType[]>();
  const [previousDeckCardList, setPreviousDeckCardList] = useState<DeckCardType[]>();
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [currentError, setCurrentError] = useState(false);
  const [previousError, setPreviousError] = useState(false);

  const [card, setCard] = useState<CardType>();
  const {
    isOpen: isOpenForShowCardModal,
    onOpen: onOpenForShowCardModal,
    onOpenChange: onOpenChangeForShowCardModal,
  } = useDisclosure();

  // 現在バージョンのカード一覧だけを取得（失敗時のリロードから再利用）
  const loadCurrent = useCallback(async () => {
    if (!current_code) {
      setLoading1(false);
      return;
    }

    setCurrentError(false);
    setLoading1(true);

    try {
      const data = await fetchDeckCardList(current_code);
      setCurrentDeckCardList(data);

      const urls = [...data].map((c) => c.image_url);
      const uniqueUrls = [...new Set(urls)];
      uniqueUrls.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });
    } catch (err) {
      console.log(err);
      setCurrentError(true);
    } finally {
      setLoading1(false);
    }
  }, [current_code]);

  // 直前バージョンのカード一覧だけを取得
  const loadPrevious = useCallback(async () => {
    if (!previous_code) {
      setLoading2(false);
      return;
    }

    setPreviousError(false);
    setLoading2(true);

    try {
      const data = await fetchDeckCardList(previous_code);
      setPreviousDeckCardList(data);

      const urls = [...data].map((c) => c.image_url);
      const uniqueUrls = [...new Set(urls)];
      uniqueUrls.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });
    } catch (err) {
      console.log(err);
      setPreviousError(true);
    } finally {
      setLoading2(false);
    }
  }, [previous_code]);

  useEffect(() => {
    loadCurrent();
    loadPrevious();
  }, [loadCurrent, loadPrevious]);

  if (!current_code || !previous_code) return;

  if (loading1 || loading2) {
    return (
      <div className="flex flex-col gap-3">
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">追加されたカード</div>
          <div className="pl-1 pb-1 flex flex-nowrap gap-1 overflow-x-auto">
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-20 rounded-2xl" />
            </div>
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-26 rounded-2xl" />
            </div>
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-18 rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">削除されたカード</div>
          <div className="pl-1 pb-1 flex flex-nowrap gap-1 overflow-x-auto">
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-16 rounded-2xl" />
            </div>
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-22 rounded-2xl" />
            </div>
            <div className="shrink-0">
              <Skeleton className="h-5.5 w-28 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentError) {
    return <FetchError onRetry={loadCurrent} compact />;
  }

  if (previousError) {
    return <FetchError onRetry={loadPrevious} compact />;
  }

  if (!currentDeckCardList || !previousDeckCardList) return;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">追加されたカード</div>
          <div className="pl-1 flex flex-nowrap gap-1 overflow-x-auto">
            {diffByContentWithCount(currentDeckCardList, previousDeckCardList).map(
              (deckcard, index) => (
                <div
                  key={index}
                  className="shrink-0"
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="success"
                    variant="bordered"
                    className="border-1.5 text-foreground"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">削除されたカード</div>
          <div className="pl-1 flex flex-nowrap gap-1 overflow-x-auto">
            {diffByContentWithCount(previousDeckCardList, currentDeckCardList).map(
              (deckcard, index) => (
                <div
                  key={index}
                  className="shrink-0"
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="danger"
                    variant="bordered"
                    className="border-1.5 text-foreground"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ),
            )}
          </div>
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
