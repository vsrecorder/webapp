"use client";

import { useEffect, useState } from "react";

//import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Card, CardBody } from "@heroui/react";

import { DeckCodeType } from "@app/types/deck_code";

import { DeckCardListType } from "@app/types/deckcard";

async function fetchDeckCardList(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/list`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCardListType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  deckcode: DeckCodeType | null;
};

export default function InspectDeck({ deckcode }: Props) {
  const [deckcardList, setDeckCardList] = useState<DeckCardListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckcode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchCurrentDeckCardListData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCardList(deckcode.code);
        setDeckCardList(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentDeckCardListData();
  }, [deckcode]);

  if (!deckcode) return;

  if (loading) {
    return <></>;
  }

  if (error) {
    return;
  }

  if (!deckcardList) return;

  return (
    <div className="flex flex-col gap-9">
      <div className="px-6 flex justify-between w-full">
        <div className="flex flex-col justify-center gap-1">
          <div className="px-3 font-bold text-tiny">サイド</div>
          <Card shadow="md" className="w-fit">
            <CardBody className="">
              <div className="flex justify-center items-center gap-1">
                {deckcardList.slice(0, 6).map((card, index) => (
                  <div
                    key={index}
                    className="-ml-7 first:ml-0 w-12 aspect-686/1212 shrink-0"
                  >
                    <Image
                      radius="none"
                      shadow="none"
                      alt={card.card_name}
                      src={card.image_url}
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="pr-3 flex flex-col items-center justify-center gap-1">
          <div className="font-bold text-tiny">山札</div>
          <Card shadow="md" className="w-fit">
            <CardBody className="">
              <div className="flex justify-center items-center gap-1">
                {deckcardList.slice(0, 1).map((card, index) => (
                  <div key={index} className="w-12 aspect-686/1212 shrink-0">
                    <Image
                      radius="none"
                      shadow="none"
                      alt={card.card_name}
                      src={card.image_url}
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-1">
        <div className="px-3 font-bold text-tiny">手札</div>
        <Card shadow="md">
          <CardBody className="px-1">
            <div className="flex justify-center items-center gap-1">
              {deckcardList.slice(0, 7).map((card, index) => (
                <div key={index} className="w-12 aspect-686/1212 shrink-0">
                  <Image
                    radius="none"
                    shadow="none"
                    alt={card.card_name}
                    src={card.image_url}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
