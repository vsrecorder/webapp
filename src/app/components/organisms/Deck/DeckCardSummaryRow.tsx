"use client";

import { useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { DeckCardSummaryType } from "@app/types/deckcard";
import { PkeCardType } from "@app/types/deckcard";
import { CardType } from "@app/types/deckcard";

async function fetchDeckCardSummary(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/summary`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCardSummaryType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  code: string | null;
};

function CardSkelton() {
  return (
    <div className="pl-1 flex flex-wrap gap-1">
      <div>
        <Skeleton className="h-5.5 w-24 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-21 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-18 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-22 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-28 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-32 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-22 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-18 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-28 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-5.5 w-32 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DeckCardSummaryRow({ code }: Props) {
  const [deckcardSummary, setDeckCardSummary] = useState<DeckCardSummaryType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pkecard, setPkeCard] = useState<PkeCardType>();
  const {
    isOpen: isOpenForShowPkeCardModal,
    onOpen: onOpenForShowPkeCardModal,
    onOpenChange: onOpenChangeForShowPkeCardModal,
  } = useDisclosure();

  const [card, setCard] = useState<CardType>();
  const {
    isOpen: isOpenForShowCardModal,
    onOpen: onOpenForShowCardModal,
    onOpenChange: onOpenChangeForShowCardModal,
  } = useDisclosure();

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchCurrentDeckCardSummaryData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCardSummary(code);
        setDeckCardSummary(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentDeckCardSummaryData();
  }, [code]);

  if (!code) return;

  if (loading) {
    return (
      <div className="h-44 w-full">
        <Tabs fullWidth size="sm" className="">
          <Tab key="card_pke" title={`ポケモン：??`}>
            <CardSkelton />
          </Tab>

          <Tab key="card_gds" title={`グッズ：??`}>
            <CardSkelton />
          </Tab>

          <Tab key="card_tool" title={`ポケモンのどうぐ：??`}>
            <CardSkelton />
          </Tab>

          <Tab key="card_sup" title={`サポート：??`}>
            <CardSkelton />
          </Tab>

          <Tab key="card_sta" title={`スタジアム：??`}>
            <CardSkelton />
          </Tab>

          <Tab key="card_ene" title={`エネルギー：??`}>
            <CardSkelton />
          </Tab>
        </Tabs>
      </div>
    );
  }

  if (error) {
    return;
  }

  if (!deckcardSummary) return;

  return (
    <>
      <div className="h-44 w-full flex flex-col">
        <Tabs
          fullWidth
          size="sm"
          className="flex flex-col"
          classNames={{
            base: "flex flex-col",
            tabList: "shrink-0",
            panel: "flex-1 overflow-y-auto",
          }}
        >
          <Tab key="card_pke" title={`ポケモン：${deckcardSummary.card_pke_count}`}>
            <div className="overflow-y-auto pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_pke.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setPkeCard(deckcard);
                    onOpenForShowPkeCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
          <Tab key="card_gds" title={`グッズ：${deckcardSummary.card_gds_count}`}>
            <div className="pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_gds.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
          <Tab
            key="card_tool"
            title={`ポケモンのどうぐ：${deckcardSummary.card_tool_count}`}
          >
            <div className="pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_tool.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
          <Tab key="card_sup" title={`サポート：${deckcardSummary.card_sup_count}`}>
            <div className="pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_sup.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
          <Tab key="card_sta" title={`スタジアム：${deckcardSummary.card_sta_count}`}>
            <div className="pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_sta.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
          <Tab key="card_ene" title={`エネルギー：${deckcardSummary.card_ene_count}`}>
            <div className="pl-1 flex flex-wrap gap-1">
              {deckcardSummary.card_ene.map((deckcard, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCard(deckcard);
                    onOpenForShowCardModal();
                  }}
                >
                  <Chip
                    size="sm"
                    radius="md"
                    color="default"
                    variant="bordered"
                    className="border-1.5 text-black"
                  >
                    <small className="font-bold">
                      {deckcard.card_name}: {deckcard.card_count}
                    </small>
                  </Chip>
                </div>
              ))}
            </div>
          </Tab>
        </Tabs>
      </div>

      <Modal
        isOpen={isOpenForShowPkeCardModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForShowPkeCardModal}
        classNames={{
          base: "sm:max-w-full bg-transparent shadow-none border-none",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={pkecard?.card_name}
                  src={pkecard?.image_url}
                  className=""
                  onLoad={() => {}}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isOpenForShowCardModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForShowCardModal}
        classNames={{
          base: "sm:max-w-full bg-transparent shadow-none border-none",
          closeButton: "text-2xl",
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
                  className=""
                  onLoad={() => {}}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
