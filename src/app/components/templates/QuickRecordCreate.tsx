"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  NumberInput,
  DatePicker,
  Accordion,
  AccordionItem,
  Skeleton,
  Spinner,
  useDisclosure,
  addToast,
  closeToast,
} from "@heroui/react";
import { LuFilePen, LuSlidersHorizontal } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import HScrollRow from "@app/components/atoms/HScrollRow";
import KizunaDeckSprites from "@app/components/molecules/KizunaDeckSprites";
import ChoiceButtonGroup from "@app/components/molecules/ChoiceButtonGroup";
import PokemonSpriteSelectButton from "@app/components/molecules/PokemonSpriteSelectButton";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";
import OfficialEventSelect from "@app/components/organisms/Record/OfficialEventSelect";
import TonamelEventInput from "@app/components/organisms/Record/TonamelEventInput";
import EnvironmentReturnModal from "@app/components/organisms/Record/Modal/EnvironmentReturnModal";

import {
  UnofficialEventCreateRequestType,
  UnofficialEventCreateResponseType,
} from "@app/types/unofficial_event";
import { RecordCreateRequestType, RecordCreateResponseType } from "@app/types/record";
import { MatchCreateRequestType, MatchGetResponseType } from "@app/types/match";
import { MatchPokemonSpriteType, PokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckData } from "@app/types/deck";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import {
  MAX_EVENT_TITLE_LENGTH,
  MAX_OPPONENTS_DECK_INFO_LENGTH,
  exceedsTextLength,
} from "@app/utils/textLength";
import { fetchOpponentEnv, DeckEnvPosition } from "@app/utils/deckEnv";

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// ひらがなをカタカナに統一して比較できるようにする
const toKatakana = (str: string) =>
  str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

// CalendarDate を YYYY-MM-DD 文字列へ変換する(公式イベント検索やISO日付生成に使う)
const calendarDateToYmd = (d: CalendarDate) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

type DeckHistory = {
  deckInfo: string;
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
};

async function fetchMatches(url: string): Promise<MatchGetResponseType[]> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

// 使用デッキ(選択済み)の情報を取得する。スプライトを「使用デッキ」表示に出すために使う。
async function fetchDeck(url: string): Promise<DeckData | null> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

// 過去マッチの relに含まれる相手デッキ(テキスト＋スプライト)を、出現頻度順の候補へ畳み込む。
// CreateMatchModal と同じロジックを、簡素化フォーム用に切り出したもの。
function buildDeckHistories(
  matches: MatchGetResponseType[] | undefined,
  unique: boolean,
): DeckHistory[] {
  if (!matches) return [];
  const countMap = new Map<string, { history: DeckHistory; count: number }>();
  for (const match of matches) {
    if (match.default_victory_flg || match.default_defeat_flg) continue;
    if (!match.opponents_deck_info) continue;
    const s1Id = getSpriteBySlot(match.pokemon_sprites, 1)?.id;
    const s2Id = getSpriteBySlot(match.pokemon_sprites, 2)?.id;
    const key = `${match.opponents_deck_info}|${s1Id ?? ""}|${s2Id ?? ""}`;
    const entry = countMap.get(key);
    if (entry) {
      entry.count++;
    } else {
      countMap.set(key, {
        count: 1,
        history: {
          deckInfo: match.opponents_deck_info,
          sprite1: s1Id
            ? {
                id: s1Id,
                name: "",
                image_url: `${SPRITE_BASE_URL}/${s1Id.replace(/^0+(?!$)/, "")}.png`,
              }
            : null,
          sprite2: s2Id
            ? {
                id: s2Id,
                name: "",
                image_url: `${SPRITE_BASE_URL}/${s2Id.replace(/^0+(?!$)/, "")}.png`,
              }
            : null,
        },
      });
    }
  }
  const values = Array.from(countMap.values());
  // ユーザ履歴は頻度順、ダミー(全体)は登場順のまま重複排除する
  if (!unique) values.sort((a, b) => b.count - a.count);
  return values.slice(0, 50).map((v) => v.history);
}

type EventType = "unofficial" | "official" | "tonamel";

