"use client";

//import { createHash } from "crypto";

import WindowedSelect from "react-windowed-select";

import { useState } from "react";
import { useEffect } from "react";

import useSWR from "swr";

import { today, getLocalTimeZone } from "@internationalized/date";

import { CalendarDate } from "@internationalized/date";

import { Tabs, Tab } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Input } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Spinner } from "@heroui/spinner";

import { LuBookmark } from "react-icons/lu";
import { LuCalendar } from "react-icons/lu";
import { LuHouse } from "react-icons/lu";
import { LuMapPin } from "react-icons/lu";

import { Card, CardBody } from "@heroui/react";
import { CgSearch } from "react-icons/cg";

import Select from "react-select";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { useRouter } from "next/navigation";

import { OfficialEventResponseType, OfficialEventType } from "@app/types/official_event";
import { DeckGetAllType, DeckData } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { RecordCreateRequestType, RecordCreateResponseType } from "@app/types/record";

type OfficialEventOption = {
  label: string;
  value: string;
  id: number;
  date: Date;
  started_at: Date;
  ended_at: Date;
  type_id: number;
  event_time: string;
  event_datetime: string;
  title: string;
  shop_name: string;
  address: string;
  image_alt: string;
  image_src: string;
};

type DeckOption = {
  label: string;
  value: string;
  id: string;
  created_at: string;
  name: string;
  private_flg: boolean;
  latest_deck_code: DeckCodeType;
};

async function fetcherForOfficialEvent(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: OfficialEventResponseType = await res.json();

  return ret.official_events;
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

function convertToOfficialEventOption(
  officialEvent: OfficialEventType,
): OfficialEventOption {
  const startedAtDate = new Date(officialEvent.started_at);
  let startedAt =
    startedAtDate.getHours().toString().padStart(2, "0") +
    ":" +
    startedAtDate.getMinutes().toString().padStart(2, "0");
  const endedAtDate = new Date(officialEvent.ended_at);
  let endedAt =
    endedAtDate.getHours().toString().padStart(2, "0") +
    ":" +
    endedAtDate.getMinutes().toString().padStart(2, "0");
  let eventTime = "";

  if (endedAt == "00:00") {
    endedAt = "";
  }
  if (startedAt == "00:00") {
    startedAt = "";
  }
  if (startedAt != "") {
    eventTime = startedAt + " ~ ";
    if (endedAt != "") {
      eventTime = eventTime + endedAt;
    }
  }

  const datetime =
    new Date(officialEvent.date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) +
    " " +
    eventTime;

  officialEvent.title = officialEvent.title.replace(/【.*?】ポケモンカードジム　/g, "");
  officialEvent.title = officialEvent.title.replace(
    /【.*?】エクストラバトルの日/g,
    "エクストラバトルの日",
  );
  officialEvent.title = officialEvent.title.replace(/【.*?】ポケモンカードゲーム　/g, "");
  officialEvent.title = officialEvent.title.replace(/ポケモンカードゲーム /g, "");
  officialEvent.title = officialEvent.title.replace(/（オープンリーグ）/g, "");
  officialEvent.title = officialEvent.title.replace(/（マスターリーグ）/g, "");
  officialEvent.title = officialEvent.title.replace(/（シニアリーグ）/g, "");
  officialEvent.title = officialEvent.title.replace(/（ジュニアリーグ）/g, "");
  officialEvent.title = officialEvent.title.replace(/（スタンダード）/g, "");

  let image_alt = "";
  let image_src = "https://xx8nnpgt.user.webaccel.jp/images/icons/";
  if (officialEvent.type_id === 1) {
    if (officialEvent.title.includes("ポケモンジャパンチャンピオンシップス")) {
      image_alt = "ポケモンジャパンチャンピオンシップス";
      image_src += "jcs.png";
    } else if (officialEvent.title.includes("チャンピオンズリーグ")) {
      image_alt = "チャンピオンズリーグ";
      image_src += "cl.png";
    } else if (officialEvent.title.includes("スクランブルバトル")) {
      image_alt = "スクランブルバトル";
      image_src += "sb.png";
    } else {
      image_alt = "ポケモンカードゲーム";
      image_src += "pokemon_card_game.png";
    }
  } else if (officialEvent.type_id === 2) {
    image_alt = "シティリーグ";
    image_src += "city.png";
  } else if (officialEvent.type_id === 3) {
    image_alt = "トレーナーズリーグ";
    image_src += "trainers.png";
  } else if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) {
      image_alt = "ジムバトル";
      image_src += "gym.png";
    } else if (officialEvent.title.includes("MEGAウインターリーグ")) {
      image_alt = "MEGAウインターリーグ";
      image_src += "mega_winter_league.png";
    } else if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      image_alt = "スタートデッキ100　そのままバトル";
      image_src += "100_sonomama_battle.png";
    } else {
      image_alt = "ポケモンカードゲーム";
      image_src += "pokemon_card_game.png";
    }
  } else if (officialEvent.type_id === 6) {
    image_alt = "公認自主イベント";
    image_src += "organizer.png";
  } else if (officialEvent.type_id === 7) {
    if (officialEvent.title.includes("ポケモンカードゲーム教室")) {
      image_alt = "ポケモンカードゲーム教室";
      image_src += "classroom.png";
    } else if (officialEvent.title.includes("ビクティニBWR争奪戦")) {
      image_alt = "ビクティニBWR争奪戦";
      image_src += "victini_bwr.png";
    } else if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      image_alt = "スタートデッキ100　そのままバトル";
      image_src += "100_sonomama_battle.png";
    } else if (
      officialEvent.title.includes(
        "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～",
      )
    ) {
      image_alt = "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～";
      image_src += "100_sonomama_battle.png";
    } else {
      image_alt = "ポケモンカードゲーム";
      image_src += "pokemon_card_game.png";
    }
  } else {
    image_alt = "ポケモンカードゲーム";
    image_src += "pokemon_card_game.png";
  }

  return {
    //label: officialEvent.title + "\n" + officialEvent.shop_name + "\n" + eventTime + "\n" + officialEvent.address,
    label: officialEvent.id.toString(),
    value: officialEvent.id.toString(),
    id: officialEvent.id,
    date: new Date(officialEvent.date),
    started_at: new Date(officialEvent.started_at),
    ended_at: new Date(officialEvent.ended_at),
    type_id: officialEvent.type_id,
    event_time: eventTime,
    event_datetime: datetime,
    title: officialEvent.title,
    shop_name: officialEvent.shop_name ? officialEvent.shop_name : officialEvent.venue,
    address: officialEvent.address,
    image_alt: image_alt,
    image_src: image_src,
  };
}

