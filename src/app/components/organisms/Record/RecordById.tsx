"use client";

import { createHash } from "crypto";

import useSWR from "swr";

import Select from "react-select";

import { useRef } from "react";

import { useEffect, useState } from "react";

import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { CgSearch } from "react-icons/cg";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import Matches from "@app/components/organisms/Match/Matches";
//import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

import { RecordGetByIdResponseType } from "@app/types/record";
import { DeckGetAllType, DeckData } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchRecordById(id: string) {
  try {
    const res = await fetch(`/api/records/` + id, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetcherForDeck(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: DeckGetAllType = await res.json();

  return ret;
}

type DeckOption = {
  label: string;
  value: string;
  id: string;
  created_at: string;
  name: string;
  private_flg: boolean;
  latest_deck_code: DeckCodeType;
};

function convertToDeckOption(data: DeckData): DeckOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    label: data.name + " " + data.latest_deck_code,
    value: data.id,
    id: data.id,
    created_at: created_at,
    name: data.name,
    private_flg: data.private_flg,
    latest_deck_code: data.latest_deck_code,
  };
}

async function fetcherForDeckCode(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: DeckCodeType[] = await res.json();

  return ret;
}

type DeckCodeOption = {
  label: string;
  value: string;
  id: string;
  deck_id: string;
  created_at: string;
  code: string;
  private_code_flg: boolean;
};

function convertToDeckCodeOption(data: DeckCodeType): DeckCodeOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    label: createHash("sha1").update(data.id).digest("hex").slice(0, 8),
    value: data.id,
    id: data.id,
    deck_id: data.deck_id,
    created_at: created_at,
    code: data.code,
    private_code_flg: data.private_code_flg,
  };
}

type Props = {
  id: string;
};

