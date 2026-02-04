"use client";

import { createHash } from "crypto";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import { DeckCodeType } from "@app/types/deck_code";
import { AcespecType } from "@app/types/acespec";
import { EnvironmentType } from "@app/types/environment";

async function fetchAcespec(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

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

type Props = {
  deckcode: DeckCodeType | null;
};

export default function DeckCodeCard({ deckcode }: Props) {
  const [acespec, setAcespec] = useState<AcespecType | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);
  const [loadingAcespec, setLoadingAcespec] = useState(true);
  const [loadingEnvrionment, setLoadingEnvironment] = useState(true);
  const [errorAcespec, setErrorAcespec] = useState<string | null>(null);
  const [errorEnvironment, setErrorEnvironment] = useState<string | null>(null);

  const version = deckcode
    ? createHash("sha1").update(deckcode.id).digest("hex").slice(0, 8)
    : "なし";

  useEffect(() => {
    if (!deckcode?.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode?.code]);

  useEffect(() => {
    if (!deckcode) {
      //setLoadingAcespec(false);
      //setLoadingEnvironment(false);
      return;
    }

    setLoadingAcespec(true);
    setLoadingEnvironment(true);

    const fetchAcespecData = async () => {
      try {
        setLoadingAcespec(true);
        const data = await fetchAcespec(deckcode.code);
        setAcespec(data);
      } catch (err) {
        console.log(err);
        setErrorAcespec("データの取得に失敗しました");
      } finally {
        setLoadingAcespec(false);
      }
    };

    const fetchEnvironmentData = async () => {
      try {
        setLoadingEnvironment(true);
        const data = await fetchEnvironment(deckcode.created_at);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
        setErrorEnvironment("データの取得に失敗しました");
      } finally {
        setLoadingEnvironment(false);
      }
    };

    fetchAcespecData();
    fetchEnvironmentData();
  }, [deckcode]);

  if (loadingAcespec || loadingEnvrionment) {
    return (
      <Card shadow="sm" className="py-3">
        <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
          <div className="text-tiny">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="text-tiny">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="text-tiny">
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardBody className="px-1 py-1">
          {deckcode ? (
            <>
              <Skeleton>
                <Image
                  radius="sm"
                  shadow="none"
                  alt={deckcode.code}
                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                />
              </Skeleton>
            </>
          ) : (
            <>
              <Skeleton>
                <Image
                  radius="sm"
                  shadow="none"
                  alt="デッキコードなし"
                  src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                />
              </Skeleton>
            </>
          )}
        </CardBody>
        <CardFooter>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (errorAcespec || errorEnvironment) {
    /*
    return (
      <div className="text-red-500">
        {errorAcespec} {errorEnvironment}
      </div>
    );
    */
  }

  return (
    <Card shadow="sm" className="py-3">
      <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
        <div className="text-tiny">バージョン：{version}</div>
        <div className="text-tiny">
          登録日：
          {deckcode
            ? new Date(deckcode.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })
            : "なし"}
        </div>
        <div className="text-tiny">
          {loadingEnvrionment ? (
            <Skeleton className="h-4 w-32" />
          ) : environment ? (
            <>環境：{environment.title}</>
          ) : (
            <></>
          )}
        </div>
      </CardHeader>
      <CardBody className="px-1 py-1">
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
      </CardBody>
      <CardFooter>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {loadingAcespec ? (
              <Skeleton className="bg-[#ee0077] h-6 w-32 rounded-2xl" />
            ) : acespec ? (
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
            ) : (
              <></>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
