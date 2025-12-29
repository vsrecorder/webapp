"use client";

import { useState } from "react";
import { useEffect } from "react";

//import useSWR, { useSWRConfig } from "swr";
import useSWR from "swr";

import { today, getLocalTimeZone } from "@internationalized/date";

import { CalendarDate } from "@internationalized/date";

import { Tabs, Tab } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Input } from "@heroui/react";

import { FiCalendar, FiHome, FiMapPin, FiBookmark } from "react-icons/fi";

import { Card, CardBody } from "@heroui/react";
import { CgSearch } from "react-icons/cg";

import Select from "react-select";

import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import {
  OfficialEventResponseType,
  OfficialEventType,
  DeckResponseType,
  DeckType,
} from "@app/(default)/types";

import CreateDeckModal from "./CreateDeckModal";

type OfficialEventOption = {
  label: string;
  value: string;
  id: number;
  date: Date;
  started_at: Date;
  ended_at: Date;
  event_time: string;
  event_datetime: string;
  title: string;
  shop_name: string;
  address: string;
};

type DeckOption = {
  label: string;
  value: string;
  id: string;
  created_at: string;
  name: string;
  private_flg: boolean;
  latest_deck_code: DeckCode;
};

type DeckCode = {
  id: string;
  created_at: Date;
  user_id: string;
  deck_id: string;
  code: string;
  private_code_flg: boolean;
};

async function fetcherForOfficialEvent(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const ret: OfficialEventResponseType = await res.json();

  return ret.official_events;
}

async function fetcherForDeck(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const ret: DeckResponseType = await res.json();

  return ret.decks;
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

  const weekDays: {
    [key: number]: string;
  } = {
    0: "(日)",
    1: "(月)",
    2: "(火)",
    3: "(水)",
    4: "(木)",
    5: "(金)",
    6: "(土)",
  };

  const date = new Date(officialEvent.date);
  const year = date.getFullYear().toString();
  const month = ("0" + (1 + date.getMonth()).toString()).slice(-2);
  const day = ("0" + date.getDate().toString()).slice(-2);
  const weekDay = weekDays[date.getDay()];
  const datetime = year + "/" + month + "/" + day + weekDay + " " + eventTime;

  return {
    label:
      officialEvent.title +
      "\n" +
      officialEvent.shop_name +
      "\n" +
      eventTime +
      "\n" +
      officialEvent.address,
    value: officialEvent.id.toString(),
    id: officialEvent.id,
    date: new Date(officialEvent.date),
    started_at: new Date(officialEvent.started_at),
    ended_at: new Date(officialEvent.ended_at),
    event_time: eventTime,
    event_datetime: datetime,
    title: officialEvent.title,
    shop_name: officialEvent.shop_name ? officialEvent.shop_name : officialEvent.venue,
    address: officialEvent.address,
  };
}

function convertToDeckOption(deck: DeckType): DeckOption {
  const date = new Date(deck.data.created_at);
  const year_str = date.getFullYear().toString();
  const month_str = ("0" + (1 + date.getMonth()).toString()).slice(-2);
  const day_str = ("0" + date.getDate().toString()).slice(-2);

  const weekDays: {
    [key: number]: string;
  } = {
    0: "(日)",
    1: "(月)",
    2: "(火)",
    3: "(水)",
    4: "(木)",
    5: "(金)",
    6: "(土)",
  };
  const weekDay = weekDays[date.getDay()];

  return {
    label: deck.data.name + "\n" + "[" + deck.data.latest_deck_code + "]",
    value: deck.data.id,
    id: deck.data.id,
    created_at: year_str + "/" + month_str + "/" + day_str + weekDay,
    name: deck.data.name,
    private_flg: deck.data.private_flg,
    latest_deck_code: deck.data.latest_deck_code,
  };
}

