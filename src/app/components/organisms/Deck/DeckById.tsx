"use client";

import { createHash } from "crypto";

import { useEffect, useState } from "react";

import { Skeleton } from "@heroui/react";
//import { Chip } from "@heroui/react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";

import { LuTrash2 } from "react-icons/lu";

//import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/${id}`, {
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

async function fetchDeckCodesByDeckId(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}/deckcodes`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: string;
};

export default function DeckById({ id }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcodes, setDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckById(id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeckCodesData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCodesByDeckId(id);
        setDeckCodes(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckData();
    fetchDeckCodesData();
  }, [id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck || !deckcodes) {
    return;
  }

  const date = new Date(deck.created_at).toLocaleString();

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="p-3">
          <div>ID: {deck.id}</div>
          <div>登録日: {date}</div>
          <div>デッキ名: {deck.name}</div>
        </div>

        <ol className="relative">
          <div className="flex flex-col">
            {deckcodes.map((deckcode: DeckCodeType, index: number) => {
              const date = new Date(deckcode.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              });

              return (
                <li
                  key={deckcode.id}
                  className={`border-s-2  ${
                    index === deckcodes.length - 1
                      ? "border-transparent"
                      : "border-blue-300"
                  }`}
                >
                  <div className="pb-5">
                    <div className="flex items-center ">
                      <div className="flex pb-3">
                        <div className="-translate-x-1/2 w-3 h-3 rounded-full bg-blue-400" />
                        <div className="text-tiny">
                          作成日：
                          {date}
                        </div>
                      </div>
                    </div>

                    <div className="pl-2">
                      {deckcode.code ? (
                        <Card shadow="sm" className="py-3">
                          <CardHeader className="pb-0 pt-0 flex-col items-start gap-2 w-full">
                            {/* 両端配置 */}
                            <div className="flex items-center justify-between w-full">
                              {/* 左側 */}
                              <div className="flex flex-col items-start">
                                <div className="font-bold text-medium">
                                  バージョン：
                                  {createHash("sha1")
                                    .update(deckcode.id)
                                    .digest("hex")
                                    .slice(0, 8)}
                                </div>
                              </div>

                              {/* 右側 */}
                              <div>
                                <LuTrash2
                                  className="text-xl cursor-pointer text-red-500"
                                  onClick={() => {}}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col justify-center gap-0.5">
                              <div className="flex items-center gap-3">
                                <div className="text-tiny">
                                  <>デッキコード：</>
                                  <Snippet
                                    size="sm"
                                    radius="none"
                                    timeout={3000}
                                    disableTooltip={true}
                                    hideSymbol={true}
                                  >
                                    {deckcode?.code ? deckcode.code : "なし"}
                                  </Snippet>
                                </div>

                                {/*
                            {deckcode?.code && (
                              <>
                                <Chip size="sm" radius="md" variant="bordered">
                                  <small className="font-bold">
                                    {deckcode.private_code_flg ? "非公開" : "公開"}
                                  </small>
                                </Chip>
                              </>
                            )}
                            */}
                              </div>
                            </div>
                          </CardHeader>
                          <CardBody className="px-1 py-2">
                            <div className="relative w-full aspect-2/1">
                              {!imageLoaded && (
                                <Skeleton className="absolute inset-0 rounded-lg" />
                              )}
                              <Image
                                radius="sm"
                                shadow="none"
                                alt={deckcode.code}
                                src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                                className=""
                                onLoad={() => setImageLoaded(true)}
                              />
                            </div>
                          </CardBody>
                          {index === deckcodes.length - 1 ? (
                            deckcode.memo ? (
                              <CardFooter>
                                <div className="flex flex-col gap-3">
                                  <div className="font-bold text-tiny">メモ</div>
                                </div>
                              </CardFooter>
                            ) : (
                              <></>
                            )
                          ) : (
                            <CardFooter>
                              <div className="pl-1 flex flex-col gap-3">
                                {index !== deckcodes.length - 1 ? (
                                  /*
                              <DeckCardDiff
                                current_deckcode={deckcodes[index]}
                                previous_deckcode={deckcodes[index + 1]}
                              />
                              */
                                  <></>
                                ) : (
                                  <></>
                                )}
                                {deckcode.memo ? (
                                  <div className="font-bold text-tiny">メモ</div>
                                ) : (
                                  <></>
                                )}
                              </div>
                            </CardFooter>
                          )}
                        </Card>
                      ) : (
                        <></>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </div>
        </ol>
      </div>
    </>
  );
}

/*
 *
 *
 * デッキカードの差分を縦表示にするもの
 *
 *
 */

/*
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="p-3">
          <div>ID: {deck.id}</div>
          <div>登録日: {new Date(deck.created_at).toLocaleString()}</div>
          <div>デッキ名: {deck.name}</div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col">
            {deckcodes.map((deckcode: DeckCodeType, index: number) => {
              const date = new Date(deckcode.created_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              });

              return (
                <div key={deckcode.id} className="pl-0 pb-3">
                  <div className="flex items-center pb-3">
                    <div className="left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400 border-3 border-[#000000]" />
                    <div className="text-tiny">
                      作成日：
                      {date}
                    </div>
                  </div>
                  <div className="pl-5">
                    {deckcode.code ? (
                      <Card shadow="sm" className="py-3">
                        <CardHeader className="pb-0 pt-0 flex-col items-start gap-0">
                          <div className="font-bold text-medium">
                            バージョン：
                            {createHash("sha1")
                              .update(deckcode.id)
                              .digest("hex")
                              .slice(0, 8)}
                          </div>
                          <div className="text-tiny">
                            デッキコード：
                            {deckcode.code ? deckcode.code : "なし"}
                          </div>
                        </CardHeader>
                        <CardBody className="py-2">
                          <div className="relative w-full aspect-2/1">
                            <Skeleton className="absolute inset-0 rounded-lg" />
                            <Image
                              radius="sm"
                              shadow="none"
                              alt={deckcode.code}
                              src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                              className=""
                            />
                          </div>
                        </CardBody>
                        {index === deckcodes.length - 1 ? (
                          <CardFooter>
                            <div className="flex flex-col gap-3">
                              <div className="font-bold text-tiny">メモ</div>
                            </div>
                          </CardFooter>
                        ) : (
                          <CardFooter>
                            <div className="flex flex-col gap-3">
                              <div className="font-bold text-tiny">追加されたカード</div>
                              <div className="font-bold text-tiny">削除されたカード</div>
                              <div className="font-bold text-tiny">メモ</div>
                            </div>
                          </CardFooter>
                        )}
                      </Card>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
*/