export default function RecordById({ id }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imageLoadedForDeck, setImageLoadedForDeck] = useState(false);
  const [selectedDeckOption, setSelectedDeckOption] = useState<DeckOption | null>(null);
  const [imageLoadedForDeckCode, setImageLoadedForDeckCode] = useState(false);
  const [selectedDeckCodeOption, setSelectedDeckCodeOption] =
    useState<DeckCodeOption | null>(null);

  const deckSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const record = await fetchRecordById(id);
        setRecord(record);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  /*
    recordにdeck_idとdeck_code_idがある場合、deck_idのDeckとdeck_code_idのDeckCodeを取得し、使用するデッキとして指定
  */
  useEffect(() => {
    if (!record) return;

    const setSelectedDeck = async () => {
      try {
        const res = await fetch(`/api/decks/${record.deck_id}`, {
          cache: "no-store",
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const ret: DeckData = await res.json();

        setSelectedDeckOption(convertToDeckOption(ret));
        setImageLoadedForDeck(false);
        return ret;
      } catch (error) {
        setSelectedDeckOption(null);
        console.error(error);
      }
    };

    const setSelectedDeckCode = async () => {
      try {
        const res = await fetch(`/api/deckcodes/${record.deck_code_id}`, {
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

        setSelectedDeckCodeOption(convertToDeckCodeOption(ret));
        setImageLoadedForDeckCode(false);
        return ret;
      } catch (error) {
        setSelectedDeckCodeOption(null);
        console.error(error);
      }
    };

    if (record.deck_id) {
      setSelectedDeck();
    }

    if (record.deck_code_id) {
      setSelectedDeckCode();
    }
  }, [record]);

  // デッキの選択が変更されたとき
  const deckOptions: DeckOption[] = [];
  let deckOptionsMessage = "デッキがありません";
  {
    const { data, error, isLoading } = useSWR<DeckGetAllType, Error>(
      `/api/decks/all`,
      fetcherForDeck,
    );

    if (error) {
      deckOptionsMessage = "エラーが発生しました";
    }

    if (isLoading) {
      deckOptionsMessage = "検索中...";
    }

    data?.map((deck: DeckData) => {
      deckOptions.push(convertToDeckOption(deck));
    });

    if (data?.length == 0) {
      deckOptionsMessage = "デッキがありません";
    }
  }

  const {
    data: deckcodeData,
    error: deckcodeError,
    isLoading: deckcodeLoading,
  } = useSWR<DeckCodeType[], Error>(
    selectedDeckOption ? `/api/decks/${selectedDeckOption.id}/deckcodes` : null,
    fetcherForDeckCode,
  );
  const deckcodeOptions: DeckCodeOption[] = [];
  let deckcodeOptionsMessage = "バージョンがありません";

  if (deckcodeError) {
    deckcodeOptionsMessage = "エラーが発生しました";
  }

  if (deckcodeLoading) {
    deckcodeOptionsMessage = "検索中...";
  }

  deckcodeData?.forEach((deckcode: DeckCodeType) => {
    deckcodeOptions.push(convertToDeckCodeOption(deckcode));
  });

  if (deckcodeData?.length === 0) {
    deckcodeOptionsMessage = "対象のデッキにバージョンがありません";
  }

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!record) {
    return;
  }

  return (
    <div className="pt-3 flex flex-col gap-9">
      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">参加したイベント</div>
        </div>

        {record.official_event_id !== 0 ? (
          <OfficialEventInfo record={record} setRecord={setRecord} />
        ) : (
          // TODO: Tonamelの場合
          <></>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">対戦結果</div>
        </div>
        <Matches record={record} enableCreateMatchModalButton={true} />
      </div>

      {/*
      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">使用したデッキ</div>
        </div>
        <UsedDeckById deck_id={record.deck_id} deck_code_id={record.deck_code_id} />
      </div>
      */}

      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-3">
          <div className="font-bold underline">使用したデッキ</div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">デッキ名</label>
          <div ref={deckSelectRef}>
            <Select
              onFocus={() => {
                setTimeout(() => {
                  deckSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 150);
              }}
              onMenuOpen={() => {
                setTimeout(() => {
                  deckSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 150);
              }}
              placeholder={
                <div className="flex items-center gap-2">
                  <div className="text-xl">
                    <CgSearch />
                  </div>
                  <span className="text-sm">デッキ名</span>
                </div>
              }
              //isLoading={}
              isClearable={true}
              isSearchable={true}
              noOptionsMessage={() => deckOptionsMessage}
              options={deckOptions}
              value={selectedDeckOption}
              onChange={(option) => {
                setSelectedDeckOption(option);
                setSelectedDeckCodeOption(null);
                setImageLoadedForDeck(false);
              }}
              menuPosition="fixed"
              menuPlacement="bottom"
              menuShouldScrollIntoView={true}
              formatOptionLabel={(option, { context }) => {
                if (context === "menu") {
                  return (
                    <div className="text-sm truncate border-1 p-2">
                      <div className="grid">
                        <span className="truncate">登録日：{option.created_at}</span>
                        <span className="truncate">デッキ名：{option.name}</span>
                        {/*
                        <span className="truncate">
                          デッキコード：{option.latest_deck_code.code}
                        </span>
                        */}
                        <span className="pt-1">
                          <div className="relative w-full aspect-2/1">
                            {!imageLoadedForDeck && (
                              <Skeleton className="absolute inset-0 rounded-lg" />
                            )}
                            <Image
                              radius="none"
                              shadow="none"
                              alt={option.latest_deck_code.code}
                              src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`}
                              className=""
                              onLoad={() => setImageLoadedForDeck(true)}
                            />
                          </div>
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-sm truncate">
                    <span>{option.name}</span>
                  </div>
                );
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">バージョン</label>
          <div ref={deckSelectRef}>
            <Select
              onFocus={() => {
                setTimeout(() => {
                  deckSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 150);
              }}
              onMenuOpen={() => {
                setTimeout(() => {
                  deckSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 150);
              }}
              placeholder={
                <div className="flex items-center gap-2">
                  <span className="text-sm">バージョン</span>
                </div>
              }
              //isLoading={}
              isClearable={true}
              isSearchable={false}
              noOptionsMessage={() => deckcodeOptionsMessage}
              options={deckcodeOptions}
              value={selectedDeckCodeOption}
              onChange={(option) => {
                setSelectedDeckCodeOption(option);
                setImageLoadedForDeckCode(false);
              }}
              menuPosition="fixed"
              menuPlacement="bottom"
              menuShouldScrollIntoView={true}
              formatOptionLabel={(option, { context }) => {
                if (context === "menu") {
                  return (
                    <div className="text-sm truncate border-1 p-2">
                      <div className="grid">
                        <span className="truncate">作成日：{option.created_at}</span>
                        <span className="truncate">
                          バージョン：
                          {createHash("sha1").update(option.id).digest("hex").slice(0, 8)}
                        </span>
                        <span className="truncate">デッキコード：{option.code}</span>
                        <span className="pt-1">
                          <div className="relative w-full aspect-2/1">
                            {!imageLoadedForDeckCode && (
                              <Skeleton className="absolute inset-0 rounded-lg" />
                            )}
                            <Image
                              radius="none"
                              shadow="none"
                              alt={option.code}
                              src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${option.code}.jpg`}
                              className=""
                              onLoad={() => setImageLoadedForDeckCode(true)}
                            />
                          </div>
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-sm truncate">
                    <span>
                      バージョン：
                      {createHash("sha1").update(option.id).digest("hex").slice(0, 8)}
                    </span>
                  </div>
                );
              }}
            />
          </div>
        </div>

        <div className="relative w-full aspect-2/1">
          {!imageLoadedForDeckCode && (
            <Skeleton className="absolute inset-0 rounded-lg" />
          )}
          <Image
            radius="sm"
            shadow="none"
            alt={
              selectedDeckCodeOption ? selectedDeckCodeOption.code : "デッキコードなし"
            }
            src={
              selectedDeckCodeOption
                ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckCodeOption.code}.jpg`
                : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
            }
            className="z-0"
            //onLoad={() => {}}
            onError={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
