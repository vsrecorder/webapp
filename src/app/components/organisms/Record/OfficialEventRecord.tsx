"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuHouse } from "react-icons/lu";
import { LuFlag } from "react-icons/lu";
import { LuEarth } from "react-icons/lu";
import { LuLayers } from "react-icons/lu";

import DisplayRecordModal from "@app/components/organisms/Record/Modal/DisplayRecordModal";

import { OfficialEventRecordSkeleton } from "@app/components/organisms/Record/Skeleton/OfficialEventRecordSkeleton";

import { RecordType, RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { DeckGetByIdResponseType } from "@app/types/deck";

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

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

type Props = {
  recordData: RecordType;
  enableDisplayRecordModal: boolean;
};

export default function OfficialEventRecord({
  recordData,
  enableDisplayRecordModal,
}: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [loadingOfficialEvent, setLoadingOfficialEvent] = useState(true);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [record, setRecord] = useState<RecordGetByIdResponseType>(recordData.data);

  const {
    isOpen: isOpenForDisplayRecordModal,
    onOpen: onOpenForDisplayRecordModal,
    onOpenChange: onOpenChangeForDisplayRecordModal,
    onClose: onCloseForDisplayRecordModal,
  } = useDisclosure();

  useEffect(() => {
    if (!recordData.data.official_event_id) {
      setLoadingOfficialEvent(false);
      return;
    }

    setLoadingOfficialEvent(true);

    const fetchData = async () => {
      try {
        setLoadingOfficialEvent(true);

        const data = await fetchOfficialEventById(recordData.data.official_event_id);

        data.title = data.title.replace(/【.*?】ポケモンカードジム　/g, "");
        data.title = data.title.replace(
          /【.*?】エクストラバトルの日/g,
          "エクストラバトルの日",
        );
        data.title = data.title.replace(/【.*?】ポケモンカードゲーム　/g, "");
        data.title = data.title.replace(/ポケモンカードゲーム /g, "");
        data.title = data.title.replace(/（オープンリーグ）/g, "");
        data.title = data.title.replace(/（マスターリーグ）/g, "");
        data.title = data.title.replace(/（シニアリーグ）/g, "");
        data.title = data.title.replace(/（ジュニアリーグ）/g, "");
        data.title = data.title.replace(/（スタンダード）/g, "");

        setOfficialEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingOfficialEvent(false);
      }
    };

    fetchData();
  }, [recordData.data.official_event_id]);

  useEffect(() => {
    if (!record.deck_id) {
      setLoadingDeck(false);
      return;
    }

    setLoadingDeck(true);

    const fetchData = async () => {
      try {
        setLoadingDeck(true);
        const data = await fetchDeckById(record.deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingDeck(false);
      }
    };

    fetchData();
  }, [record.deck_id]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loadingOfficialEvent || !officialEvent) {
    return <OfficialEventRecordSkeleton />;
  }

  const date = new Date(record.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      {enableDisplayRecordModal && (
        <DisplayRecordModal
          record={record}
          setRecord={setRecord}
          isOpen={isOpenForDisplayRecordModal}
          onOpenChange={onOpenChangeForDisplayRecordModal}
          onClose={onCloseForDisplayRecordModal}
        />
      )}

      <div className="" onClick={onOpenForDisplayRecordModal}>
        <Card shadow="sm" className="py-3 w-full">
          <CardHeader className="px-5 pb-0 pt-0 flex-col items-start gap-1.5">
            <div className="font-bold text-tiny">{date}</div>
            <div className="font-bold truncate w-full min-w-0">
              {loadingOfficialEvent ? (
                <Skeleton className="h-6 w-50" />
              ) : (
                officialEvent.title
              )}
            </div>
          </CardHeader>
          <CardBody className="px-7 py-3">
            <div className="flex items-center gap-5">
              <div className="h-22 w-22 shrink-0">
                {officialEvent.type_id === 1 &&
                  (officialEvent.title.includes(
                    "ポケモンジャパンチャンピオンシップス",
                  ) ? (
                    <Image
                      alt="ポケモンジャパンチャンピオンシップス"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/jcs.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes("チャンピオンズリーグ") ? (
                    <Image
                      alt="チャンピオンズリーグ"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/cl.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes("スクランブルバトル") ? (
                    <Image
                      alt="スクランブルバトル"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/sb.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : (
                    <Image
                      alt="不明"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ))}

                {officialEvent.type_id === 2 && (
                  <Image
                    alt="シティリーグ"
                    src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
                    radius="none"
                    className="h-22 w-22 object-contain"
                  />
                )}

                {officialEvent.type_id === 3 && (
                  <Image
                    alt="トレーナーズリーグ"
                    src="https://xx8nnpgt.user.webaccel.jp/images/icons/trainers.png"
                    radius="none"
                    className="h-22 w-22 object-contain"
                  />
                )}

                {officialEvent.type_id === 4 &&
                  (officialEvent.title.includes("ジムバトル") ? (
                    <Image
                      alt="ジムバトル"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/gym.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes("MEGAウインターリーグ") ? (
                    <Image
                      alt="MEGAウインターリーグ"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/mega_winter_league.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes(
                      "スタートデッキ100　そのままバトル",
                    ) ? (
                    <Image
                      alt="スタートデッキ100　そのままバトル"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/100_sonomama_battle.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : (
                    <Image
                      alt="不明"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ))}

                {officialEvent.type_id === 6 && (
                  <Image
                    alt="公認自主イベント"
                    src="https://xx8nnpgt.user.webaccel.jp/images/icons/organizer.png"
                    radius="none"
                    className="h-22 w-22 object-contain"
                  />
                )}

                {officialEvent.type_id === 7 &&
                  (officialEvent.title.includes("ポケモンカードゲーム教室") ? (
                    <Image
                      alt="ポケモンカードゲーム教室"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/classroom.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes("ビクティニBWR争奪戦") ? (
                    <Image
                      alt="ビクティニBWR争奪戦"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/victini_bwr.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes(
                      "スタートデッキ100　そのままバトル",
                    ) ? (
                    <Image
                      alt="スタートデッキ100　そのままバトル"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/100_sonomama_battle.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : officialEvent.title.includes(
                      "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～",
                    ) ? (
                    <Image
                      alt="100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/100_detatoko_battle.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ) : (
                    <Image
                      alt="不明"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                      radius="none"
                      className="h-22 w-22 object-contain"
                    />
                  ))}
              </div>

              <div className="flex flex-col gap-1.5 truncate w-full min-w-0">
                <div className="text-tiny truncate w-full min-w-0">
                  <div className="flex items-center gap-1">
                    <LuHouse className="text-gray-500" />

                    <div className="truncate w-full min-w-0">
                      {officialEvent.shop_name
                        ? officialEvent.shop_name
                        : officialEvent.venue}
                    </div>
                  </div>
                </div>
                <div className="text-tiny truncate w-full min-w-0">
                  <div className="flex items-center gap-1">
                    <LuFlag className="text-gray-500" />

                    <div className="truncate w-full min-w-0">
                      {officialEvent.league_title}
                      {officialEvent.league_title !== "その他" && <>リーグ</>} /
                      {officialEvent.regulation_title}
                    </div>
                  </div>
                </div>
                <div className="text-tiny truncate w-full min-w-0">
                  {loadingDeck && !deck ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <LuLayers className="text-gray-500" />

                      <div className="truncate w-full min-w-0">
                        {deck ? deck.name : "なし"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-tiny truncate w-full min-w-0">
                  <div className="flex items-center gap-1">
                    <LuEarth className="text-gray-500" />
                    <div className="truncate w-full min-w-0">
                      『{officialEvent.environment_title}』
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
