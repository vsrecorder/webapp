"use client";

import WindowedSelect from "react-windowed-select";

import { useState } from "react";
import { useEffect } from "react";
import { useMemo } from "react";

import { useRef } from "react";

import useSWR from "swr";

import { today, parseDate } from "@internationalized/date";

import { CalendarDate } from "@internationalized/date";

import { Tabs, Tab } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Input } from "@heroui/react";
import { Switch } from "@heroui/react";
import {
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
import { LuStar } from "react-icons/lu";

import { Card, CardBody } from "@heroui/react";
import { CgSearch } from "react-icons/cg";

import Select, { components } from "react-select";
import type { CSSObjectWithLabel } from "react-select";
import { Modal } from "@app/components/atoms/AppModal";
import DeckSprites from "@app/components/molecules/DeckSprites";
import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { useRouter } from "next/navigation";
import { sendGAEvent } from "@next/third-parties/google";

import { useReopenFlagsOnBack } from "@app/hooks/useReopenFlagsOnBack";
import { DECK_MODAL_REOPEN_KEYS } from "@app/utils/deckModalReopen";

import ScrollingText from "@app/components/molecules/ScrollingText";
import StepLabel, { RequiredBadge } from "@app/components/molecules/StepLabel";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import OfficialEventGuideNote from "@app/components/molecules/OfficialEventGuideNote";

import { cleanOfficialEventTitle } from "@app/components/organisms/Record/officialEventHelpers";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";
import { markRecordCreatedForPushPrompt } from "@app/utils/pushPrompt";
import { JST_TIME_ZONE, formatJSTDateWithWeekday, formatJSTTime, toJSTDateString } from "@app/utils/date";
import {
  officialEventListUrl,
  toOfficialEventDateKey,
} from "@app/utils/officialEventList";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";
import { deckImageUrl } from "@app/utils/deckImage";
import { MAX_EVENT_TITLE_LENGTH, exceedsTextLength } from "@app/utils/textLength";
import { useOfficialEventGuide } from "@app/hooks/useOfficialEventGuide";
import { RecordCreateTab, parseRecordCreateTab } from "@app/utils/recordCreatePrefs";
import { writeRecordCreateSelectedTab } from "@app/utils/recordCreateSelectedTab";

import {
  RecordCreateOfficialEventType,
  OfficialEventResponseType,
} from "@app/types/official_event";
import { DEFAULT_REGULATION_ID } from "@app/types/regulation";
import { DeckGetAllType, DeckData, isFavoritedDeck } from "@app/types/deck";
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
  // お気に入りのデッキ。一覧の先頭に置き、★を添えて見分けられるようにする。
  is_favorited: boolean;
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

// 失敗レスポンスのボディをそのまま返すと、選択肢を組み立てるmapがレンダー中に例外になり
// ページ全体が落ちる。取得できなかったことはSWRのerrorとして扱い、
// 「エラーが発生しました」を選択肢の代わりに出す。
async function fetcherForOfficialEvent(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

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

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

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

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

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
  officialEvent: RecordCreateOfficialEventType,
): OfficialEventOption {
  // 時刻はJST固定で読む(端末のタイムゾーンで読むと海外の端末で開催時刻がずれる)。
  // formatJSTTime は書式を作り置きしているので、件数が多くても toLocaleString ほど遅くならない。
  let startedAt = formatJSTTime(officialEvent.started_at);
  let endedAt = formatJSTTime(officialEvent.ended_at);
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

  // toLocaleString は呼ぶたびに Intl.DateTimeFormat を作り直すため、1日ぶんの候補
  // (土日は1,400件超)を整形すると桁違いに遅い。作り置きの書式を使う共通ヘルパへ委譲する。
  const datetime = formatJSTDateWithWeekday(officialEvent.date) + " " + eventTime;

  // SWR のキャッシュに入っている元データを書き換えないよう、整形結果はローカルに持つ
  const title = cleanOfficialEventTitle(officialEvent.title);

  let image_alt = "";
  let image_src = "https://xx8nnpgt.user.webaccel.jp/images/icons/";
  if (officialEvent.type_id === 1) {
    if (title.includes("ポケモンジャパンチャンピオンシップス")) {
      image_alt = "ポケモンジャパンチャンピオンシップス";
      image_src += "jcs.png";
    } else if (title.includes("チャンピオンズリーグ")) {
      image_alt = "チャンピオンズリーグ";
      image_src += "cl.png";
    } else if (title.includes("スクランブルバトル")) {
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
    if (title.includes("ジムバトル")) {
      image_alt = "ジムバトル";
      image_src += "gym.png";
    } else if (title.includes("MEGAウインターリーグ")) {
      image_alt = "MEGAウインターリーグ";
      image_src += "mega_winter_league.png";
    } else if (title.includes("スタートデッキ100　そのままバトル")) {
      image_alt = "スタートデッキ100　そのままバトル";
      image_src += "100_sonomama_battle.png";
    } else if (title.includes("マイジムNo.1決定戦")) {
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
    if (title.includes("ポケモンカードゲーム教室")) {
      image_alt = "ポケモンカードゲーム教室";
      image_src += "classroom.png";
    } else if (title.includes("ビクティニBWR争奪戦")) {
      image_alt = "ビクティニBWR争奪戦";
      image_src += "victini_bwr.png";
    } else if (title.includes("メガエルレイドexSARゲットバトル")) {
      image_alt = "メガエルレイドexSARゲットバトル";
      image_src += "mega-gallade_ex_sar.png";
    } else if (title.includes("スタートデッキ100　そのままバトル")) {
      image_alt = "スタートデッキ100　そのままバトル";
      image_src += "100_sonomama_battle.png";
    } else if (
      title.includes("100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～")
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
      title +
      " - " +
      katakanaToHiragana(title) +
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
    title: title,
    shop_name: officialEvent.shop_name ? officialEvent.shop_name : officialEvent.venue,
    address: officialEvent.address,
    image_alt: image_alt,
    image_src: image_src,
  };
}

function convertToDeckOption(data: DeckData): DeckOption {
  const created_at = formatJSTDateWithWeekday(data.created_at);

  return {
    label: data.name + " - " + katakanaToHiragana(data.name),
    value: data.id,
    id: data.id,
    created_at: created_at,
    name: data.name,
    private_flg: data.private_flg,
    latest_deck_code: data.latest_deck_code,
    pokemon_sprites: data.pokemon_sprites ?? [],
    is_favorited: isFavoritedDeck(data),
  };
}

// versionNumber: 作成日時の昇順で数えた通し番号（1が初回）。
// 一覧取得前で不明な場合は null を渡すと、後続の補正処理で更新される。
function convertToDeckCodeOption(
  data: DeckCodeType,
  versionNumber: number | null,
): DeckCodeOption {
  const created_at = formatJSTDateWithWeekday(data.created_at);

  return {
    label: versionNumber !== null ? String(versionNumber) : "",
    value: data.id,
    id: data.id,
    deck_id: data.deck_id,
    created_at: created_at,
    code: data.code,
    private_code_flg: data.private_code_flg,
  };
}


/*
 * お気に入りのデッキに添える★。
 *
 * デッキ選択の一覧はサーバ側(GET /decks/all)がお気に入りを先頭に並べて返す。
 * 先頭にあるだけでは「たまたま最近作ったデッキ」と区別がつかないため、
 * ★を添えて意図した並びであることが分かるようにする。
 */
function FavoriteStar() {
  return (
    <LuStar
      aria-label="お気に入り"
      className="shrink-0 fill-current text-sm text-amber-500"
    />
  );
}

/*
 * レギュレーション(使用可能なカードの範囲)の選択。公式/Tonamel/自由形式の3タブで同じUIを使う。
 * セグメント本体は記録詳細・戦績分析と共通のコンポーネント。
 */
function RegulationOption({
  regulationId,
  setRegulationId,
}: {
  regulationId: number;
  setRegulationId: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <StepLabel num={4}>レギュレーション</StepLabel>

      <RegulationSegmentedControl
        regulationId={regulationId}
        onChange={setRegulationId}
      />
    </div>
  );
}

/*
 * 「この記録を戦績集計に含めない」トグル。公式/Tonamel/自由形式の3タブで同じUIを使う。
 *
 * ON のときに警告文を「追加」すると、その分ブロックが伸びて直下の「記録を作成」ボタンが
 * 押し下げられてしまう（押そうとした瞬間にボタンが逃げる）。かといって OFF のときに
 * 空の場所を確保しておくと、今度は無駄な余白が残る。
 *
 * そこで警告文は行を増やさず、説明文と同じ場所を差し替える形で見せる。どちらの文言も
 * <br /> で明示的に2行へ揃えてあるため、ON/OFF でブロックの高さは変わらず余白も生じない。
 * 文言を変えるときは2行に収まる長さを保つこと（min-h-8 は折り返しが減った場合の保険）。
 */
function IgnoreStatsOption({
  ignoreStatsFlg,
  setIgnoreStatsFlg,
}: {
  ignoreStatsFlg: boolean;
  setIgnoreStatsFlg: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <StepLabel num={5}>集計オプション</StepLabel>

      <div
        className={`flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 transition-colors ${
          ignoreStatsFlg
            ? "border-warning/40 bg-warning/10"
            : "border-divider bg-default-50"
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className={`text-sm font-bold transition-colors ${
              ignoreStatsFlg ? "text-warning" : ""
            }`}
          >
            この記録を戦績集計に含めない
          </span>

          <span
            className={`min-h-8 text-tiny transition-colors ${
              ignoreStatsFlg ? "font-bold text-warning" : "text-default-500"
            }`}
          >
            {ignoreStatsFlg ? (
              <>
                ⚠ この記録は分析・集計の対象外です。
                <br />
                勝率・デッキ使用率などに反映されません。
              </>
            ) : (
              <>
                勝率・デッキ使用率・週次レポートなどの集計から
                <br />
                除外されます。
              </>
            )}
          </span>
        </div>
        <Switch
          name="record-create-ignore-stats"
          size="sm"
          isSelected={ignoreStatsFlg}
          onValueChange={setIgnoreStatsFlg}
          aria-label="戦績集計から除外する"
        />
      </div>
    </div>
  );
}

type Props = {
  deck_id: string;
  deck_code_id: string;
  /*
   * 開くタブ。サーバ(records/create/page.tsx)が URL の指定と cookie から確定させる。
   * ここで確定しているので、クライアントはタブが決まるのを待たずに描ける。
   */
  tab: RecordCreateTab;
  // 公式イベントの指定(Myジムのイベント詳細などからの遷移)。開催日を選択し、
  // その日の候補が届いたらこのイベントを選択済みにする。
  official_event_id?: string;
  // 指定された開催日("YYYY-MM-DD")。
  event_date?: string;
  /*
   * サーバ側で先読みした公式イベントの候補と、その開催日("YYYY-MM-DD")。
   *
   * 開催日は SWR のキーを組み立てるのに使う。利用者が別の日を選んだら
   * キーが変わり、この初期データは使われなくなる(その日を取り直す)。
   * 先読みに失敗した場合や、公式イベントタブ以外で開いた場合は undefined。
   */
  initial_official_event_date?: string;
  // サーバで先読みした候補。使うフィールドだけに絞ってある(types/official_event 参照)
  initial_official_events?: RecordCreateOfficialEventType[];
  /*
   * サーバ側で先読みした「使用デッキ」の選択肢。ブラウザから取りに行くと
   * 欄が後から現れる(ポップイン)ため、初回描画に間に合わせる。
   * 先読みに失敗した場合は undefined(クライアント側の取得に委ねる)。
   */
  initial_decks?: DeckGetAllType;
};

/*
 * react-select のコントロール(選択バー)の高さ。
 *
 * 既定では emotion が px(38px)で入れる。ところが globals.css には
 * 「小型タブレット(幅 640〜767px)ではルートの文字サイズを 112.5% にして UI ごと拡大する」
 * 帯があり、rem で書かれた HeroUI の入力欄(h-10 = 2.5rem)は拡大されるのに、
 * ここだけ px のまま取り残されてタブ間・骨格との縦位置がずれる。
 * さらに検索アイコン付きのプレースホルダを持つ選択バーは、拡大時だけ中身に押されて
 * 38px を超える(実測 41px)ため、骨格が高さを決め打ちできない。
 *
 * 同じ 38px を rem で指定して、拡大帯でもフォーム全体が同じ比率で伸びるようにする。
 * 骨格側の SELECT_HEIGHT(RecordCreateFormSkeleton)と必ず同じ値にすること。
 */
const REACT_SELECT_CONTROL_HEIGHT = "2.375rem"; // ルート16px時に 38px

const reactSelectControlStyle = (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
  ...base,
  minHeight: REACT_SELECT_CONTROL_HEIGHT,
});

// URL で指定された開催日を CalendarDate にする。壊れた値や未指定は null
// (呼び出し側で今日にフォールバックする)。
function parsePresetDate(value?: string): CalendarDate | null {
  if (!value) return null;

  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

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
      /* eslint-disable-next-line react-hooks/immutability --
         ref コールバックの中での ref 代入は React の正規の書き方で、render 中の
         書き換えではない(React が DOM の生成・破棄時に呼ぶ)。ルールが JSX の中に
         書かれたクロージャを render の一部と見なして誤検知している。 */
      innerRef={(node: HTMLDivElement | null) => {
        nodeRef.current = node;
        // react-select 内部の innerRef も維持する
        if (typeof innerRef === "function") innerRef(node);
        // eslint-disable-next-line react-hooks/immutability -- 上と同じ理由(ref コールバック内の代入)
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
  tab,
  official_event_id,
  event_date,
  initial_official_event_date,
  initial_official_events,
  initial_decks,
}: Props) {
  const router = useRouter();

  // デッキモーダルの「記録する」から遷移してきた場合、バック遷移で戻ったときだけ
  // デッキモーダルを開き直せるよう、再開フラグをこのページで預かる。
  useReopenFlagsOnBack(DECK_MODAL_REOPEN_KEYS);

  // react-select をダークモードに追従させるテーマ
  const reactSelectTheme = useReactSelectTheme();

  // サーバが確定させたタブで描き始める(recordCreatePrefs 参照)。
  // 復元をクライアントでやっていた頃と違い、確定を待つ間の骨格表示は要らない
  const [selectedTab, setSelectedTab] = useState<RecordCreateTab>(tab);

  // URL で名指しされた遷移も含め、開いたタブを次回の既定として覚えておく
  useEffect(() => {
    writeRecordCreateSelectedTab(tab);
  }, [tab]);

  const handleTabSelectionChange = (key: React.Key) => {
    const next = parseRecordCreateTab(String(key));
    if (!next) return;

    writeRecordCreateSelectedTab(next);
    setSelectedTab(next);
  };

  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const [imageLoaded, setImageLoaded] = useState(false);
  // 記録を作成中(作成ボタンを押せなくする。失敗したら戻す)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDate, setSelectedDate] = useState<CalendarDate>(
    () => parsePresetDate(event_date) ?? today(JST_TIME_ZONE),
  );
  const [selectedOfficialEventOption, setSelectedOfficialEventOption] =
    useState<OfficialEventOption | null>(null);

  // URL で指定された公式イベント。候補が揃うまで選べないため、選択できるまで持ち越す。
  // 適用したら 0 に戻し、以後の再取得や利用者の選び直しを上書きしないようにする。
  const presetOfficialEventIdRef = useRef(Number(official_event_id) || 0);

  const [tonamelEventId, setTonamelEventId] = useState<string>("");
  /*
   * Tonamel API での確認結果。どのイベントIDの結果かも持ち、入力中のIDと一致するときだけ使う
   * (未入力・確認中は前回の結果を出さない)。valid が false なら存在しないID。
   *
   * 妥当かどうか(isValidatedTonamelEventId)は、未入力・確認中は「無効」ではないので true。
   * false にすると、サーバレンダリングされた HTML の時点で入力欄が赤くなり
   * 「無効なイベントIDです」の行(24px)が入り、ハイドレーション直後にその行が消えて
   * 下のブロックが跳ね上がる。
   */
  const [tonamelCheck, setTonamelCheck] = useState<{
    eventId: string;
    valid: boolean;
    title: string;
    image: string;
  } | null>(null);
  const currentTonamelCheck =
    tonamelEventId && tonamelCheck?.eventId === tonamelEventId ? tonamelCheck : null;
  const tonamelEventTitle = currentTonamelCheck?.title ?? "";
  const tonamelEventImage = currentTonamelCheck?.image ?? "";
  const isValidatedTonamelEventId = currentTonamelCheck ? currentTonamelCheck.valid : true;
  const [tonamelEventDate, setTonamelEventDate] = useState<CalendarDate>(
    today(JST_TIME_ZONE),
  );

  // 自由形式イベント用の状態。ユーザが任意に開催日とイベント名を入力する
  const [unofficialEventDate, setUnofficialEventDate] = useState<CalendarDate>(
    today(JST_TIME_ZONE),
  );
  const [unofficialEventTitle, setUnofficialEventTitle] = useState<string>("");

  // この記録を戦績集計(勝率・デッキ使用率・週次レポートなど)から除外するかどうか。
  // タブ(公式/Tonamel/自由形式)を切り替えても保持される共通の設定として扱う。
  const [ignoreStatsFlg, setIgnoreStatsFlg] = useState<boolean>(false);

  // レギュレーションも集計オプションと同じく、タブを切り替えても保持される共通の設定。
  const [regulationId, setRegulationId] = useState<number>(DEFAULT_REGULATION_ID);

  const [selectedDeckOption, setSelectedDeckOption] = useState<DeckOption | null>(null);
  const [selectedDeckCodeOption, setSelectedDeckCodeOption] =
    useState<DeckCodeOption | null>(null);
  const [imageLoadedForDeckCode, setImageLoadedForDeckCode] = useState(false);
  const [isDeckChangedByUser, setIsDeckChangedByUser] = useState(false);

  const deckSelectRef = useRef<HTMLDivElement | null>(null);

  // 先読み(page.tsx)と同じ規則でキーを組む。ずれると先読みが使われない
  const officialEventUrl = officialEventListUrl(toOfficialEventDateKey(selectedDate));

  /*
   * サーバ側で先読みした候補は、その開催日を見ている間だけ使う。
   * fallbackData はキーに紐づかないので、日付を変えた直後に前の日の候補を
   * 出してしまわないよう、キーが一致するときだけ渡す。
   *
   * revalidateIfStale を切るのは、初期データがあるのにマウント直後へ
   * 同じ内容の取得(土日は1,400件超)を重ねないため。公式イベントの一覧は
   * 上流でも5分キャッシュしている程度の更新頻度で、記録を作っている間に
   * 変わることはまず無い。
   */
  const officialEventFallback =
    initial_official_event_date &&
    officialEventUrl === officialEventListUrl(initial_official_event_date)
      ? initial_official_events
      : undefined;

  /*
   * 公式イベントタブを見ているときだけ取りに行く。
   *
   * 以前はタブに関わらず取っていたが、この一覧は土日で1,400件を超える
   * (gzip でも90KB台)。本番のログ7日ぶんでは、作られた記録194件のうち65件(34%)が
   * 自由形式で、その分がまるごと無駄になっていた。
   *
   * 一度取れば SWR のキャッシュに残るので、タブを行き来しても取り直さない。
   */
  const shouldFetchOfficialEvents = selectedTab === "official";

  const {
    data: officialEventData,
    error: officialEventError,
    isLoading: officialEventLoading,
  } = useSWR<RecordCreateOfficialEventType[], Error>(
    shouldFetchOfficialEvents ? officialEventUrl : null,
    fetcherForOfficialEvent,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      fallbackData: officialEventFallback,
    },
  );

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
    // 先読みぶんは初回描画に使い、裏で取り直す(公式イベントと違って1KB程度で、
    // 直前に作ったデッキが載っていないと選べないため)
    fallbackData: initial_decks,
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
    () =>
      (deckcodeData ?? []).map((dc, index, arr) =>
        convertToDeckCodeOption(dc, arr.length - index),
      ),
    [deckcodeData],
  );

  // deck_code_id から単体取得した直後は通し番号が不明(label: "")のため、
  // 一覧(deckcodeOptions)が揃っていれば正しいバージョン番号で描く
  const selectedDeckCodeOptionLabeled =
    selectedDeckCodeOption && selectedDeckCodeOption.label === ""
      ? (deckcodeOptions.find((o) => o.id === selectedDeckCodeOption.id) ?? selectedDeckCodeOption)
      : selectedDeckCodeOption;

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
    if (!tonamelEventId) return;

    let cancelled = false;
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
        if (cancelled) return;
        setTonamelCheck({ eventId: tonamelEventId, valid: true, title: data.title, image: data.image });
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setTonamelCheck({ eventId: tonamelEventId, valid: false, title: "", image: "" });
      }
    };

    checkTonamelEventId();
    return () => {
      cancelled = true;
    };
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

            // 通し番号(バージョン)を求めるため、同じデッキの全バージョンを取得する
            let versionNumber: number | null = null;
            try {
              const list = await fetcherForDeckCode(
                `/api/decks/${codeData.deck_id}/deckcodes`,
              );
              const index = list.findIndex((dc) => dc.id === codeData.id);
              if (index !== -1) versionNumber = list.length - index;
            } catch (error) {
              console.error(error);
            }

            setSelectedDeckCodeOption(convertToDeckCodeOption(codeData, versionNumber));
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

  // 公式イベントは候補を選んでいれば作成できる
  const isDisabledCreateOfficialEventRecord = !selectedOfficialEventOption || isSubmitting;

  // 指定された公式イベントを、その日の候補が届いたときに1度だけ選択する。
  // 候補に無い(日付違い・開催終了で消えた等)場合は何もしない。利用者が
  // 開催日を変えたときは指定を捨てる(DatePicker の onChange)。
  useEffect(() => {
    if (!presetOfficialEventIdRef.current) return;

    const preset = officialEventOptions.find(
      (option) => option.id === presetOfficialEventIdRef.current,
    );
    if (!preset) return;

    presetOfficialEventIdRef.current = 0;
    setSelectedOfficialEventOption(preset);
  }, [officialEventOptions]);

  // Tonamelは開催日(常に既定値あり)とイベントIDが必須。デッキは任意のため必須にしない
  const isDisabledCreateTonamelEventRecord =
    !(tonamelEventId && isValidatedTonamelEventId) || isSubmitting;

  // 上限を超えたままではAPIが400を返すため、作成させない
  const isUnofficialEventTitleTooLong = exceedsTextLength(
    unofficialEventTitle,
    MAX_EVENT_TITLE_LENGTH,
  );

  // イベント名に公式イベントのキーワード(ジムバトル等)が含まれ、かつ その開催日に
  // 該当する公式イベントが実在するときだけ、公式イベントに紐づけられることを伝えて誘導する。
  // 自由形式タブを開いている間だけ判定する(他タブでは入力欄自体が無く、取得も不要)。
  const unofficialEventYmd = `${unofficialEventDate.year}-${String(
    unofficialEventDate.month,
  ).padStart(2, "0")}-${String(unofficialEventDate.day).padStart(2, "0")}`;
  const unofficialTitleOfficialKeyword = useOfficialEventGuide(
    unofficialEventTitle,
    unofficialEventYmd,
    selectedTab === "unofficial",
  );

  // 誘導パネルから公式イベントタブへ切り替える。入力済みの開催日を公式タブへ
  // 引き継ぎ、その日の公式イベント候補をすぐ選べる状態にする
  const handleGuideToOfficialTab = () => {
    setSelectedDate(unofficialEventDate);
    setSelectedOfficialEventOption(null);
    handleTabSelectionChange("official");
    sendGAEvent("event", "official_event_guide_click", { source: "record_create" });
  };

  // 自由形式はイベント名が入力されていれば作成可能（デッキは任意）
  const isDisabledCreateUnofficialRecord =
    !(unofficialEventTitle.trim() !== "" && !isUnofficialEventTitleTooLong) || isSubmitting;

  /*
   * デッキが変更されたとき、SWR でデッキコードが取得され次第
   * 最初のバージョンをデフォルトとして設定する。
   * effect で設定すると前の選択での描画が一度挟まるので、一覧と操作の有無を控えておき
   * 変わったときに描画中に設定する
   */
  const [deckcodeSource, setDeckcodeSource] = useState({ deckcodeData, isDeckChangedByUser });
  if (
    deckcodeSource.deckcodeData !== deckcodeData ||
    deckcodeSource.isDeckChangedByUser !== isDeckChangedByUser
  ) {
    setDeckcodeSource({ deckcodeData, isDeckChangedByUser });

    // SWR がまだ取得中の場合は待つ（isDeckChangedByUser は true のまま）
    if (isDeckChangedByUser && deckcodeData !== undefined) {
      if (deckcodeData.length === 0) {
        setSelectedDeckCodeOption(null);
      } else {
        setSelectedDeckCodeOption(
          convertToDeckCodeOption(deckcodeData[0], deckcodeData.length),
        );
      }
      setImageLoadedForDeckCode(false);
      setIsDeckChangedByUser(false);
    }
  }

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
    setIsSubmitting(true);

    const toastId = addToast({
      title: "記録作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    // eventDate は JST オフセット付き(例: 2026-06-29T00:00:00+09:00)で渡される。
    // toISOString() を使うと UTC に変換され日付が一日前へずれるため、JSTの暦日へ直して組み立てる
    // (端末のタイムゾーンで読むと、UTCより西の端末で同じように前日へずれる)。
    const eventDateISO = `${toJSTDateString(eventDate)}T00:00:00Z`;

    const record: RecordCreateRequestType = {
      official_event_id: officialEventId,
      tonamel_event_id: "",
      friend_id: "",
      deck_id: deckId,
      deck_code_id: deckCodeId,
      private_flg: true,
      ignore_stats_flg: ignoreStatsFlg,
      regulation_id: regulationId,
      tcg_meister_url: "",
      memo: "",
      event_date: eventDateISO,
      unofficial_event_id: "",
      // タグは大会順位のように結果が出てから付けるものが多いため、
      // 作成時は空にして記録詳細から付けてもらう。
      tag_ids: [],
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

      // 記録作成のベースライン計測。導線(通常フォーム/クイック記録)を問わず
      // 「記録が作られた」ことを1つのイベントで追えるようにしておく。
      // 施策単位の quick_record_saved とは目的が違うので、両方送る。
      sendGAEvent("event", "record_created", {
        entry_point: "form",
        event_type:
          record.official_event_id !== 0
            ? "official"
            : record.tonamel_event_id !== ""
              ? "tonamel"
              : "unofficial",
        with_deck: record.deck_id !== "" || record.deck_code_id !== "",
      });

      triggerNotificationsRefresh();
      // 価値を体験した直後に通知の許諾を求める(遷移先で PushPermissionPrompt が出す)
      markRecordCreatedForPushPrompt();

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

      setIsSubmitting(false);

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
    setIsSubmitting(true);

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
      ignore_stats_flg: ignoreStatsFlg,
      regulation_id: regulationId,
      tcg_meister_url: "",
      memo: "",
      event_date: eventDateISO,
      unofficial_event_id: "",
      // タグは大会順位のように結果が出てから付けるものが多いため、
      // 作成時は空にして記録詳細から付けてもらう。
      tag_ids: [],
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

      // 記録作成のベースライン計測。導線(通常フォーム/クイック記録)を問わず
      // 「記録が作られた」ことを1つのイベントで追えるようにしておく。
      // 施策単位の quick_record_saved とは目的が違うので、両方送る。
      sendGAEvent("event", "record_created", {
        entry_point: "form",
        event_type:
          record.official_event_id !== 0
            ? "official"
            : record.tonamel_event_id !== ""
              ? "tonamel"
              : "unofficial",
        with_deck: record.deck_id !== "" || record.deck_code_id !== "",
      });

      triggerNotificationsRefresh();
      // 価値を体験した直後に通知の許諾を求める(遷移先で PushPermissionPrompt が出す)
      markRecordCreatedForPushPrompt();

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

      setIsSubmitting(false);

      onClose();
    }
  }

  /*
   *
   *
   * 自由形式イベント用の記録を作成する関数
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
    setIsSubmitting(true);

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
      // 1. 先に自由形式イベント(unofficial_events)を作成し、そのIDを取得する。
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
        ignore_stats_flg: ignoreStatsFlg,
        regulation_id: regulationId,
        tcg_meister_url: "",
        memo: "",
        event_date: eventDateISO,
        unofficial_event_id: unofficialEvent.id,
        // タグは大会順位のように結果が出てから付けるものが多いため、
        // 作成時は空にして記録詳細から付けてもらう。
        tag_ids: [],
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

      // 記録作成のベースライン計測。導線(通常フォーム/クイック記録)を問わず
      // 「記録が作られた」ことを1つのイベントで追えるようにしておく。
      // 施策単位の quick_record_saved とは目的が違うので、両方送る。
      sendGAEvent("event", "record_created", {
        entry_point: "form",
        event_type:
          record.official_event_id !== 0
            ? "official"
            : record.tonamel_event_id !== ""
              ? "tonamel"
              : "unofficial",
        with_deck: record.deck_id !== "" || record.deck_code_id !== "",
      });

      triggerNotificationsRefresh();
      // 価値を体験した直後に通知の許諾を求める(遷移先で PushPermissionPrompt が出す)
      markRecordCreatedForPushPrompt();

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

      setIsSubmitting(false);

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
          selectedKey={selectedTab}
          onSelectionChange={handleTabSelectionChange}
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
            <div className="pt-9 pb-1.5 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={1} required>
                  開催日
                </StepLabel>

                <DatePicker
                  name="record-create-official-event-date"
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={selectedDate}
                  value={selectedDate}
                  onChange={(value) => {
                    setSelectedDate(value == null ? today(JST_TIME_ZONE) : value);
                    setSelectedOfficialEventOption(null);
                    // 別の日を選んだ時点で、URL 指定のイベントは選び直しになる
                    presetOfficialEventIdRef.current = 0;
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={2} required>
                  イベント
                </StepLabel>

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
                  styles={{
                    control: reactSelectControlStyle,
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                    // 崩さないよう、明示的に横方向のはみ出しをクリップする
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

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={3}>デッキ</StepLabel>

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
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、既定値(140px)ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    // menuPosition="fixed" は開いた瞬間のビューポート座標でメニュー位置を
                    // 固定してしまう。handleDeckSelectOpen によるスクロール(iOSキーボード
                    // 表示時のスクロールを含む)がメニュー表示後に発生すると、fixedな座標は
                    // それに追従できずズレて表示されてしまう(iOS PWAで顕著)。ページのスクロール
                    // に追従する既定の位置指定(absolute)にすることでズレを防ぐ。
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    //menuShouldBlockScroll={true}
                    // スクロールへの追従は handleDeckSelectOpen 側で行うため、
                    // react-select 側の自動スクロールとの競合を避けるため無効化する
                    menuShouldScrollIntoView={false}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="pl-0.5 flex items-center gap-2 min-w-0">
                                <DeckSprites sprites={option.pokemon_sprites} size={28} />
                                <span className="truncate">{option.name}</span>
                                {option.is_favorited && <FavoriteStar />}
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1 overflow-hidden">
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
                                        ? deckImageUrl(option.latest_deck_code.code)
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
                                    className="w-full h-full object-cover"
                                    onLoad={() => setImageLoaded(true)}
                                  />
                                </div>
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="pl-1 flex items-center gap-2 text-sm min-w-0">
                          <DeckSprites sprites={option.pokemon_sprites} size={28} />
                          <span className="truncate">{option.name}</span>
                          {option.is_favorited && <FavoriteStar />}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="record-create-official-deck-version"
                  >
                    バージョン
                  </label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    inputId="record-create-official-deck-version"
                    theme={reactSelectTheme}
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、大きな値ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    value={selectedDeckCodeOptionLabeled}
                    onChange={(option) => {
                      setSelectedDeckCodeOption(option);
                      setImageLoadedForDeckCode(false);
                    }}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
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
                                <div className="relative w-full aspect-2/1 overflow-hidden">
                                  {!imageLoadedForDeckCode && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={option.code}
                                    src={deckImageUrl(option.code)}
                                    className="w-full h-full object-cover"
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
                <div className="relative w-full aspect-2/1 overflow-hidden">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? deckImageUrl(selectedDeckCodeOption.code)
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0 w-full h-full object-cover"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <RegulationOption
                regulationId={regulationId}
                setRegulationId={setRegulationId}
              />

              <IgnoreStatsOption
                ignoreStatsFlg={ignoreStatsFlg}
                setIgnoreStatsFlg={setIgnoreStatsFlg}
              />

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
            <div className="pt-9 pb-1.5 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={1} required>
                  開催日
                </StepLabel>

                <DatePicker
                  name="record-create-tonamel-event-date"
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={tonamelEventDate}
                  value={tonamelEventDate}
                  onChange={(value) => {
                    setTonamelEventDate(
                      value == null ? today(JST_TIME_ZONE) : value,
                    );
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={2} required>
                  イベントID
                </StepLabel>

                <Input
                  isRequired
                  type="text"
                  radius="none"
                  placeholder="例）YFUVY"
                  isInvalid={!isValidatedTonamelEventId}
                  errorMessage="無効なイベントIDです"
                  value={tonamelEventId}
                  onChange={(e) => setTonamelEventId(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                />
              </div>
              {/*
               * イベントのプレビュー。
               *
               * 「3 デッキ」以降がタブを切り替えても動かないよう、公式イベントの
               * 「2 の入力欄＋プレビュー」と高さの合計を揃えている。
               *
               *   公式イベント : 検索セレクト 38px ＋ プレビューカード 116px = 154px
               *   Tonamel     : イベントID欄 40px ＋ ここ           114px = 154px
               *                 (イベント名 24px + gap 6px + 画像 72px + pb-3 12px)
               *
               * 画像の枠を w-2/5 のような「画面幅に対する比」にすると高さが端末幅で変わり、
               * 揃うのが特定の幅のときだけになる。w-36(9rem = 144px)× aspect-video で
               * 81px に確定させ、余りの 3px を下余白(pb-0.75)で埋める。
               * どれも rem なので、ルートの文字サイズを上げる帯でも比率のまま拡大される。
               */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex justify-center w-4/5">
                  <span>『</span>
                  <span className="truncate">
                    {tonamelEventTitle ? tonamelEventTitle : "イベント名"}
                  </span>
                  <span>』</span>
                </div>
                <div className="w-36 pb-0.75">
                  <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                    {!isValidatedTonamelEventId && (
                      <Skeleton className="absolute inset-0" />
                    )}
                    <Image
                      removeWrapper
                      className="absolute inset-0 z-0 w-full h-full object-contain"
                      radius="none"
                      shadow="none"
                      alt={tonamelEventTitle ? tonamelEventTitle : "Tonamelイベント画像"}
                      src={
                        tonamelEventImage
                          ? tonamelEventImage
                          : "https://tonamel.com/nuxt/6421c0babd-048e71d12e-3c73406b87-f5f712130f/_nuxt/assets/images/figures/logo/cover.3df31ff29b40f8d4032c417f126b9713.jpg"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={3}>デッキ</StepLabel>

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
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、既定値(140px)ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    // menuPosition="fixed" は開いた瞬間のビューポート座標でメニュー位置を
                    // 固定してしまう。handleDeckSelectOpen によるスクロール(iOSキーボード
                    // 表示時のスクロールを含む)がメニュー表示後に発生すると、fixedな座標は
                    // それに追従できずズレて表示されてしまう(iOS PWAで顕著)。ページのスクロール
                    // に追従する既定の位置指定(absolute)にすることでズレを防ぐ。
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    //menuShouldBlockScroll={true}
                    // スクロールへの追従は handleDeckSelectOpen 側で行うため、
                    // react-select 側の自動スクロールとの競合を避けるため無効化する
                    menuShouldScrollIntoView={false}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="flex items-center gap-2 min-w-0">
                                <DeckSprites sprites={option.pokemon_sprites} size={28} />
                                <span className="truncate">{option.name}</span>
                                {option.is_favorited && <FavoriteStar />}
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1 overflow-hidden">
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
                                        ? deckImageUrl(option.latest_deck_code.code)
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
                                    className="w-full h-full object-cover"
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
                          <DeckSprites sprites={option.pokemon_sprites} size={28} />
                          <span className="truncate">{option.name}</span>
                          {option.is_favorited && <FavoriteStar />}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="record-create-tonamel-deck-version"
                  >
                    バージョン
                  </label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    inputId="record-create-tonamel-deck-version"
                    theme={reactSelectTheme}
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、大きな値ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    value={selectedDeckCodeOptionLabeled}
                    onChange={(option) => {
                      setSelectedDeckCodeOption(option);
                      setImageLoadedForDeckCode(false);
                    }}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
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
                                <div className="relative w-full aspect-2/1 overflow-hidden">
                                  {!imageLoadedForDeckCode && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={option.code}
                                    src={deckImageUrl(option.code)}
                                    className="w-full h-full object-cover"
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
                <div className="relative w-full aspect-2/1 overflow-hidden">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? deckImageUrl(selectedDeckCodeOption.code)
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0 w-full h-full object-cover"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <RegulationOption
                regulationId={regulationId}
                setRegulationId={setRegulationId}
              />

              <IgnoreStatsOption
                ignoreStatsFlg={ignoreStatsFlg}
                setIgnoreStatsFlg={setIgnoreStatsFlg}
              />

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
           * 自由形式
           *
           *
           */}

          <Tab key="unofficial" title="自由形式" isDisabled={false}>
            <div className="pt-9 pb-1.5 flex flex-col gap-2">
              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={1} required>
                  開催日
                </StepLabel>

                <DatePicker
                  name="record-create-unofficial-event-date"
                  aria-label="開催日"
                  radius="none"
                  size="sm"
                  firstDayOfWeek="sun"
                  defaultValue={unofficialEventDate}
                  value={unofficialEventDate}
                  onChange={(value) => {
                    setUnofficialEventDate(
                      value == null ? today(JST_TIME_ZONE) : value,
                    );
                  }}
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={2} required>
                  イベント名など
                </StepLabel>

                <Input
                  isRequired
                  type="text"
                  radius="none"
                  placeholder="例）〇〇自主大会"
                  value={unofficialEventTitle}
                  onChange={(e) => setUnofficialEventTitle(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                  isInvalid={isUnofficialEventTitleTooLong}
                  errorMessage={`イベント名は${MAX_EVENT_TITLE_LENGTH}文字以内で入力してください`}
                />

                {/* 親が gap-1 のため、通知だけは入力欄との間隔を明示的に空ける */}
                {unofficialTitleOfficialKeyword && (
                  <div className="pt-1">
                    <OfficialEventGuideNote
                      keyword={unofficialTitleOfficialKeyword}
                      onSelectOfficial={handleGuideToOfficialTab}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <StepLabel num={3}>デッキ</StepLabel>

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
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、既定値(140px)ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    // menuPosition="fixed" は開いた瞬間のビューポート座標でメニュー位置を
                    // 固定してしまう。handleDeckSelectOpen によるスクロール(iOSキーボード
                    // 表示時のスクロールを含む)がメニュー表示後に発生すると、fixedな座標は
                    // それに追従できずズレて表示されてしまう(iOS PWAで顕著)。ページのスクロール
                    // に追従する既定の位置指定(absolute)にすることでズレを防ぐ。
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    // スクロールへの追従は handleDeckSelectOpen 側で行うため、
                    // react-select 側の自動スクロールとの競合を避けるため無効化する
                    menuShouldScrollIntoView={false}
                    onMenuClose={() => {
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
                              <span className="truncate">
                                登録日：{option.created_at}
                              </span>

                              <div className="flex items-center gap-2 min-w-0">
                                <DeckSprites sprites={option.pokemon_sprites} size={28} />
                                <span className="truncate">{option.name}</span>
                                {option.is_favorited && <FavoriteStar />}
                              </div>

                              <span className="pt-1">
                                <div className="relative w-full aspect-2/1 overflow-hidden">
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
                                        ? deckImageUrl(option.latest_deck_code.code)
                                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                    }
                                    className="w-full h-full object-cover"
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
                          <DeckSprites sprites={option.pokemon_sprites} size={28} />
                          <span className="truncate">{option.name}</span>
                          {option.is_favorited && <FavoriteStar />}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="pb-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="record-create-unofficial-deck-version"
                  >
                    バージョン
                  </label>
                  {isDeckVersionRequired && <RequiredBadge />}
                </div>
                <div>
                  <Select
                    inputId="record-create-unofficial-deck-version"
                    theme={reactSelectTheme}
                    // menuPosition="fixed" 時、react-selectは menuPlacement="bottom" を
                    // 指定していても下方向のスペースが minMenuHeight 未満だと上に反転してしまう。
                    // 選択バーの下に必ず表示させるため、大きな値ではなく0にして反転を防ぐ。
                    minMenuHeight={0}
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
                    value={selectedDeckCodeOptionLabeled}
                    onChange={(option) => {
                      setSelectedDeckCodeOption(option);
                      setImageLoadedForDeckCode(false);
                    }}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    styles={{
                      control: reactSelectControlStyle,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
                      // 崩さないよう、明示的に横方向のはみ出しをクリップする
                      menu: (base) => ({
                        ...base,
                        maxWidth: "100%",
                        overflow: "hidden",
                      }),
                    }}
                    menuPlacement="bottom"
                    menuShouldScrollIntoView={true}
                    components={{ MenuList: MenuListScrollToSelected }}
                    formatOptionLabel={(option, { context }) => {
                      if (context === "menu") {
                        return (
                          <div className="text-sm truncate border-1 p-2">
                            <div className="grid min-w-0">
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
                                <div className="relative w-full aspect-2/1 overflow-hidden">
                                  {!imageLoadedForDeckCode && (
                                    <Skeleton className="absolute inset-0 rounded-lg" />
                                  )}
                                  <Image
                                    radius="none"
                                    shadow="none"
                                    alt={option.code}
                                    src={deckImageUrl(option.code)}
                                    className="w-full h-full object-cover"
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
                <div className="relative w-full aspect-2/1 overflow-hidden">
                  {!imageLoadedForDeckCode && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={selectedDeckCodeOption?.code || "デッキコードなし"}
                    src={
                      selectedDeckCodeOption?.code
                        ? deckImageUrl(selectedDeckCodeOption.code)
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className="z-0 w-full h-full object-cover"
                    onLoad={() => setImageLoadedForDeckCode(true)}
                    onError={() => {}}
                  />
                </div>
              </div>

              <RegulationOption
                regulationId={regulationId}
                setRegulationId={setRegulationId}
              />

              <IgnoreStatsOption
                ignoreStatsFlg={ignoreStatsFlg}
                setIgnoreStatsFlg={setIgnoreStatsFlg}
              />

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
