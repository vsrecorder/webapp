"use client";

import { createHash } from "crypto";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
//import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import { DeckCodeType } from "@app/types/deck_code";
//import { AcespecType } from "@app/types/acespec";
import { EnvironmentType } from "@app/types/environment";

/*
async function fetchAcespec(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 204) {
      return null;
    }

    const ret: AcespecType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}
  */

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
  const [imageLoaded, setImageLoaded] = useState(false);
  //const [acespec, setAcespec] = useState<AcespecType | null>(null);
  //const [loadingAcespec, setLoadingAcespec] = useState(true);
  //const [errorAcespec, setErrorAcespec] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);
  const [loadingEnvrionment, setLoadingEnvironment] = useState(true);
  const [errorEnvironment, setErrorEnvironment] = useState<string | null>(null);

  const version =
    deckcode && deckcode.id
      ? createHash("sha1").update(deckcode.id).digest("hex").slice(0, 8)
      : "なし";

  useEffect(() => {
    if (!deckcode?.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode?.code]);

  useEffect(() => {
    if (!deckcode || !deckcode.id) {
      //setLoadingAcespec(false);
      setLoadingEnvironment(false);
      return;
    }

    //setLoadingAcespec(true);
    setLoadingEnvironment(true);

    /*
    const fetchAcespecData = async () => {
      try {
        setLoadingAcespec(true);
        const data = await fetchAcespec(deckcode.code);
        //setAcespec(data);
      } catch (err) {
        console.log(err);
        setErrorAcespec(
          `Acespecカードのデータ取得に失敗しました(デッキコード: ${deckcode.code})`,
        );
      } finally {
        setLoadingAcespec(false);
      }
    };
    */

    const fetchEnvironmentData = async () => {
      try {
        setLoadingEnvironment(true);
        const data = await fetchEnvironment(deckcode.created_at);
        setEnvironment(data);
      } catch (err) {
        console.log(err);
        setErrorEnvironment("環境名のデータ取得に失敗しました");
      } finally {
        setLoadingEnvironment(false);
      }
    };

    //fetchAcespecData();
    fetchEnvironmentData();
  }, [deckcode]);

  /*
  if (errorAcespec || errorEnvironment) {
  }
  */

  if (errorEnvironment) {
  }

  if (!deckcode) {
    return;
  }

  return (
    <Card shadow="sm" className="py-3 relative w-full">
      <CardHeader className="pt-0 pb-1 px-3">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-base text-gray-500">バージョンID：{version}</div>
          <div className="pl-1 flex flex-col gap-0.5">
            <div className="text-tiny">
              {deckcode && deckcode.id ? (
                <>
                  作成日：
                  {new Date(deckcode.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </>
              ) : (
                <>作成日：なし</>
              )}
            </div>
            <div className="text-tiny">
              {loadingEnvrionment ? (
                <div className="flex items-center">
                  環境名：
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : environment && environment.title ? (
                <>環境名：『{environment.title}』</>
              ) : (
                <>環境名：なし</>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="px-2 py-1">
        <div className="relative w-full aspect-2/1">
          {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
          {deckcode?.code ? (
            <>
              <Image
                radius="sm"
                shadow="none"
                alt={deckcode.code}
                src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                className=""
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <>
              <Image
                radius="sm"
                shadow="none"
                alt="デッキコードなし"
                src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                className=""
                onLoad={() => setImageLoaded(true)}
              />
            </>
          )}
        </div>
      </CardBody>
      {/*
      <CardFooter>
        <div className="flex flex-col gap-1">
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
      </CardFooter>
      */}
    </Card>
  );
}