export default function CreateRecord() {
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

  data?.map((oe: OfficialEventType) => {
    officialEventOptions.push(convertToOfficialEventOption(oe));
  });
  if (data?.length == 0) {
    officialEventOptionsMessage = "イベントがありません";
  }

  //const { mutate } = useSWRConfig();
  //mutate(`/api/decks`);
  const deckOptions: DeckOption[] = [];
  let deckOptionsMessage = "対象のデッキがありません";
  {
    const { data, error, isLoading } = useSWR<DeckType[], Error>(
      `/api/decks`,
      fetcherForDeck,
    );

    if (error) {
      deckOptionsMessage = "エラーが発生しました";
    }
    if (isLoading) {
      deckOptionsMessage = "検索中...";
    }

    data?.map((deck: DeckType) => {
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

  return (
    <div className="flex flex-col">
      <Tabs fullWidth size="md">
        <Tab key="official" title="公式イベント">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">日付</label>
              <DatePicker
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
              <Select
                placeholder={
                  <div className="flex items-center gap-2">
                    <div className="text-xl">
                      <CgSearch />
                    </div>
                    <span className="text-sm">例）町田市</span>
                  </div>
                }
                isLoading={isLoading}
                isClearable={true}
                isSearchable={true}
                noOptionsMessage={() => officialEventOptionsMessage}
                options={officialEventOptions}
                value={selectedOfficialEventOption}
                onChange={(option) => {
                  setSelectedOfficialEventOption(option);
                }}
                formatOptionLabel={(option, { context }) => {
                  if (context === "menu") {
                    return (
                      <div className="text-sm truncate">
                        <div className="grid">
                          <span>
                            {option.title} {option.event_time}
                          </span>
                          <span>{option.shop_name}</span>
                          <span>{option.address}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="text-sm truncate">
                      <span>{option.title}</span>
                    </div>
                  );
                }}
              />
            </div>
            <Card radius="none" shadow="sm">
              <CardBody>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span>
                      <FiCalendar color="gray" />
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {selectedOfficialEventOption
                        ? selectedOfficialEventOption.event_datetime
                        : "イベント日時"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      <FiBookmark color="gray" />
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {selectedOfficialEventOption
                        ? selectedOfficialEventOption.title
                        : "イベント名"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      <FiHome color="gray" />
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {selectedOfficialEventOption
                        ? selectedOfficialEventOption.shop_name
                        : "イベント主催者"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      <FiMapPin color="gray" />
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {selectedOfficialEventOption
                        ? selectedOfficialEventOption.address
                        : "イベント会場"}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
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
                }}
                formatOptionLabel={(option, { context }) => {
                  if (context === "menu") {
                    return (
                      <div className="text-sm">
                        <div className="grid">
                          <span className="truncate">登録日：{option.created_at}</span>
                          <span className="truncate">デッキ名：{option.name}</span>
                          <span className="truncate">
                            デッキコード：{option.latest_deck_code.code}
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
            <div className="flex flex-col items-center gap-2">
              <Image
                className="relative z-0"
                radius="none"
                shadow="none"
                alt={"test"}
                src={
                  selectedDeckOption
                    ? "https://xx8nnpgt.user.webaccel.jp/images/decks/" +
                      selectedDeckOption.latest_deck_code.code +
                      ".jpg"
                    : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                }
                onLoad={() => {}}
                onError={() => {}}
              />
              <CreateDeckModal />
            </div>

            <Button color="primary" isDisabled={true}>
              作成
            </Button>
          </div>
        </Tab>
        <Tab key="tonamel" title="Tonamel">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center w-4/5">
                <span>『</span>
                <span className="truncate">
                  {tonamelEventTitle ? tonamelEventTitle : "イベント名"}
                </span>
                <span>』</span>
              </div>
              <div className="w-4/6">
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
                }}
                formatOptionLabel={(option, { context }) => {
                  if (context === "menu") {
                    return (
                      <div className="text-sm truncate">
                        <div className="grid">
                          <span className="truncate">登録日：{option.created_at}</span>
                          <span className="truncate">デッキ名：{option.name}</span>
                          <span className="truncate">
                            デッキコード：{option.latest_deck_code.code}
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
            <div className="flex flex-col items-center gap-2">
              <Image
                className="relative z-0"
                radius="none"
                shadow="none"
                alt={"test"}
                src={
                  selectedDeckOption
                    ? "https://xx8nnpgt.user.webaccel.jp/images/decks/" +
                      selectedDeckOption.latest_deck_code.code +
                      ".jpg"
                    : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                }
                onLoad={() => {}}
                onError={() => {}}
              />
              <CreateDeckModal />
            </div>

            <Button color="primary" isDisabled={true}>
              作成
            </Button>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
