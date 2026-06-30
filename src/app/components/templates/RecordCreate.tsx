"use client";

import { createHash } from "crypto";

import WindowedSelect from "react-windowed-select";

import { useState } from "react";
import { useEffect } from "react";
import { useMemo } from "react";

import { useRef } from "react";

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

import Select, { components } from "react-select";
import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { useRouter } from "next/navigation";

import ScrollingText from "@app/components/molecules/ScrollingText";

import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";

import { OfficialEventResponseType, OfficialEventType } from "@app/types/official_event";
import { DeckGetAllType, DeckData } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { RecordCreateRequestType, RecordCreateResponseType } from "@app/types/record";
import {
  UnofficialEventCreateRequestType,
  UnofficialEventCreateResponseType,
} from "@app/types/unofficial_event";

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
  pokemon_sprites: DeckPokemonSpriteType[];
};

type DeckCodeOption = {
  label: string;
  value: string;
  id: string;
  deck_id: string;
  created_at: string;
  code: string;
  private_code_flg: boolean;
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

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const charCode = match.charCodeAt(0);

    // 「ヴ」はひらがなの「ゔ」（\u3094）へ、それ以外は一律 -0x60
    return String.fromCharCode(charCode === 0x30f4 ? 0x3094 : charCode - 0x60);
  });
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
  officialEvent.title = officialEvent.title.replace(/【.*?】ポケモンカードジム /g, "");
  officialEvent.title = officialEvent.title.replace(/【.*?】ポケモンカードジム  /g, "");
  officialEvent.title = officialEvent.title.replace(/【.*?】ポケモンカードジム   /g, "");
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
    } else if (officialEvent.title.includes("マイジムNo.1決定戦")) {
      image_alt = "マイジムNo.1決定戦";
      image_src += "mygym_no1.png";
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
      image_src += "100_detatoko_battle.png";
    } else {
      image_alt = "ポケモンカードゲーム";
      image_src += "pokemon_card_game.png";
    }
  } else {
    image_alt = "ポケモンカードゲーム";
    image_src += "pokemon_card_game.png";
  }

  const tag = officialEvent.type_id === 3 ? "とれり トレリ" : "";

  return {
    label:
      officialEvent.title +
      " - " +
      katakanaToHiragana(officialEvent.title) +
      " " +
      officialEvent.shop_name +
      " " +
      eventTime +
      " " +
      officialEvent.address +
      " " +
      tag,
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
    label: data.name + " - " + katakanaToHiragana(data.name),
    value: data.id,
    id: data.id,
    created_at: created_at,
    name: data.name,
    private_flg: data.private_flg,
    latest_deck_code: data.latest_deck_code,
    pokemon_sprites: data.pokemon_sprites ?? [],
  };
}

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

// デッキの先頭2匹のポケモンスプライトを表示する。
// スプライトが未設定のスロットは unknown 画像で補完し、UsedDeckCard と同じ見た目を踏襲する。
function DeckSprites({
  sprites,
  sizeClass = "w-9 h-9",
}: {
  sprites: DeckPokemonSpriteType[];
  sizeClass?: string;
}) {
  const slots = [sprites?.[0], sprites?.[1]];

  return (
    <div className="flex items-center gap-0 shrink-0">
      {slots.map((sprite, i) => (
        <Image
          key={i}
          alt={sprite?.id || "unknown"}
          src={spriteImageUrl(sprite?.id)}
          radius="none"
          className={`${sizeClass} object-contain ${
            sprite ? spriteScaleClass(sprite.id) : "scale-150"
          } origin-bottom`}
        />
      ))}
    </div>
  );
}

// 必須項目であることを示すバッジ
function RequiredBadge() {
  return (
    <span className="text-[10px] font-bold text-danger border border-danger rounded px-1 leading-tight">
      必須
    </span>
  );
}

function StepLabel({
  num,
  required,
  children,
}: {
  num: number;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
        {num}
      </span>
      <span className="text-sm font-semibold">{children}</span>
      {required && <RequiredBadge />}
    </div>
  );
}

type Props = {
  deck_id: string;
  deck_code_id: string;
  tab?: "official" | "tonamel" | "unofficial";
};