type Props = {
  // 施策A-2 クイックスタートから渡される、作成済みデッキ。無ければデッキ未指定で記録する。
  deckId?: string;
  deckCodeId?: string;
  deckName?: string;
  // 施策E-1: 記録直後の環境ベンチマーク・リターンの有効/無効(サーバのフラグをpropsで受ける)。
  envReturnEnabled?: boolean;
};

// 施策A-3: 記録作成と対戦入力を1画面に統合した簡素化フォーム。
// 必須は「相手デッキ・先攻/後攻・勝ち負け」の3項目。イベントは自由形式＋当日を既定とし、
// 「詳細」でイベント種別(自由形式/公式)・開催日・サイド数・メモを任意に編集できる。
// 保存は (公式)記録→対戦 / (自由形式)自由形式イベント→記録→対戦 の順にAPIを呼ぶ
// (既存の RecordCreate/CreateMatchModal と同じ流儀)。
export default function TemplateQuickRecordCreate({
  deckId = "",
  deckCodeId = "",
  deckName = "",
  envReturnEnabled = true,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  // 施策E-1: 記録直後の環境ベンチマーク・リターン(相手が先週ランキングに載っていれば開く)。
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnData, setReturnData] = useState<{
    recordId: string;
    opponentName: string;
    opponentSprites: MatchPokemonSpriteType[];
    position: DeckEnvPosition | null; // null = 先週の環境ランキング外
    victory: boolean;
  } | null>(null);
  // リターンから記録詳細ページへ遷移する間、全画面オーバーレイで操作をブロックする。
  const [isNavigating, setIsNavigating] = useState(false);

  // 必須3項目
  const [opponentsDeckInfo, setOpponentsDeckInfo] = useState("");
  const [goFirst, setGoFirst] = useState<boolean | null>(null);
  const [victory, setVictory] = useState<boolean | null>(null);

  // 相手デッキのスプライト(任意・最大2枠)
  const [pokemonSprite1, setPokemonSprite1] = useState<PokemonSpriteType | null>(null);
  const [pokemonSprite2, setPokemonSprite2] = useState<PokemonSpriteType | null>(null);
  const [activeSpriteSlot, setActiveSpriteSlot] = useState<1 | 2>(1);
  const {
    isOpen: isSpriteOpen,
    onOpen: onSpriteOpen,
    onOpenChange: onSpriteOpenChange,
  } = useDisclosure();

  // 詳細(任意)。開催日は記録作成ページと同じ DatePicker(CalendarDate)で全種別共通に扱う。
  const [eventType, setEventType] = useState<EventType>("unofficial");
  const [eventDate, setEventDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [eventTitle, setEventTitle] = useState("");
  const [officialEventId, setOfficialEventId] = useState<number | null>(null);
  const [tonamelEventId, setTonamelEventId] = useState("");
  const [tonamelValid, setTonamelValid] = useState(false);
  const [yourPrizeCards, setYourPrizeCards] = useState(0);
  const [opponentsPrizeCards, setOpponentsPrizeCards] = useState(0);
  const [memo, setMemo] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // --- 相手デッキの履歴候補 ---
  // 自分の過去マッチ(頻度順)。無ければ全体の直近マッチをダミー候補にする。
  const { data: recentMatches } = useSWR<MatchGetResponseType[]>(
    userId ? `/api/users/${userId}/matches?limit=100` : null,
    fetchMatches,
  );

  // 使用デッキ(A-2で選択済み)のスプライトを「使用デッキ」表示に出すため、デッキ情報を取得する。
  const { data: usedDeck, isLoading: isUsedDeckLoading } = useSWR<DeckData | null>(
    deckId ? `/api/decks/${deckId}` : null,
    fetchDeck,
  );
  const usedDeckSprites = usedDeck?.pokemon_sprites ?? [];
  const deckHistories = useMemo(
    () => buildDeckHistories(recentMatches, false),
    [recentMatches],
  );
  const { data: globalMatches } = useSWR<MatchGetResponseType[]>(
    recentMatches !== undefined && deckHistories.length === 0
      ? `/api/matches?limit=100`
      : null,
    fetchMatches,
  );
  const dummyHistories = useMemo(
    () => buildDeckHistories(globalMatches, true),
    [globalMatches],
  );
  const activeCandidates = deckHistories.length > 0 ? deckHistories : dummyHistories;
  const isCandidatesLoading =
    recentMatches === undefined ||
    (deckHistories.length === 0 && globalMatches === undefined);
  const filteredHistories = useMemo(() => {
    if (!opponentsDeckInfo.trim()) return activeCandidates;
    const query = toKatakana(opponentsDeckInfo.toLowerCase());
    return activeCandidates.filter((h) =>
      toKatakana(h.deckInfo.toLowerCase()).includes(query),
    );
  }, [opponentsDeckInfo, activeCandidates]);

  // 上限を超えたままではAPIが400を返すため、記録ボタンを押せないようにする
  const isOpponentsDeckInfoTooLong = exceedsTextLength(
    opponentsDeckInfo,
    MAX_OPPONENTS_DECK_INFO_LENGTH,
  );
  const isEventTitleTooLong = exceedsTextLength(eventTitle, MAX_EVENT_TITLE_LENGTH);

  const canSubmit =
    opponentsDeckInfo.trim() !== "" &&
    !isOpponentsDeckInfoTooLong &&
    !isEventTitleTooLong &&
    goFirst !== null &&
    victory !== null &&
    (eventType === "unofficial" ||
      (eventType === "official" && officialEventId !== null) ||
      (eventType === "tonamel" && tonamelEventId.trim() !== "" && tonamelValid)) &&
    !isSubmitting;

  function selectHistory(history: DeckHistory) {
    const isSelected =
      opponentsDeckInfo === history.deckInfo &&
      pokemonSprite1?.id === (history.sprite1?.id ?? undefined) &&
      pokemonSprite2?.id === (history.sprite2?.id ?? undefined);
    if (isSelected) {
      setOpponentsDeckInfo("");
      setPokemonSprite1(null);
      setPokemonSprite2(null);
    } else {
      setOpponentsDeckInfo(history.deckInfo);
      setPokemonSprite1(history.sprite1);
      setPokemonSprite2(history.sprite2);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || submittingRef.current) return;
    if (goFirst === null || victory === null) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    const toastId = addToast({
      title: "記録作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    // 開催日は全種別とも DatePicker(CalendarDate)由来。
    const eventDateISO = `${calendarDateToYmd(eventDate)}T00:00:00Z`;

    try {
      // 1. 記録を作成する。公式は official_event_id、Tonamelは tonamel_event_id、
      //    自由形式は先に自由形式イベントを作ってから紐づける。
      let recordReq: RecordCreateRequestType;
      if (eventType === "official" && officialEventId !== null) {
        recordReq = {
          official_event_id: officialEventId,
          tonamel_event_id: "",
          friend_id: "",
          deck_id: deckId,
          deck_code_id: deckCodeId,
          private_flg: true,
          ignore_stats_flg: false,
          tcg_meister_url: "",
          memo: "",
          event_date: eventDateISO,
          unofficial_event_id: "",
        };
      } else if (eventType === "tonamel") {
        recordReq = {
          official_event_id: 0,
          tonamel_event_id: tonamelEventId.trim(),
          friend_id: "",
          deck_id: deckId,
          deck_code_id: deckCodeId,
          private_flg: true,
          ignore_stats_flg: false,
          tcg_meister_url: "",
          memo: "",
          event_date: eventDateISO,
          unofficial_event_id: "",
        };
      } else {
        const unofficialEventReq: UnofficialEventCreateRequestType = {
          title: eventTitle.trim() || "対戦記録",
          date: eventDateISO,
        };
        const eventRes = await fetch("/api/unofficial_events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(unofficialEventReq),
        });
        if (!eventRes.ok) {
          const t = await eventRes.json();
          throw new Error(`HTTP error: ${eventRes.status} Message: ${t.message}`);
        }
        const unofficialEvent: UnofficialEventCreateResponseType = await eventRes.json();
        recordReq = {
          official_event_id: 0,
          tonamel_event_id: "",
          friend_id: "",
          deck_id: deckId,
          deck_code_id: deckCodeId,
          private_flg: true,
          ignore_stats_flg: false,
          tcg_meister_url: "",
          memo: "",
          event_date: eventDateISO,
          unofficial_event_id: unofficialEvent.id,
        };
      }

      const recordRes = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordReq),
      });
      if (!recordRes.ok) {
        const t = await recordRes.json();
        throw new Error(`HTTP error: ${recordRes.status} Message: ${t.message}`);
      }
      const record: RecordCreateResponseType = await recordRes.json();

      // 2. 記録に紐づく対戦を1件作成する(BO1)。
      //    サイド数などの隠し項目は既定値、勝敗・先後・相手デッキ・スプライトをユーザー入力から反映する。
      const pokemonSprites: MatchPokemonSpriteType[] = [];
      if (pokemonSprite1) pokemonSprites.push({ id: pokemonSprite1.id, position: 1 });
      if (pokemonSprite2) pokemonSprites.push({ id: pokemonSprite2.id, position: 2 });

      const matchReq: MatchCreateRequestType = {
        record_id: record.id,
        deck_id: record.deck_id,
        deck_code_id: record.deck_code_id,
        opponents_user_id: "",
        bo3_flg: false,
        group_match_flg: false,
        qualifying_round_flg: false,
        final_tournament_flg: false,
        default_victory_flg: false,
        default_defeat_flg: false,
        victory_flg: victory,
        group_match_victory_flg: false,
        opponents_deck_info: opponentsDeckInfo.trim(),
        memo: memo,
        games: [
          {
            go_first: goFirst,
            winnging_flg: victory,
            your_prize_cards: yourPrizeCards,
            opponents_prize_cards: opponentsPrizeCards,
            memo: "",
          },
        ],
        pokemon_sprites: pokemonSprites,
      };
      const matchRes = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchReq),
      });
      if (!matchRes.ok) {
        const t = await matchRes.json();
        throw new Error(`HTTP error: ${matchRes.status} Message: ${t.message}`);
      }

      if (toastId) closeToast(toastId);

      sendGAEvent("event", "quick_record_saved", {
        with_deck: deckId !== "",
        event_type: eventType,
      });
      triggerNotificationsRefresh();

      // 施策E-1: 相手が先週ランキングに載っていれば、記録直後に環境ベンチマークを返す。
      // 載っていない/スプライト無し/無効時は従来どおり成功トースト＋記録詳細へ即遷移する。
      const opponentSpriteIds = pokemonSprites.map((s) => s.id);
      const env = envReturnEnabled ? await fetchOpponentEnv(opponentSpriteIds) : null;

      // 保存も環境判定も完了。全画面ローディングオーバーレイ(z-9999)をここで畳んでから
      // 分岐する。畳む前にリターンのシートを開くと、オーバーレイがシートに被ってしまうため
      // (finally での解除では「シートを開く」より後になり一瞬かぶる)。
      submittingRef.current = false;
      setIsSubmitting(false);

      // 相手にスプライトがあり、先週の対戦環境データがあれば、ランキング外(position=null)でもリターンを出す。
      if (env && env.hasEnvData) {
        // リターンのシート自身が「記録できました」を伝えるため、成功トーストは出さない。
        setReturnData({
          recordId: record.id,
          opponentName: opponentsDeckInfo.trim(),
          opponentSprites: pokemonSprites,
          position: env.position, // null = 先週の環境ランキング外
          victory,
        });
        setReturnOpen(true);
        sendGAEvent("event", "env_return_impression", {
          rank: env.position?.rank ?? -1,
          ranked: env.position != null,
          victory,
        });
      } else {
        // モーダルを出さずに記録詳細ページへ遷移する場合も、遷移中はオーバーレイで操作をブロックする。
        // (前段で isSubmitting=false にしているが、同一レンダーで isNavigating=true になるため
        //  (isSubmitting || isNavigating) のオーバーレイは途切れない)
        addToast({
          title: "記録作成完了",
          description: "最初の1件を記録しました",
          color: "success",
          timeout: 3000,
        });
        setIsNavigating(true);
        router.push("/records/" + record.id);
      }
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) closeToast(toastId);
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

      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // リターンから「記録を見る」→ 詳細ページへ。
  function handleReturnViewRecord() {
    if (returnData) {
      sendGAEvent("event", "env_return_cta_click", {
        action: "view_record",
        rank: returnData.position?.rank ?? -1,
      });
      const id = returnData.recordId;
      setReturnOpen(false);
      setIsNavigating(true);
      router.push("/records/" + id);
    }
  }

  // リターンから「続けて対戦結果を追加する」→ 記録詳細ページへ遷移する(「記録を見る」と同じ着地点)。
  // 詳細ページで、この記録に対戦結果(対戦)を追加していける。
  function handleReturnRecordAgain() {
    if (returnData) {
      sendGAEvent("event", "env_return_cta_click", {
        action: "add_match",
        rank: returnData.position?.rank ?? -1,
      });
      const id = returnData.recordId;
      setReturnOpen(false);
      setIsNavigating(true);
      router.push("/records/" + id);
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-3 py-3">
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold">1戦目を記録しよう</h1>
            <p className="text-sm text-default-500">
              相手のデッキ名・先攻/後攻・勝敗だけで
              <br />
              作成できます。
            </p>
          </div>

          {/* 使用デッキ(A-2クイックスタート連携時のみ表示) */}
          {deckId && (
            <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-3 py-2.5">
              {/* 記録情報モーダルの使用デッキ(KizunaDeckSprites・size48・2枠gap-0)に合わせる。
                  ロード中は同寸(48px×2)のスケルトン、ロード後はスプライト
                  (未設定スロットは unknown.png)を表示する。 */}
              {isUsedDeckLoading ? (
                <div className="flex items-center gap-0 shrink-0">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="w-12 h-12 rounded-lg" />
                </div>
              ) : (
                <KizunaDeckSprites sprites={usedDeckSprites} size={48} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {deckName || "選択済みのデッキ"}
                </p>
                <p className="text-xs text-success-600 font-bold">使用デッキ・選択済み</p>
              </div>
            </div>
          )}

          {/* ① 相手のデッキ(必須) スプライト2枠 + 自由入力 + 履歴候補 */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-default-700">
              相手のデッキ<span className="text-danger ml-0.5">*</span>
            </span>
            {/* アイコン枠がタップできることに気づかれにくいため、常に案内を出す */}
            <span className="text-tiny text-default-400 -mt-1">
              アイコン枠をタップするとポケモンを選べます（任意）
            </span>
            <div className="flex items-center gap-1.5 w-full">
              <PokemonSpriteSelectButton
                sprite1={pokemonSprite1}
                sprite2={pokemonSprite2}
                onOpen={(slot) => {
                  setActiveSpriteSlot(slot);
                  onSpriteOpen();
                }}
              />
              <Input
                type="text"
                aria-label="相手のデッキ"
                placeholder={"例）" + (activeCandidates[0]?.deckInfo ?? "相手のデッキ名")}
                value={opponentsDeckInfo}
                onChange={(e) => setOpponentsDeckInfo(e.target.value)}
                isInvalid={isOpponentsDeckInfoTooLong}
                errorMessage={`${MAX_OPPONENTS_DECK_INFO_LENGTH}文字以内で入力してください`}
                // iOS はフォント16px未満の入力にフォーカスすると画面が拡大するため、
                // 入力文字を16px(text-base)にしてズームを防ぐ(既存の対処と同じ流儀)。
                classNames={{ input: "text-base" }}
              />
            </div>

            {/* 履歴候補（入力でフィルタ） */}
            {isCandidatesLoading ? (
              <HScrollRow className="flex gap-2 py-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-24 rounded-xl border-2 border-default-200 bg-default-50 py-2 px-2 flex flex-col items-center gap-1"
                  >
                    <Skeleton className="w-full h-9 rounded-lg" />
                    <Skeleton className="w-full h-3 rounded-md" />
                  </div>
                ))}
              </HScrollRow>
            ) : activeCandidates.length > 0 ? (
              <HScrollRow className="flex gap-2 py-1">
                {filteredHistories.length > 0 ? (
                  filteredHistories.map((history, index) => {
                    const isSelected =
                      opponentsDeckInfo === history.deckInfo &&
                      pokemonSprite1?.id === (history.sprite1?.id ?? undefined) &&
                      pokemonSprite2?.id === (history.sprite2?.id ?? undefined);
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`shrink-0 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border-2 w-24 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-default-200 bg-default-50 active:bg-default-100"
                        }`}
                        onClick={() => selectHistory(history)}
                      >
                        <div className="flex items-end justify-center w-full h-9">
                          <PokemonSprite id={history.sprite1?.id} size={36} />
                          <PokemonSprite id={history.sprite2?.id} size={36} />
                        </div>
                        <span className="block w-full text-[10px] leading-snug text-center truncate">
                          {history.deckInfo}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="shrink-0 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border-2 w-24 border-default-200 bg-default-50 opacity-40">
                    <div className="flex items-end justify-center w-full h-9">
                      <PokemonSprite size={36} />
                    </div>
                    <span className="text-[10px] leading-snug w-full text-center">
                      候補なし
                    </span>
                  </div>
                )}
              </HScrollRow>
            ) : null}
          </div>

          {/* ② 先攻 / 後攻(必須) */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-default-700">
              先攻 / 後攻<span className="text-danger ml-0.5">*</span>
            </span>
            <ChoiceButtonGroup
              value={goFirst}
              onChange={setGoFirst}
              options={[
                { value: true, label: "先攻", color: "secondary" },
                { value: false, label: "後攻", color: "secondary" },
              ]}
            />
          </div>

          {/* ③ 勝ち / 負け(必須) */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-default-700">
              勝ち / 負け<span className="text-danger ml-0.5">*</span>
            </span>
            <ChoiceButtonGroup
              value={victory}
              onChange={setVictory}
              options={[
                { value: true, label: "勝ち", color: "success" },
                { value: false, label: "負け", color: "danger" },
              ]}
            />
          </div>

          {/* 詳細(任意)。アコーディオンだと分かるよう splitted のカード＋開閉インジケータで表示 */}
          <Accordion variant="splitted" className="px-0">
            <AccordionItem
              key="detail"
              aria-label="詳細を追加"
              startContent={<LuSlidersHorizontal className="w-5 h-5 text-primary" />}
              title={<span className="text-sm font-bold">詳細を追加</span>}
              subtitle={
                <span className="text-xs text-default-400">
                  イベント種別・サイド数・メモ（任意）
                </span>
              }
              classNames={{
                base: "shadow-sm border border-default-200",
                trigger: "py-3",
              }}
            >
              <div className="flex flex-col gap-4 pb-2">
                {/* イベント種別 */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-default-700">
                    イベント種別
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      fullWidth
                      size="sm"
                      radius="lg"
                      color={eventType === "official" ? "primary" : "default"}
                      variant={eventType === "official" ? "solid" : "bordered"}
                      className="font-bold"
                      onPress={() => setEventType("official")}
                    >
                      公式イベント
                    </Button>
                    <Button
                      fullWidth
                      size="sm"
                      radius="lg"
                      color={eventType === "tonamel" ? "primary" : "default"}
                      variant={eventType === "tonamel" ? "solid" : "bordered"}
                      className="font-bold"
                      onPress={() => setEventType("tonamel")}
                    >
                      Tonamel
                    </Button>
                    <Button
                      fullWidth
                      size="sm"
                      radius="lg"
                      color={eventType === "unofficial" ? "primary" : "default"}
                      variant={eventType === "unofficial" ? "solid" : "bordered"}
                      className="font-bold"
                      onPress={() => setEventType("unofficial")}
                    >
                      自由形式
                    </Button>
                  </div>
                </div>

                {eventType === "tonamel" ? (
                  // Tonamelは記録作成ページと同等の入力(開催日DatePicker＋ID検証＋プレビュー)
                  <TonamelEventInput
                    date={eventDate}
                    onDateChange={setEventDate}
                    eventId={tonamelEventId}
                    onEventIdChange={setTonamelEventId}
                    onValidityChange={setTonamelValid}
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-default-700">
                        開催日<span className="text-danger ml-0.5">*</span>
                      </span>
                      {/* 記録作成ページと同じ DatePicker */}
                      <DatePicker
                        isRequired
                        aria-label="開催日"
                        radius="none"
                        size="sm"
                        firstDayOfWeek="sun"
                        value={eventDate}
                        onChange={(value) => {
                          setEventDate(value == null ? today(getLocalTimeZone()) : value);
                          // 開催日が変わると公式イベント候補も変わるため、選択をリセットする
                          setOfficialEventId(null);
                        }}
                      />
                    </div>

                    {eventType === "official" ? (
                      // 公式イベント選択は記録作成ページと同等(WindowedSelect＋アイコン＋プレビュー)
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-default-700">
                          イベント<span className="text-danger ml-0.5">*</span>
                        </span>
                        <OfficialEventSelect
                          date={calendarDateToYmd(eventDate)}
                          selectedId={officialEventId}
                          onChange={setOfficialEventId}
                        />
                      </div>
                    ) : (
                      <Input
                        type="text"
                        label="イベント名"
                        labelPlacement="outside"
                        placeholder="例）ジムバトル（未入力なら「対戦記録」）"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        isInvalid={isEventTitleTooLong}
                        errorMessage={`イベント名は${MAX_EVENT_TITLE_LENGTH}文字以内で入力してください`}
                        // iOSズーム対策(入力を16pxに)
                        classNames={{ input: "text-base" }}
                      />
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <NumberInput
                    label="サイド(自分)"
                    labelPlacement="outside"
                    minValue={0}
                    maxValue={6}
                    value={yourPrizeCards}
                    onValueChange={(v) => setYourPrizeCards(Number.isNaN(v) ? 0 : v)}
                    // iOSズーム対策(入力を16pxに)
                    classNames={{ input: "text-base" }}
                  />
                  <NumberInput
                    label="サイド(相手)"
                    labelPlacement="outside"
                    minValue={0}
                    maxValue={6}
                    value={opponentsPrizeCards}
                    onValueChange={(v) => setOpponentsPrizeCards(Number.isNaN(v) ? 0 : v)}
                    // iOSズーム対策(入力を16pxに)
                    classNames={{ input: "text-base" }}
                  />
                </div>
                <Textarea
                  label="対戦メモ"
                  labelPlacement="outside"
                  placeholder="対戦のメモを残そう"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  // iOSズーム対策(入力を16pxに)
                  classNames={{ input: "text-base" }}
                />
              </div>
            </AccordionItem>
          </Accordion>

          <Button
            color="primary"
            size="lg"
            radius="full"
            startContent={<LuFilePen className="w-4 h-4" />}
            className="font-bold shadow-md"
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            onPress={handleSubmit}
          >
            この1戦を記録する
          </Button>
          {eventType === "official" && officialEventId === null && (
            <p className="text-xs text-warning text-center">
              対象の公式イベントを選択してください
            </p>
          )}
          {eventType === "tonamel" && (tonamelEventId.trim() === "" || !tonamelValid) && (
            <p className="text-xs text-warning text-center">
              有効なTonamelイベントIDを入力してください
            </p>
          )}
          <p className="text-xs text-default-400 text-center">
            サイド数などはあとから記録の詳細ページで変更できます
          </p>
        </CardBody>
      </Card>

      {/*
        保存中、およびリターンから記録詳細ページへ遷移する間は、全画面オーバーレイで
        操作をブロックする(保存は完了/失敗まで、遷移はページ離脱=アンマウントまで解除しない)。
        fixed inset-0 が画面全体のポインタ操作を受け止めるため、下の入力に触れられなくなる。
      */}
      {(isSubmitting || isNavigating) &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ zIndex: 9999 }}
            className="fixed inset-0 flex items-center justify-center bg-background/70"
          >
            <Spinner size="lg" />
          </div>,
          document.body,
        )}

      <PokemonSpriteModal
        pokemonSprite1={pokemonSprite1}
        setPokemonSprite1={setPokemonSprite1}
        pokemonSprite2={pokemonSprite2}
        setPokemonSprite2={setPokemonSprite2}
        isOpen={isSpriteOpen}
        onOpenChange={onSpriteOpenChange}
        initialActiveSlot={activeSpriteSlot}
      />

      {/* 施策E-1: 記録直後の環境ベンチマーク・リターン(相手がランキングに載っていれば開く) */}
      {returnData && (
        <EnvironmentReturnModal
          isOpen={returnOpen}
          savedLabel="記録できました"
          opponentName={returnData.opponentName}
          opponentSprites={returnData.opponentSprites}
          position={returnData.position}
          victory={returnData.victory}
          primaryCta={{ label: "記録を見る", onPress: handleReturnViewRecord }}
          secondaryCta={{
            label: "続けて対戦結果を追加する",
            onPress: handleReturnRecordAgain,
          }}
        />
      )}
    </div>
  );
}