function convertToDeckOption(data: DeckData): DeckOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    //label: data.name + "\n" + "[" + data.latest_deck_code + "]",
    label: data.id,
    value: data.id,
    id: data.id,
    created_at: created_at,
    name: data.name,
    private_flg: data.private_flg,
    latest_deck_code: data.latest_deck_code,
  };
}

type Props = {
  deck_id: string;
};

export default function TemplateRecordCreate({ deck_id }: Props) {
  const router = useRouter();

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDisabledCreateOfficialEventRecord, setIsDisabledCreateOfficialEventRecord] =
    useState(true);
  const [isDisabledCreateTonamelRecord, setIsDisabledCreateTonamelRecord] =
    useState(true);

  const [selectedDate, setSelectedDate] = useState<CalendarDate>(
    today(getLocalTimeZone()),
  );
  const [selectedOfficialEventOption, setSelectedOfficialEventOption] =
    useState<OfficialEventOption | null>(null);

  const [tonamelEventId, setTonamelEventId] = useState<string>("");
  const [tonamelEventTitle, setTonamelEventTitle] = useState<string>("");
  const [tonamelEventImage, setTonamelEventImage] = useState<string>("");
  const [isValidatedTonamelEventId, setIsValidatedTonamelEventId] =
    useState<boolean>(false);

  const [selectedDeckOption, setSelectedDeckOption] = useState<DeckOption | null>(null);

  const y = selectedDate.year;
  const m = String(selectedDate.month).padStart(2, "0");
  const d = String(selectedDate.day).padStart(2, "0");

  const officialEventOptions: OfficialEventOption[] = [];
  let officialEventOptionsMessage = "対象のイベントがありません";

  const url =
    "https://beta.vsrecorder.mobi/api/v1beta/official_events?date=" + `${y}-${m}-${d}`;
  const { data, error, isLoading } = useSWR<OfficialEventType[], Error>(
    url,
    fetcherForOfficialEvent,
  );

  if (error) {
    officialEventOptionsMessage = "エラーが発生しました";
  }
  if (isLoading) {
    officialEventOptionsMessage = "検索中...";
  }

  if (data?.length == 0) {
    officialEventOptionsMessage = "イベントがありません";
  }

  data?.map((oe: OfficialEventType) => {
    officialEventOptions.push(convertToOfficialEventOption(oe));
  });

  const deckOptions: DeckOption[] = [];
  let deckOptionsMessage = "対象のデッキがありません";
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

  /*
    TonamelのイベントIDが有効かどうかチェック
  */
  useEffect(() => {
    if (tonamelEventId === "") {
      setTonamelEventTitle("");
      setTonamelEventImage("");
      setIsValidatedTonamelEventId(true);
      return;
    }

    const checkTonamelEventId = async () => {
      try {
        const res = await fetch(
          "https://beta.vsrecorder.mobi/api/v1beta/tonamel_events/" + tonamelEventId,
          {
            method: "GET",
          },
        );

        if (!res.ok) {
          const ret = await res.json();
          throw new Error(`HTTP error: ${res.status} Message: ${ret.message}`);
        }

        const data = await res.json();
        setTonamelEventTitle(data.title);
        setTonamelEventImage(data.image);
        setIsValidatedTonamelEventId(true);
      } catch (error) {
        console.error(error);
        setTonamelEventTitle("");
        setTonamelEventImage("");
        setIsValidatedTonamelEventId(false);
      }
    };

    checkTonamelEventId();
  }, [tonamelEventId]);

  /*
    deck_idがある場合、deck_idのDeckを取得し、使用するデッキとして指定
  */
  useEffect(() => {
    if (!deck_id) return;

    const setSelectedDeck = async () => {
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

        const ret: DeckData = await res.json();

        setSelectedDeckOption(convertToDeckOption(ret));
        setImageLoaded(false);
        return ret;
      } catch (error) {
        setSelectedDeckOption(null);
        console.error(error);
      }
    };

    setSelectedDeck();
  }, [deck_id]);

  useEffect(() => {
    if (selectedOfficialEventOption) {
      setIsDisabledCreateOfficialEventRecord(false);
    } else {
      setIsDisabledCreateOfficialEventRecord(true);
    }
  }, [selectedOfficialEventOption]);

  useEffect(() => {
    if (tonamelEventId && isValidatedTonamelEventId && selectedDeckOption) {
      setIsDisabledCreateTonamelRecord(false);
    } else {
      setIsDisabledCreateTonamelRecord(true);
    }
  }, [tonamelEventId, isValidatedTonamelEventId, selectedDeckOption]);

  /*
    公式イベント用のレコードを作成する関数
  */
  async function createOfficialEventRecord(
    officialEventId: number,
    deckId: string,
    deckCodeId: string,
  ) {
    setIsDisabledCreateOfficialEventRecord(true);

    const toastId = addToast({
      title: "レコード作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    const record: RecordCreateRequestType = {
      official_event_id: officialEventId,
      tonamel_event_id: "",
      friend_id: "",
      deck_id: deckId,
      deck_code_id: deckCodeId,
      private_flg: true,
      tcg_meister_url: "",
      memo: "",
    };

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      const ret: RecordCreateResponseType = await res.json();

      addToast({
        title: "レコード作成完了",
        description: "レコードを作成しました",
        color: "success",
        timeout: 3000,
      });

      router.push("/records/" + ret.id);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "レコード作成失敗",
        description: (
          <>
            レコードの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      setIsDisabledCreateOfficialEventRecord(false);

      onClose();
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="md"
        placement="center"
        hideCloseButton
        isDismissable={false}
        classNames={{
          base: "sm:max-w-full",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className=""></ModalHeader>
              <ModalBody className="flex items-center justify-center h-60">
                <Spinner size="lg" className="" />
              </ModalBody>
              <ModalFooter className=""></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className="flex flex-col">
        <Tabs
          fullWidth
          size="md"
          className="fixed z-50 top-14 left-0 right-0 pl-1 pr-1 font-bold"
        >
          <Tab key="official" title="公式イベント">
            <div className="pt-9 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <label className="text-sm font-medium">日付</label>
                <DatePicker
                  aria-label="日付"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="mon"
                  defaultValue={selectedDate}
                  value={selectedDate}
                  onChange={(value) => {
                    setSelectedDate(value == null ? today(getLocalTimeZone()) : value);
                    setSelectedOfficialEventOption(null);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">イベント</label>
                <WindowedSelect
                  placeholder={
                    <div className="flex items-center gap-2">
                      <div className="text-xl">
                        <CgSearch />
                      </div>
                      <span className="text-sm">例）町田市</span>
                    </div>
                  }
                  isLoading={isLoading}
                  isClearable
                  isSearchable
                  noOptionsMessage={() => officialEventOptionsMessage}
                  options={officialEventOptions}
                  value={selectedOfficialEventOption}
                  onChange={(option) => {
                    setSelectedOfficialEventOption(option as OfficialEventOption);
                  }}
                  maxMenuHeight={500}
                  windowThreshold={100}
                  formatOptionLabel={(option, { context }) => {
                    const opt = option as OfficialEventOption;
                    if (context === "menu") {
                      return (
                        <div className="text-sm border p-2 w-full">
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <div className="flex items-center justify-center shrink-0">
                              <Image
                                alt={opt.image_alt}
                                src={opt.image_src}
                                radius="none"
                                className="h-18 w-18 object-contain"
                              />
                            </div>

                            <div className="grid gap-0.5 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span>
                                  <LuBookmark color="gray" />
                                </span>
                                <span className="truncate">{opt.title}</span>
                              </div>

                              <div className="flex items-center gap-2 min-w-0">
                                <span>
                                  <LuCalendar color="gray" />
                                </span>
                                <span className="truncate">{opt.event_datetime}</span>
                              </div>

                              <div className="flex items-center gap-2 min-w-0">
                                <span>
                                  <LuHouse color="gray" />
                                </span>
                                <span className="truncate">{opt.shop_name}</span>
                              </div>

                              <div className="flex items-center gap-2 min-w-0">
                                <span>
                                  <LuMapPin color="gray" />
                                </span>
                                <span className="truncate">{opt.address}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="text-sm truncate">
                        <span>
                          {opt.title} - {opt.shop_name}
                        </span>
                      </div>
                    );
                  }}
                />
              </div>
              <div className="pt-0.5">
                <Card radius="none" shadow="sm">
                  <CardBody>
                    <div className="pl-1 pr-1 flex items-center gap-5 w-full truncate">
                      <div className="flex items-center justify-center gap-5 truncate">
                        <div className="z-0 shrink-0">
                          {selectedOfficialEventOption ? (
                            <Image
                              alt={selectedOfficialEventOption.image_alt}
                              src={selectedOfficialEventOption.image_src}
                              radius="none"
                              className="h-18 w-18 object-contain"
                            />
                          ) : (
                            <Image
                              alt="ポケモンカードゲーム"
                              src="https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                              radius="none"
                              className="h-18 w-18 object-contain"
                            />
                          )}
                        </div>

                        <div className="flex flex-col gap-2 truncate">
                          <div className="flex items-center gap-2">
                            <span>
                              <LuBookmark color="gray" />
                            </span>
                            <span className="text-xs text-gray-600 truncate">
                              {selectedOfficialEventOption
                                ? selectedOfficialEventOption.title
                                : "イベント名"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span>
                              <LuCalendar color="gray" />
                            </span>
                            <span className="text-xs text-gray-600 truncate">
                              {selectedOfficialEventOption
                                ? selectedOfficialEventOption.event_datetime
                                : "イベント日時"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span>
                              <LuHouse color="gray" />
                            </span>
                            <span className="text-xs text-gray-600 truncate">
                              {selectedOfficialEventOption
                                ? selectedOfficialEventOption.shop_name
                                : "イベント主催者"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span>
                              <LuMapPin color="gray" />
                            </span>
                            <span className="text-xs text-gray-600 truncate">
                              {selectedOfficialEventOption
                                ? selectedOfficialEventOption.address
                                : "イベント会場"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">デッキ</label>
                <Select
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
                    setImageLoaded(false);
                  }}
                  menuPosition="fixed"
                  menuShouldScrollIntoView={true}
                  formatOptionLabel={(option, { context }) => {
                    if (context === "menu") {
                      return (
                        <div className="text-sm truncate border-1 p-3">
                          <div className="grid">
                            <span className="truncate">作成日：{option.created_at}</span>
                            <span className="truncate">デッキ名：{option.name}</span>
                            <span className="truncate">
                              デッキコード：{option.latest_deck_code.code}
                            </span>
                            <span>
                              <div className="relative w-full aspect-2/1">
                                {!imageLoaded && (
                                  <Skeleton className="absolute inset-0 rounded-lg" />
                                )}
                                <Image
                                  radius="none"
                                  shadow="none"
                                  alt={option.latest_deck_code.code}
                                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`}
                                  className=""
                                  onLoad={() => setImageLoaded(true)}
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
              <div className="flex flex-col items-center gap-2 pb-3">
                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={
                      selectedDeckOption
                        ? selectedDeckOption.latest_deck_code.code
                        : "デッキコードなし"
                    }
                    src={
                      selectedDeckOption
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckOption.latest_deck_code.code}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <Button
                color="primary"
                isDisabled={isDisabledCreateOfficialEventRecord}
                onPress={async () => {
                  onOpen();
                  await createOfficialEventRecord(
                    selectedOfficialEventOption ? selectedOfficialEventOption.id : 0,
                    selectedDeckOption ? selectedDeckOption.id : "",
                    selectedDeckOption ? selectedDeckOption.latest_deck_code.id : "",
                  );
                }}
                className="font-bold"
              >
                作成
              </Button>
            </div>
          </Tab>

          <Tab key="tonamel" title="Tonamel">
            <div className="pt-9 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <label className="text-sm font-medium">イベントID</label>
                <Input
                  isRequired
                  type="text"
                  placeholder="例) YFUVY"
                  isInvalid={!isValidatedTonamelEventId}
                  errorMessage="無効なイベントIDです"
                  value={tonamelEventId}
                  onChange={(e) => setTonamelEventId(e.target.value)}
                />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex justify-center w-4/5">
                  <span>『</span>
                  <span className="truncate">
                    {tonamelEventTitle ? tonamelEventTitle : "イベント名"}
                  </span>
                  <span>』</span>
                </div>
                <div className="w-4/6">
                  <div className="relative w-full aspect-video">
                    <Skeleton className="absolute inset-0" />
                    <Image
                      className="relative z-0"
                      radius="none"
                      shadow="none"
                      alt={"test"}
                      src={
                        tonamelEventImage
                          ? tonamelEventImage
                          : "https://tonamel.com/nuxt/6421c0babd-048e71d12e-3c73406b87-f5f712130f/_nuxt/assets/images/figures/logo/cover.3df31ff29b40f8d4032c417f126b9713.jpg"
                      }
                      onLoad={() => {}}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">デッキ</label>
                <Select
                  placeholder={
                    <div className="flex items-center gap-2">
                      <div className="text-xl">
                        <CgSearch />
                      </div>
                      <span className="text-sm">デッキ名</span>
                    </div>
                  }
                  isLoading={isLoading}
                  isClearable={true}
                  isSearchable={true}
                  noOptionsMessage={() => deckOptionsMessage}
                  options={deckOptions}
                  value={selectedDeckOption}
                  onChange={(option) => {
                    setSelectedDeckOption(option);
                    setImageLoaded(false);
                  }}
                  formatOptionLabel={(option, { context }) => {
                    if (context === "menu") {
                      return (
                        <div className="text-sm truncate border-1 p-3">
                          <div className="grid">
                            <span className="truncate">作成日：{option.created_at}</span>
                            <span className="truncate">デッキ名：{option.name}</span>
                            <span className="truncate">
                              デッキコード：{option.latest_deck_code.code}
                            </span>
                            <span>
                              <div className="relative w-full aspect-2/1">
                                {!imageLoaded && (
                                  <Skeleton className="absolute inset-0 rounded-lg" />
                                )}
                                <Image
                                  radius="none"
                                  shadow="none"
                                  alt={option.latest_deck_code.code}
                                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`}
                                  className=""
                                  onLoad={() => setImageLoaded(true)}
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
              <div className="flex flex-col items-center gap-2 pb-3">
                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={
                      selectedDeckOption
                        ? selectedDeckOption.latest_deck_code.code
                        : "デッキコードなし"
                    }
                    src={
                      selectedDeckOption
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckOption.latest_deck_code.code}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <Button
                color="primary"
                isDisabled={isDisabledCreateTonamelRecord}
                className="font-bold"
              >
                作成
              </Button>
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