// メニューを開いたとき、選択済みオプションがリストの先頭に来るようにスクロールする
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MenuListScrollToSelected = ({ innerRef, ...props }: any) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const hasValue: boolean = !!props.hasValue;

  // 選択なしの初回オープンでは、react-select が一瞬だけ下方向へスクロールする。
  // 補正前の誤った位置が描画されるとチラつくため、先頭へ揃え終わるまで非表示にする。
  // 選択ありの場合は流れるアニメーションを見せたいので、最初から表示しておく。
  const [hidden, setHidden] = useState(!hasValue);

  useEffect(() => {
    if (hasValue) {
      // 選択あり: レイアウト確定後に選択項目を先頭へ滑らかにスクロールする
      const timer = setTimeout(() => {
        const node = nodeRef.current;
        if (!node) return;
        const selected = node.querySelector(
          '[aria-selected="true"]',
        ) as HTMLElement | null;
        if (!selected) return;
        const nodeRect = node.getBoundingClientRect();
        const selectedRect = selected.getBoundingClientRect();
        const target = node.scrollTop + (selectedRect.top - nodeRect.top);
        node.scrollTo({ top: target, behavior: "smooth" });
      }, 80);
      return () => clearTimeout(timer);
    }

    // 選択なし: 非表示のまま毎フレーム先頭へ固定し続け、
    // react-select の位置計算が落ち着いてから表示する（チラつき防止）
    let rafId = 0;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    const loop = () => {
      const node = nodeRef.current;
      if (node) node.scrollTop = 0;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - start < 80) {
        rafId = requestAnimationFrame(loop);
      } else {
        setHidden(false);
      }
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [hasValue]);

  return (
    <components.MenuList
      {...props}
      innerRef={(node: HTMLDivElement | null) => {
        nodeRef.current = node;
        // react-select 内部の innerRef も維持する
        if (typeof innerRef === "function") innerRef(node);
        else if (innerRef) innerRef.current = node;
      }}
      innerProps={{
        ...props.innerProps,
        style: {
          ...(props.innerProps?.style ?? {}),
          visibility: hidden ? "hidden" : "visible",
        },
      }}
    />
  );
};

