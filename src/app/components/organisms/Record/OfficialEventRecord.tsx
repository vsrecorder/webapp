"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import { LuHouse, LuLayers } from "react-icons/lu";

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

function getEventIconUrl(officialEvent: OfficialEventGetByIdResponseType): string {
  if (officialEvent.type_id === 1) {
    if (officialEvent.title.includes("ポケモンジャパンチャンピオンシップス")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/jcs.png";
    }
    if (officialEvent.title.includes("チャンピオンズリーグ")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/cl.png";
    }
    if (officialEvent.title.includes("スクランブルバトル")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/sb.png";
    }
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png";
  }
  if (officialEvent.type_id === 2) {
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/city.png";
  }
  if (officialEvent.type_id === 3) {
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/trainers.png";
  }
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/gym.png";
    }
    if (officialEvent.title.includes("MEGAウインターリーグ")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/mega_winter_league.png";
    }
    if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/100_sonomama_battle.png";
    }
    if (officialEvent.title.includes("マイジムNo.1決定戦")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/mygym_no1.png";
    }
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png";
  }
  if (officialEvent.type_id === 6) {
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/organizer.png";
  }
  if (officialEvent.type_id === 7) {
    if (officialEvent.title.includes("ポケモンカードゲーム教室")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/classroom.png";
    }
    if (officialEvent.title.includes("ビクティニBWR争奪戦")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/victini_bwr.png";
    }
    if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/100_sonomama_battle.png";
    }
    if (
      officialEvent.title.includes(
        "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～",
      )
    ) {
      return "https://xx8nnpgt.user.webaccel.jp/images/icons/100_detatoko_battle.png";
    }
    return "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png";
  }
  return "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png";
}

function getEventAccentColor(officialEvent: OfficialEventGetByIdResponseType): string {
  if (officialEvent.type_id === 1) return "bg-yellow-400";
  if (officialEvent.type_id === 2) return "bg-purple-500";
  if (officialEvent.type_id === 3) return "bg-blue-300";
  if (officialEvent.type_id === 4) return "bg-green-500";
  if (officialEvent.type_id === 6) return "bg-slate-400";
  if (officialEvent.type_id === 7) return "bg-pink-400";
  return "bg-default-300";
}

type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

function getChipColor(officialEvent: OfficialEventGetByIdResponseType): ChipColor {
  if (officialEvent.type_id === 1) return "warning";
  if (officialEvent.type_id === 2) return "secondary";
  if (officialEvent.type_id === 3) return "primary";
  if (officialEvent.type_id === 4) return "success";
  return "default";
}

function getEventTypeName(officialEvent: OfficialEventGetByIdResponseType): string {
  if (officialEvent.type_id === 1) {
    if (officialEvent.title.includes("ポケモンジャパンチャンピオンシップス")) return "JCS";
    if (officialEvent.title.includes("チャンピオンズリーグ")) return "CL";
    if (officialEvent.title.includes("スクランブルバトル")) return "スクランブルバトル";
    return "大型大会";
  }
  if (officialEvent.type_id === 2) return "シティリーグ";
  if (officialEvent.type_id === 3) return "トレーナーズリーグ";
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) return "ジムバトル";
    if (officialEvent.title.includes("MEGAウインターリーグ")) return "MEGAウインターリーグ";
    return "その他";
  }
  if (officialEvent.type_id === 6) return "公認自主";
  return "その他";
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
  const [loadingOfficialEvent, setLoadingOfficialEvent] = useState(true);

  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(recordData.data);

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
        data.title = data.title.replace(/【.*?】ポケモンカードジム /g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードジム  /g, "");
        data.title = data.title.replace(/【.*?】ポケモンカードジム   /g, "");
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
        data.title = data.title.replace(/（.*?）/g, "");

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
    if (!record?.deck_id) {
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
  }, [record?.deck_id]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loadingOfficialEvent || !officialEvent) {
    return <OfficialEventRecordSkeleton />;
  }

  if (!record) {
    return;
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

      <div className="cursor-pointer group" onClick={onOpenForDisplayRecordModal}>
        <Card
          shadow="none"
          className="border border-divider overflow-hidden hover:border-primary/50 transition-colors duration-200"
        >
          <CardBody className="p-0">
            <div className="flex">
              {/* イベント種別ごとの左アクセントバー */}
              <div className={`w-1 shrink-0 ${getEventAccentColor(officialEvent)}`} />

              <div className="flex-1 px-4 py-3.5 min-w-0">
                {/* 日付 */}
                <span className="text-xs text-default-500">{date}</span>

                {/* タイトル */}
                <p className="font-bold text-sm leading-snug truncate min-w-0 mt-0.5">
                  {officialEvent.title}
                </p>

                {/* イベント種別バッジ + 環境バッジ */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getChipColor(officialEvent)}
                    className="h-5 text-[10px] font-bold"
                  >
                    {getEventTypeName(officialEvent)}
                  </Chip>
                  {officialEvent.environment_title && (
                    <Chip
                      size="sm"
                      variant="flat"
                      color="default"
                      className="h-5 text-[10px] font-bold"
                    >
                      {officialEvent.environment_title}
                    </Chip>
                  )}
                </div>

                {/* 区切り線 */}
                <div className="border-t border-divider mt-3 mb-2.5" />

                {/* 情報行 */}
                <div className="flex items-center gap-3">
                  {/* イベントアイコン */}
                  <div className="w-8 h-8 rounded-lg bg-default-100 flex items-center justify-center overflow-hidden shrink-0">
                    <Image
                      alt={officialEvent.title}
                      src={getEventIconUrl(officialEvent)}
                      radius="none"
                      className="w-6 h-6 object-contain"
                    />
                  </div>

                  {/* 会場名・デッキ（縦並び） */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <LuHouse className="w-3.5 h-3.5 text-default-400 shrink-0" />
                      <span className="text-xs text-default-600 truncate">
                        {officialEvent.shop_name ? officialEvent.shop_name : officialEvent.venue}
                      </span>
                    </div>

                    {loadingDeck ? (
                      <Skeleton className="h-3.5 w-24 rounded" />
                    ) : (
                      <div className="flex items-center gap-1 min-w-0">
                        <LuLayers className="w-3.5 h-3.5 text-default-400 shrink-0" />
                        <span className="text-xs text-default-600 truncate">
                          {deck ? deck.name : "デッキなし"}
                        </span>
                      </div>
                    )}
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
