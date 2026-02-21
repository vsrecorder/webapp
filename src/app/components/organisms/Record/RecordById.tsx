"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@heroui/spinner";

import DisplayRecordById from "@app/components/organisms/Record//DisplayRecordById";

import { RecordGetByIdResponseType } from "@app/types/record";

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

type Props = {
  id: string;
};

export default function RecordById({ id }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
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

  if (loading) {
    return (
      <div className="pt-30 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-15 flex items-center justify-center">
        <div className="text-red-500">{error}</div>;
      </div>
    );
  }

  if (!record) {
    return;
  }

  return (
    <>
      <DisplayRecordById recordData={record} />
    </>
  );
}

/*

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

      <div className="flex flex-col gap-1.5">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">使用したデッキ</div>
        </div>
        <UsedDeckById
          record={record}
          setRecord={setRecord}
          enableShowDeckModal={false}
        />
      </div>

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
                        <span className="truncate">
                          デッキコード：{option.latest_deck_code.code}
                        </span>
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
    */
