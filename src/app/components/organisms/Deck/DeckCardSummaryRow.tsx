"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardSummary } from "@app/utils/deckcard";

import { DeckCardSummaryType } from "@app/types/deckcard";
import { PkeCardType } from "@app/types/deckcard";
import { CardType } from "@app/types/deckcard";

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
  const [error, setError] = useState(false);

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
    if (!deckcardSummary) {
      return;
    }

    const urls = [
      ...deckcardSummary.card_pke,
      ...deckcardSummary.card_gds,
      ...deckcardSummary.card_tool,
      ...deckcardSummary.card_sup,
      ...deckcardSummary.card_sta,
      ...deckcardSummary.card_ene,
    ].map((c) => c.image_url);

    const uniqueUrls = [...new Set(urls)];

    uniqueUrls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [deckcardSummary]);

  // デッキカード内訳だけを取得（失敗時のリロードから再利用）
  const loadDeckCardSummary = useCallback(async () => {
    if (!code) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCardSummary(code);
      setDeckCardSummary(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadDeckCardSummary();
  }, [loadDeckCardSummary]);

  if (!code) return;

  if (loading) {
    return (
      <div className="h-38 w-full">
        <Tabs fullWidth size="sm" classNames={{ tabList: "bg-content1 shadow-sm" }}>
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
    return <FetchError onRetry={loadDeckCardSummary} compact />;
  }

  if (!deckcardSummary) return;

  return (
    <>
      <div className="h-38 w-full flex flex-col">
        <Tabs
          fullWidth
          size="sm"
          className="flex flex-col"
          classNames={{
            base: "flex flex-col",
            tabList: "shrink-0 bg-content1 shadow-sm",
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
                    className="border-1.5 border-default-400 text-foreground"
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
                    className="border-1.5 border-default-400 text-foreground"
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
                    className="border-1.5 border-default-400 text-foreground"
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
                    className="border-1.5 border-default-400 text-foreground"
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
                    className="border-1.5 border-default-400 text-foreground"
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
                    className="border-1.5 border-default-400 text-foreground"
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
        onClose={() => {}}
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
                  alt={pkecard?.card_name}
                  src={pkecard?.image_url}
                  onLoad={() => {}}
                  className="rounded-[20px]"
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
        onClose={() => {}}
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
                  onLoad={() => {}}
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
