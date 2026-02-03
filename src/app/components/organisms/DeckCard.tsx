"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { Skeleton } from "@heroui/react";

import { Link } from "@heroui/react";

import DeckCodeCard from "@app/components/organisms/DeckCodeCard";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckById(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckCodeById(deck_code_id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${deck_code_id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  deck_id: string;
  deck_code_id: string;
};

export default function DeckCard({ deck_id, deck_code_id }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    if (!deck_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckById(deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeckCodeData = async () => {
      try {
        if (deck_code_id) {
          setLoading(true);
          const data = await fetchDeckCodeById(deck_code_id);
          setDeckCode(data);
        }
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckData();
    fetchDeckCodeData();
  }, [deck_id, deck_code_id]);

  if (loading) {
    return (
      <Card className="pt-3">
        <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-medium pb-1">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="text-tiny">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="text-tiny">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardBody className="py-3 px-3">
          <div>
            <DeckCodeCard deckcode={deckcode} />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck) {
    return;
  }

  //return <DeckCard deck={deck} deckcode={deckcode} />;

  return (
    <>
      <Card className="pt-3">
        <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-medium pb-1">{deck.name}</div>
            <div className="text-tiny">
              作成日：
              {new Date(deck.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </div>
            <div className="text-tiny">
              デッキ情報：{deck.private_flg ? "非公開" : "公開"}
            </div>
          </div>
        </CardHeader>
        <CardBody className="py-3 px-3">
          <div onClick={() => onOpen()}>
            <DeckCodeCard deckcode={deckcode} />
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isOpen}
        size={"sm"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="">{deck.name}</ModalHeader>
              <ModalBody>
                <p className="text-tiny">{deckcode?.code}</p>
                <p className="text-tiny">
                  {deckcode?.private_code_flg === true
                    ? "デッキコード非公開"
                    : "デッキコード公開"}
                </p>
                {deckcode ? (
                  <>
                    <Image
                      radius="sm"
                      shadow="none"
                      alt={deckcode.code}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                    />
                  </>
                ) : (
                  <>
                    <Image
                      radius="sm"
                      shadow="none"
                      alt="デッキコードなし"
                      src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                    />
                  </>
                )}
                <Link
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href={`/decks/${deck.id}`}
                  className="text-xs"
                >
                  <span>このデッキの詳細ページを見る</span>
                </Link>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="solid" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
