"use client";

import { useMemo } from "react";
import useSWR from "swr";
import WindowedSelect from "react-windowed-select";
import { Image, Card, CardBody } from "@heroui/react";
import { CgSearch } from "react-icons/cg";
import { LuBookmark, LuCalendar, LuHouse, LuMapPin } from "react-icons/lu";

import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";
import ScrollingText from "@app/components/molecules/ScrollingText";
import {
  getEventIconUrl,
  cleanOfficialEventTitle,
} from "@app/components/organisms/Record/officialEventHelpers";
import { OfficialEventResponseType, OfficialEventType } from "@app/types/official_event";

// 記録作成ページ(RecordCreate)の公式イベント選択と同等のUI/挙動を提供する共有コンポーネント。
// アイコンは officialEventHelpers.getEventIconUrl を使うため、イベント種別アイコンの追加は
// そちらのメンテナンスに追従する(RecordCreate 側と二重管理にならない)。

type OfficialEventOption = {
  label: string;
  value: string;
  id: number;
  title: string;
  shop_name: string;
  address: string;
  event_datetime: string;
  image_alt: string;
  image_src: string;
};

async function fetcher(url: string): Promise<OfficialEventType[]> {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Failed to fetch");
  const ret: OfficialEventResponseType = await res.json();
  return ret.official_events;
}

// RecordCreate の convertToOfficialEventOption と同じ日時整形。アイコンだけ共有ヘルパーに委譲。
function convertToOption(e: OfficialEventType): OfficialEventOption {
  const startedAtDate = new Date(e.started_at);
  let startedAt =
    startedAtDate.getHours().toString().padStart(2, "0") +
    ":" +
    startedAtDate.getMinutes().toString().padStart(2, "0");
  const endedAtDate = new Date(e.ended_at);
  let endedAt =
    endedAtDate.getHours().toString().padStart(2, "0") +
    ":" +
    endedAtDate.getMinutes().toString().padStart(2, "0");
  let eventTime = "";
  if (endedAt === "00:00") endedAt = "";
  if (startedAt === "00:00") startedAt = "";
  if (startedAt !== "") {
    eventTime = startedAt + " ~ ";
    if (endedAt !== "") eventTime += endedAt;
  }

  const datetime =
    new Date(e.date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) +
    " " +
    eventTime;

  // アイコンは元のタイトルで判定する(cleanOfficialEventTitle 前)ため e をそのまま渡す
  const image_src = getEventIconUrl(e);
  const title = cleanOfficialEventTitle(e.title);

  return {
    label: `${title} - ${e.shop_name}`,
    value: String(e.id),
    id: e.id,
    title,
    shop_name: e.shop_name,
    address: e.address,
    event_datetime: datetime,
    image_alt: title,
    image_src,
  };
}

type Props = {
  // 公式イベントを絞り込む開催日(YYYY-MM-DD)
  date: string;
  selectedId: number | null;
  onChange: (id: number | null) => void;
};

export default function OfficialEventSelect({ date, selectedId, onChange }: Props) {
  const reactSelectTheme = useReactSelectTheme();

  const { data, isLoading, error } = useSWR<OfficialEventType[]>(
    `/api/official_events?date=${date}`,
    fetcher,
  );

  const options = useMemo<OfficialEventOption[]>(
    () => (data ?? []).map(convertToOption),
    [data],
  );

  const selected = options.find((o) => o.id === selectedId) ?? null;

  let optionsMessage = "この日の公式イベントがありません";
  if (error) optionsMessage = "エラーが発生しました";
  else if (isLoading) optionsMessage = "検索中...";

  return (
    <div className="flex flex-col gap-1">
      <WindowedSelect
        theme={reactSelectTheme}
        placeholder={
          <div className="flex items-center gap-2">
            <div className="text-xl">
              <CgSearch />
            </div>
            <span className="text-sm">例）町田市</span>
          </div>
        }
        isClearable={true}
        isSearchable={true}
        noOptionsMessage={() => optionsMessage}
        options={options}
        value={selected}
        onChange={(option) =>
          onChange(option ? (option as OfficialEventOption).id : null)
        }
        maxMenuHeight={485}
        windowThreshold={100}
        menuPosition="fixed"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, maxWidth: "100%", overflow: "hidden" }),
        }}
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
                      <span className="shrink-0">
                        <LuBookmark color="gray" />
                      </span>
                      <ScrollingText text={opt.title} className="flex-1 min-w-0 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span>
                        <LuCalendar color="gray" />
                      </span>
                      <span className="truncate">{opt.event_datetime}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        <LuHouse color="gray" />
                      </span>
                      <ScrollingText text={opt.shop_name} className="flex-1 min-w-0 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        <LuMapPin color="gray" />
                      </span>
                      <ScrollingText text={opt.address} className="flex-1 min-w-0 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <ScrollingText text={`${opt.title} - ${opt.shop_name}`} className="text-sm" />
          );
        }}
      />

      <div className="pt-1">
        <Card radius="none" shadow="sm">
          <CardBody>
            <div className="pl-1 pr-1 flex items-center gap-5 w-full min-w-0">
              <div className="flex items-center justify-center gap-5 min-w-0">
                <div className="z-0 shrink-0">
                  <Image
                    alt={selected ? selected.image_alt : "ポケモンカードゲーム"}
                    src={
                      selected
                        ? selected.image_src
                        : "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                    }
                    radius="none"
                    className="h-18 w-18 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuBookmark color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.title : "イベント名"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuCalendar color="gray" />
                    </span>
                    <span className="text-xs text-default-600 truncate">
                      {selected ? selected.event_datetime : "イベント日時"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuHouse color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.shop_name : "イベント主催者"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuMapPin color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.address : "イベント会場"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