export default function TemplateRecordCreate({
  deck_id,
  deck_code_id,
  tab = "official",
}: Props) {
  const router = useRouter();

  // react-select をダークモードに追従させるテーマ
  const reactSelectTheme = useReactSelectTheme();

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDisabledCreateOfficialEventRecord, setIsDisabledCreateOfficialEventRecord] =
    useState(true);
  const [isDisabledCreateTonamelEventRecord, setIsDisabledCreateTonamelEventRecord] =
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
  const [tonamelEventDate, setTonamelEventDate] = useState<CalendarDate>(
    today(getLocalTimeZone()),
  );

  // 記入形式イベント用の状態。ユーザが任意に開催日とイベント名を入力する
  const [unofficialEventDate, setUnofficialEventDate] = useState<CalendarDate>(
    today(getLocalTimeZone()),
  );
  const [unofficialEventTitle, setUnofficialEventTitle] = useState<string>("");
  const [isDisabledCreateUnofficialRecord, setIsDisabledCreateUnofficialRecord] =
    useState(true);

  const [selectedDeckOption, setSelectedDeckOption] = useState<DeckOption | null>(null);
  const [selectedDeckCodeOption, setSelectedDeckCodeOption] =
    useState<DeckCodeOption | null>(null);
  const [imageLoadedForDeckCode, setImageLoadedForDeckCode] = useState(false);
  const [isDeckChangedByUser, setIsDeckChangedByUser] = useState(false);

  const deckSelectRef = useRef<HTMLDivElement | null>(null);

  const y = selectedDate.year;
  const m = String(selectedDate.month).padStart(2, "0");
  const d = String(selectedDate.day).padStart(2, "0");

  const officialEventUrl = `/api/official_events?date=${y}-${m}-${d}`;
  const {
    data: officialEventData,
    error: officialEventError,
    isLoading: officialEventLoading,
  } = useSWR<OfficialEventType[], Error>(officialEventUrl, fetcherForOfficialEvent, {
    revalidateOnFocus: false,
  });

  // イベント一覧の整形(正規表現・日付ローカライズ)はコストが高いため、
  // データが更新されたときだけ再計算する。これを怠ると imageLoaded 等の
  // 些細な state 変更による再レンダーごとに全件分の整形が走り重くなる。
  const officialEventOptions = useMemo<OfficialEventOption[]>(
    () => (officialEventData ?? []).map(convertToOfficialEventOption),
    [officialEventData],
  );

  let officialEventOptionsMessage = "対象のイベントがありません";
  if (officialEventError) {
    officialEventOptionsMessage = "エラーが発生しました";
  } else if (officialEventLoading) {
    officialEventOptionsMessage = "検索中...";
  } else if (officialEventData?.length === 0) {
    officialEventOptionsMessage = "イベントがありません";
  }

  const {
    data: deckData,
    error: deckError,
    isLoading: deckLoading,
  } = useSWR<DeckGetAllType, Error>(`/api/decks/all`, fetcherForDeck, {
    revalidateOnFocus: false,
  });

  // デッキ一覧の整形もデータ更新時のみ再計算する
  const deckOptions = useMemo<DeckOption[]>(
    () => (deckData ?? []).map(convertToDeckOption),
    [deckData],
  );

  let deckOptionsMessage = "対象のデッキがありません";
  if (deckError) {
    deckOptionsMessage = "エラーが発生しました";
  } else if (deckLoading) {
    deckOptionsMessage = "検索中...";
  } else if (deckData?.length === 0) {
    deckOptionsMessage = "デッキがありません";
  }

  /*
   *
   * バージョン(デッキコード)選択のデータを取得
   *
   * 選択されたデッキが変更されるたびに実施される
   *
   */
  const {
    data: deckcodeData,
    error: deckcodeError,
    isLoading: deckcodeLoading,
  } = useSWR<DeckCodeType[], Error>(
    selectedDeckOption ? `/api/decks/${selectedDeckOption.id}/deckcodes` : null,
    fetcherForDeckCode,
    { revalidateOnFocus: false },
  );

  const deckcodeOptions = useMemo<DeckCodeOption[]>(
    () => (deckcodeData ?? []).map(convertToDeckCodeOption),
    [deckcodeData],
  );

  let deckcodeOptionsMessage = "バージョンがありません";
  if (deckcodeError) {
    deckcodeOptionsMessage = "エラーが発生しました";
  } else if (deckcodeLoading) {
    deckcodeOptionsMessage = "検索中...";
  } else if (deckcodeData?.length === 0) {
    deckcodeOptionsMessage = "対象のデッキにバージョンがありません";
  }

  // デッキが選択されていてバージョンが存在するのに未選択の場合は作成不可
  const isDeckVersionInvalid =
    !!selectedDeckOption &&
    (deckcodeLoading || ((deckcodeData?.length ?? 0) > 0 && !selectedDeckCodeOption));

  // デッキを選択していてバージョンが存在する場合のみ、バージョンは必須となる
  const isDeckVersionRequired = !!selectedDeckOption && (deckcodeData?.length ?? 0) > 0;

  /*
    TonamelのイベントIDが有効かどうかチェック
  */
  useEffect(() => {
    if (!tonamelEventId) {
      setTonamelEventTitle("");
      setTonamelEventImage("");
      setIsValidatedTonamelEventId(true);
      setIsDisabledCreateTonamelEventRecord(false);
      return;
    }

    const checkTonamelEventId = async () => {
      try {
        const res = await fetch(`/api/tonamel_events/${tonamelEventId}`, {
          method: "GET",
        });

        if (!res.ok) {
          const ret = await res.json();
          throw new Error(`HTTP error: ${res.status} Message: ${ret.message}`);
        }

        const data = await res.json();
        setTonamelEventTitle(data.title);
        setTonamelEventImage(data.image);
        setIsValidatedTonamelEventId(true);
        setIsDisabledCreateTonamelEventRecord(false);
      } catch (error) {
        console.error(error);
        setTonamelEventTitle("");
        setTonamelEventImage("");
        setIsValidatedTonamelEventId(false);
        setIsDisabledCreateTonamelEventRecord(true);
      }
    };

    checkTonamelEventId();
  }, [tonamelEventId]);

  /*
    deck_idがある場合、deck_idのDeckを取得し、使用するデッキとして指定
    deck_code_idがある場合はそのバージョンを直接取得してセット（SWRキャッシュを迂回）
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

        if (deck_code_id) {
          try {
            const codeRes = await fetch(`/api/deckcodes/${deck_code_id}`, {
              cache: "no-store",
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!codeRes.ok) throw new Error("Failed to fetch deck code");

            const codeData: DeckCodeType = await codeRes.json();
            setSelectedDeckCodeOption(convertToDeckCodeOption(codeData));
            setImageLoadedForDeckCode(false);
          } catch (error) {
            // deck_code_id の取得に失敗した場合はSWRに任せる
            setIsDeckChangedByUser(true);
            console.error(error);
          }
        } else {
          setIsDeckChangedByUser(true);
        }

        return ret;
      } catch (error) {
        setSelectedDeckOption(null);
        setSelectedDeckCodeOption(null);
        console.error(error);
      }
    };

    setSelectedDeck();
  }, [deck_id, deck_code_id]);

  useEffect(() => {
    if (selectedOfficialEventOption) {
      setIsDisabledCreateOfficialEventRecord(false);
    } else {
      setIsDisabledCreateOfficialEventRecord(true);
    }
  }, [selectedOfficialEventOption]);

  // Tonamelは開催日(常に既定値あり)とイベントIDが必須。デッキは任意のため必須にしない
  useEffect(() => {
    if (tonamelEventId && isValidatedTonamelEventId) {
      setIsDisabledCreateTonamelEventRecord(false);
    } else {
      setIsDisabledCreateTonamelEventRecord(true);
    }
  }, [tonamelEventId, isValidatedTonamelEventId]);

  // 記入形式はイベント名が入力されていれば作成可能（デッキは任意）
  useEffect(() => {
    if (unofficialEventTitle.trim() !== "") {
      setIsDisabledCreateUnofficialRecord(false);
    } else {
      setIsDisabledCreateUnofficialRecord(true);
    }
  }, [unofficialEventTitle]);

  /*
   * デッキが変更されたとき、SWR でデッキコードが取得され次第
   * 最初のバージョンをデフォルトとして設定する
   */
  useEffect(() => {
    if (!isDeckChangedByUser) return;
    // SWR がまだ取得中の場合は待つ（isDeckChangedByUser は true のまま）
    if (deckcodeData === undefined) return;

    if (deckcodeData.length === 0) {
      setSelectedDeckCodeOption(null);
    } else {
      setSelectedDeckCodeOption(convertToDeckCodeOption(deckcodeData[0]));
    }
    setImageLoadedForDeckCode(false);
    setIsDeckChangedByUser(false);
  }, [deckcodeData, isDeckChangedByUser]);

  /*
   * デッキ選択セレクターのメニューを開いたときにキーボード上部へスクロールする
   * visualViewport でキーボード表示完了を検知し、固定ヘッダー分オフセットして上部に配置
   */
  const handleDeckSelectOpen = () => {
    const doScroll = () => {
      if (!deckSelectRef.current) return;
      deckSelectRef.current.style.scrollMarginTop = "80px";
      deckSelectRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", doScroll, { once: true });
      setTimeout(doScroll, 500);
    } else {
      setTimeout(doScroll, 300);
    }
  };

  /*
   *
   *
   * 公式イベント用の記録を作成する関数
   *
   *
   */
  async function createOfficialEventRecord(
    officialEventId: number,
    eventDate: Date,
    deckId: string,
    deckCodeId: string,
  ) {
    setIsDisabledCreateOfficialEventRecord(true);

    const toastId = addToast({
      title: "記録作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    // eventDate は JST オフセット付き(例: 2026-06-29T00:00:00+09:00)で渡される。
    // toISOString() を使うと UTC に変換され日付が一日前へずれるため、
    // Tonamel/記入形式と同様にローカル(壁時計)の年月日から組み立てる。
    const yyyy = eventDate.getFullYear();
    const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
    const dd = String(eventDate.getDate()).padStart(2, "0");
    const eventDateISO = `${yyyy}-${mm}-${dd}T00:00:00Z`;

    const record: RecordCreateRequestType = {
      official_event_id: officialEventId,
      tonamel_event_id: "",
      friend_id: "",
      deck_id: deckId,
      deck_code_id: deckCodeId,
      private_flg: true,
      tcg_meister_url: "",
      memo: "",
      event_date: eventDateISO,
      unofficial_event_id: "",
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
        title: "記録作成完了",
        description: "記録を作成しました",
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
        title: "記録作成失敗",
        description: (
          <>
            記録の作成に失敗しました
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

  /*
   *
   *
   * Tonamel用の記録を作成する関数
   *
   *
   */
  async function createTonamelEventRecord(
    tonamelEventId: string,
    eventDate: CalendarDate,
    deckId: string,
    deckCodeId: string,
  ) {
    setIsDisabledCreateTonamelEventRecord(true);

    const toastId = addToast({
      title: "記録作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    const yyyy = eventDate.year;
    const mm = String(eventDate.month).padStart(2, "0");
    const dd = String(eventDate.day).padStart(2, "0");
    const eventDateISO = `${yyyy}-${mm}-${dd}T00:00:00Z`;

    const record: RecordCreateRequestType = {
      official_event_id: 0,
      tonamel_event_id: tonamelEventId,
      friend_id: "",
      deck_id: deckId,
      deck_code_id: deckCodeId,
      private_flg: true,
      tcg_meister_url: "",
      memo: "",
      event_date: eventDateISO,
      unofficial_event_id: "",
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
        title: "記録作成完了",
        description: "記録を作成しました",
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
        title: "記録作成失敗",
        description: (
          <>
            記録の作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      setIsDisabledCreateTonamelEventRecord(false);

      onClose();
    }
  }

  /*
   *
   *
   * 記入形式イベント用の記録を作成する関数
   *
   * 非公式イベントやTonamel以外で運営される大会など、
   * ユーザが任意に開催日とイベント名を入力して記録を作成する
   *
   */
  async function createUnofficialRecord(
    eventDate: CalendarDate,
    eventTitle: string,
    deckId: string,
    deckCodeId: string,
  ) {
    setIsDisabledCreateUnofficialRecord(true);

    const toastId = addToast({
      title: "記録作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    // CalendarDate を RFC3339(UTC 0時)の文字列へ変換する
    const yyyy = eventDate.year;
    const mm = String(eventDate.month).padStart(2, "0");
    const dd = String(eventDate.day).padStart(2, "0");
    const eventDateISO = `${yyyy}-${mm}-${dd}T00:00:00Z`;

    try {
      // 1. 先に記入形式イベント(unofficial_events)を作成し、そのIDを取得する。
      //    records とは疎結合とし、records は unofficial_event_id で参照する。
      const unofficialEventReq: UnofficialEventCreateRequestType = {
        title: eventTitle.trim(),
        date: eventDateISO,
      };

      const unofficialEventRes = await fetch("/api/unofficial_events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(unofficialEventReq),
      });

      if (!unofficialEventRes.ok) {
        const t = await unofficialEventRes.json();
        throw new Error(`HTTP error: ${unofficialEventRes.status} Message: ${t.message}`);
      }

      const unofficialEvent: UnofficialEventCreateResponseType =
        await unofficialEventRes.json();

      // 2. 取得した unofficial_event_id を使って記録を作成する。
      const record: RecordCreateRequestType = {
        official_event_id: 0,
        tonamel_event_id: "",
        friend_id: "",
        deck_id: deckId,
        deck_code_id: deckCodeId,
        private_flg: true,
        tcg_meister_url: "",
        memo: "",
        event_date: eventDateISO,
        unofficial_event_id: unofficialEvent.id,
      };

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
        title: "記録作成完了",
        description: "記録を作成しました",
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
        title: "記録作成失敗",
        description: (
          <>
            記録の作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      setIsDisabledCreateUnofficialRecord(false);

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
          base: "bg-transparent shadow-none sm:max-w-full",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className=""></ModalHeader>
              <ModalBody className="">
                <div className="flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              </ModalBody>
              <ModalFooter className=""></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className="flex flex-col pt-1 w-full">
        <Tabs
          fullWidth
          size="md"
          defaultSelectedKey={tab}
          className="fixed z-50 top-15 left-0 right-0 pl-1 pr-1 font-bold"
        >
          {/*
           *
           *
           * 公式イベント
           *
           *
           */}
          <Tab key="official" title="公式イベント" isDisabled={false}>
            <div className="pt-9 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={1} required>
                    開催日
                  </StepLabel>
                </div>

                <DatePicker
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={selectedDate}
                  value={selectedDate}
                  onChange={(value) => {
                    setSelectedDate(value == null ? today(getLocalTimeZone()) : value);
                    setSelectedOfficialEventOption(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={2} required>
                    イベント
                  </StepLabel>
                </div>

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
                  noOptionsMessage={() => officialEventOptionsMessage}
                  options={officialEventOptions}
                  value={selectedOfficialEventOption}
                  onChange={(option) => {
                    setSelectedOfficialEventOption(option as OfficialEventOption);
                  }}
                  maxMenuHeight={485}
                  windowThreshold={100}
                  menuPosition="fixed"
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : null
                  }
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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
                                <ScrollingText
                                  text={opt.title}
                                  className="flex-1 min-w-0 text-sm"
                                />
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
                                <ScrollingText
                                  text={opt.shop_name}
                                  className="flex-1 min-w-0 text-sm"
                                />
                              </div>

                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0">
                                  <LuMapPin color="gray" />
                                </span>
                                <ScrollingText
                                  text={opt.address}
                                  className="flex-1 min-w-0 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <ScrollingText
                        text={`${opt.title} - ${opt.shop_name}`}
                        className="text-sm"
                      />
                    );
                  }}
                />
              </div>

              <div className="pt-1">
                <Card radius="none" shadow="sm">
                  <CardBody>
                    <div className="pl-1 pr-1 flex items-center gap-5 w-full min-w-0">
                      <div className="flex items-center justify-center gap-5 min-w-0">
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

                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">
                              <LuBookmark color="gray" />
                            </span>
                            <ScrollingText
                              text={
                                selectedOfficialEventOption
                                  ? selectedOfficialEventOption.title
                                  : "イベント名"
                              }
                              className="flex-1 min-w-0 text-xs text-default-600"
                            />
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">
                              <LuCalendar color="gray" />
                            </span>
                            <span className="text-xs text-default-600 truncate">
                              {selectedOfficialEventOption
                                ? selectedOfficialEventOption.event_datetime
                                : "イベント日時"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">
                              <LuHouse color="gray" />
                            </span>
                            <ScrollingText
                              text={
                                selectedOfficialEventOption
                                  ? selectedOfficialEventOption.shop_name
                                  : "イベント主催者"
                              }
                              className="flex-1 min-w-0 text-xs text-default-600"
                            />
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">
                              <LuMapPin color="gray" />
                            </span>
                            <ScrollingText
                              text={
                                selectedOfficialEventOption
                                  ? selectedOfficialEventOption.address
                                  : "イベント会場"
                              }
                              className="flex-1 min-w-0 text-xs text-default-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              <div className="flex flex-col gap-1 pt-1.5">
                <div className="flex flex-col gap-2">
                  <StepLabel num={3}>デッキ</StepLabel>
                </div>

                <div ref={deckSelectRef}>
                  <Select
                    theme={reactSelectTheme}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <div className="text-xl">
                          <CgSearch />
                        </div>
                        <span className="text-sm">デッキ名で検索</span>
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
                      setSelectedDeckCodeOption(null);
                      setIsDeckChangedByUser(true);
                      setImageLoadedForDeckCode(false);
                    }}
                    onFocus={handleDeckSelectOpen}
                    onMenuOpen={handleDeckSelectOpen}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    //menuShouldBlockScroll={true}
                    menuShouldScrollIntoView={true}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="flex items-center gap-2 min-w-0">
                                <DeckSprites
                                  sprites={option.pokemon_sprites}
                                  sizeClass="w-8 h-8"
                                />
                                <span className="truncate">
                                  デッキ名：{option.name}
                                </span>
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1">
                                  {!imageLoaded && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={
                                      option.latest_deck_code?.code || "デッキコードなし"
                                    }
                                    src={
                                      option.latest_deck_code?.code
                                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
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
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <DeckSprites
                            sprites={option.pokemon_sprites}
                            sizeClass="w-7 h-7"
                          />
                          <span className="truncate">{option.name}</span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">バージョン</label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    theme={reactSelectTheme}
                    minMenuHeight={270}
                    maxMenuHeight={270}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <span className="text-sm">バージョン</span>
                      </div>
                    }
                    isLoading={deckcodeLoading}
                    isDisabled={!selectedDeckOption || deckcodeLoading}
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
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                作成日：{option.created_at}
                              </span>
                              <span className="truncate">
                                バージョン：
                                {option.label}
                              </span>
                              <span className="truncate">
                                デッキコード：{option.code}
                              </span>
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
                            {option.label}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pb-1.5">
                <div className="relative w-full aspect-2/1">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckCodeOption.code}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <Button
                color="primary"
                isDisabled={isDisabledCreateOfficialEventRecord || isDeckVersionInvalid}
                onPress={async () => {
                  onOpen();
                  await createOfficialEventRecord(
                    selectedOfficialEventOption ? selectedOfficialEventOption.id : 0,
                    selectedOfficialEventOption
                      ? selectedOfficialEventOption.date
                      : new Date(),
                    selectedDeckOption ? selectedDeckOption.id : "",
                    selectedDeckCodeOption ? selectedDeckCodeOption.id : "",
                  );
                }}
                className="font-bold"
              >
                記録を作成
              </Button>
            </div>
          </Tab>

          {/*
           *
           *
           * Tonamel
           *
           *
           */}

          <Tab key="tonamel" title="Tonamel" isDisabled={false}>
            <div className="pt-9 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={1} required>
                    開催日
                  </StepLabel>
                </div>

                <DatePicker
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={tonamelEventDate}
                  value={tonamelEventDate}
                  onChange={(value) => {
                    setTonamelEventDate(
                      value == null ? today(getLocalTimeZone()) : value,
                    );
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={2} required>
                    イベントID
                  </StepLabel>
                </div>

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
                <div className="w-4/6 pb-3">
                  <div className="relative w-full aspect-video">
                    {!isValidatedTonamelEventId && (
                      <Skeleton className="absolute inset-0" />
                    )}
                    <Image
                      className="relative z-0 h-36 w-[256px] object-contain"
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
                <div className="flex flex-col gap-2">
                  <StepLabel num={3}>デッキ</StepLabel>
                </div>

                <div ref={deckSelectRef}>
                  <Select
                    theme={reactSelectTheme}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <div className="text-xl">
                          <CgSearch />
                        </div>
                        <span className="text-sm">デッキ名で検索</span>
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
                      setSelectedDeckCodeOption(null);
                      setIsDeckChangedByUser(true);
                      setImageLoadedForDeckCode(false);
                    }}
                    onFocus={handleDeckSelectOpen}
                    onMenuOpen={handleDeckSelectOpen}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    //menuShouldBlockScroll={true}
                    menuShouldScrollIntoView={true}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="flex items-center gap-2 min-w-0">
                                <DeckSprites
                                  sprites={option.pokemon_sprites}
                                  sizeClass="w-8 h-8"
                                />
                                <span className="truncate">
                                  デッキ名：{option.name}
                                </span>
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1">
                                  {!imageLoaded && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={
                                      option.latest_deck_code?.code || "デッキコードなし"
                                    }
                                    src={
                                      option.latest_deck_code?.code
                                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
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
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <DeckSprites
                            sprites={option.pokemon_sprites}
                            sizeClass="w-7 h-7"
                          />
                          <span className="truncate">{option.name}</span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">バージョン</label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    theme={reactSelectTheme}
                    minMenuHeight={270}
                    maxMenuHeight={270}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <span className="text-sm">バージョン</span>
                      </div>
                    }
                    isLoading={deckcodeLoading}
                    isDisabled={!selectedDeckOption || deckcodeLoading}
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
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                作成日：{option.created_at}
                              </span>
                              <span className="truncate">
                                バージョン：
                                {option.label}
                              </span>
                              <span className="truncate">
                                デッキコード：{option.code}
                              </span>
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
                            {option.label}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pb-1.5">
                <div className="relative w-full aspect-2/1">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckCodeOption.code}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <Button
                color="primary"
                isDisabled={
                  !isValidatedTonamelEventId ||
                  isDisabledCreateTonamelEventRecord ||
                  isDeckVersionInvalid
                }
                onPress={async () => {
                  onOpen();
                  await createTonamelEventRecord(
                    tonamelEventId ? tonamelEventId : "",
                    tonamelEventDate,
                    selectedDeckOption ? selectedDeckOption.id : "",
                    selectedDeckCodeOption ? selectedDeckCodeOption.id : "",
                  );
                }}
                className="font-bold"
              >
                記録を作成
              </Button>
            </div>
          </Tab>

          {/*
           *
           *
           * 記入形式
           *
           *
           */}

          <Tab key="unofficial" title="記入形式" isDisabled={false}>
            <div className="pt-9 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={1} required>
                    開催日
                  </StepLabel>
                </div>

                <DatePicker
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={unofficialEventDate}
                  value={unofficialEventDate}
                  onChange={(value) => {
                    setUnofficialEventDate(
                      value == null ? today(getLocalTimeZone()) : value,
                    );
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <div className="flex flex-col gap-2">
                  <StepLabel num={2} required>
                    イベント名
                  </StepLabel>
                </div>

                <Input
                  isRequired
                  type="text"
                  radius="none"
                  placeholder="例）〇〇自主大会"
                  value={unofficialEventTitle}
                  onChange={(e) => setUnofficialEventTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1.5">
                <div className="flex flex-col gap-2">
                  <StepLabel num={3}>デッキ</StepLabel>
                </div>

                <div ref={deckSelectRef}>
                  <Select
                    theme={reactSelectTheme}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <div className="text-xl">
                          <CgSearch />
                        </div>
                        <span className="text-sm">デッキ名で検索</span>
                      </div>
                    }
                    isClearable={true}
                    isSearchable={true}
                    noOptionsMessage={() => deckOptionsMessage}
                    options={deckOptions}
                    value={selectedDeckOption}
                    onChange={(option) => {
                      setSelectedDeckOption(option);
                      setImageLoaded(false);
                      setSelectedDeckCodeOption(null);
                      setIsDeckChangedByUser(true);
                      setImageLoadedForDeckCode(false);
                    }}
                    onFocus={handleDeckSelectOpen}
                    onMenuOpen={handleDeckSelectOpen}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="flex items-center gap-2 min-w-0">
                                <DeckSprites
                                  sprites={option.pokemon_sprites}
                                  sizeClass="w-8 h-8"
                                />
                                <span className="truncate">
                                  デッキ名：{option.name}
                                </span>
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1">
                                  {!imageLoaded && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={
                                      option.latest_deck_code?.code || "デッキコードなし"
                                    }
                                    src={
                                      option.latest_deck_code?.code
                                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${option.latest_deck_code.code}.jpg`
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
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
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <DeckSprites
                            sprites={option.pokemon_sprites}
                            sizeClass="w-7 h-7"
                          />
                          <span className="truncate">{option.name}</span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">バージョン</label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    theme={reactSelectTheme}
                    minMenuHeight={270}
                    maxMenuHeight={270}
                    placeholder={
                      <div className="flex items-center gap-2">
                        <span className="text-sm">バージョン</span>
                      </div>
                    }
                    isLoading={deckcodeLoading}
                    isDisabled={!selectedDeckOption || deckcodeLoading}
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
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid">
                              <span className="truncate">
                                作成日：{option.created_at}
                              </span>
                              <span className="truncate">
                                バージョン：
                                {option.label}
                              </span>
                              <span className="truncate">
                                デッキコード：{option.code}
                              </span>
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
                            {option.label}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pb-1.5">
                <div className="relative w-full aspect-2/1">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckCodeOption.code}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <Button
                color="primary"
                isDisabled={isDisabledCreateUnofficialRecord || isDeckVersionInvalid}
                onPress={async () => {
                  onOpen();
                  await createUnofficialRecord(
                    unofficialEventDate,
                    unofficialEventTitle,
                    selectedDeckOption ? selectedDeckOption.id : "",
                    selectedDeckCodeOption ? selectedDeckCodeOption.id : "",
                  );
                }}
                className="font-bold"
              >
                記録を作成
              </Button>
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
