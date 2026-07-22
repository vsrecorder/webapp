"use client";

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { SetStateAction, Dispatch } from "react";

import useSWR from "swr";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Button } from "@heroui/react";
import { Switch } from "@heroui/react";
import { Input } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { Tabs, Tab } from "@heroui/react";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { Textarea } from "@heroui/react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import HScrollRow from "@app/components/atoms/HScrollRow";
import ChoiceButtonGroup from "@app/components/molecules/ChoiceButtonGroup";
import PokemonSpriteSelectButton from "@app/components/molecules/PokemonSpriteSelectButton";
import PrizeCardsStepper from "@app/components/molecules/PrizeCardsStepper";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";
import BO3GamesInput from "@app/components/organisms/Match/BO3GamesInput";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";
import { MatchCreateRequestType, MatchCreateResponseType } from "@app/types/match";
import { GameRequestType } from "@app/types/game";
import { PokemonSpriteType, MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import {
  scrollIntoViewAfterKeyboard,
  scrollToTopAfterKeyboard,
} from "@app/utils/keyboard";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { isIOS } from "@app/utils/platform";
import { closingPassthroughClassNames } from "@app/utils/modal";
import {
  MAX_OPPONENTS_DECK_INFO_LENGTH,
  exceedsTextLength,
} from "@app/utils/textLength";
import {
  GameInput,
  newGameInputs,
  submittedGames,
  bo3VictoryFlg,
  isBO3GamesFilled,
} from "@app/utils/bo3";

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// ひらがなをカタカナに統一して比較できるようにする
const toKatakana = (str: string) =>
  str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

function CardDeckName({ text }: { text: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  // テキスト変更時はマーキー状態をリセット
  useLayoutEffect(() => {
    setShouldMarquee(false);
  }, [text]);

  // 非マーキー時にオーバーフローを検出（レンダー後に毎回確認）
  useLayoutEffect(() => {
    if (shouldMarquee) return;
    const el = spanRef.current;
    if (el) {
      setShouldMarquee(el.scrollWidth > el.clientWidth);
    }
  }, [shouldMarquee]);

  return (
    <div className="w-full overflow-hidden flex items-center">
      {shouldMarquee ? (
        <span className="text-[10px] leading-snug whitespace-nowrap inline-block animate-marquee-card">
          {text}&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;
        </span>
      ) : (
        <span
          ref={spanRef}
          className="text-[10px] leading-snug whitespace-nowrap flex-1 min-w-0 text-center"
        >
          {text}
        </span>
      )}
    </div>
  );
}

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

type Props = {
  record: RecordGetByIdResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function CreateMatchModal({
  record,
  setMatches,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  // 選択中のタブ（"bo1" / "bo3" / "team"）。
  // "bo3" はBO3(2本先取)、"team" はチーム戦として登録する（BO3とチーム戦は排他）
  const [selectedTab, setSelectedTab] = useState("bo1");

  // BO3の各ゲームの入力値（最大3ゲーム）
  const [bo3Games, setBo3Games] = useState<GameInput[]>(newGameInputs());

  // BO3の指定インデックスのゲームを部分更新する
  const updateBO3Game = (index: number, patch: Partial<GameInput>) => {
    setBo3Games((prev) =>
      prev.map((game, i) => (i === index ? { ...game, ...patch } : game)),
    );
  };

  const [qualifyingRoundFlg, setQualifyingRoundFlg] = useState(false);
  const [finalTournamentFlg, setFinalTournamentFlg] = useState(false);
  const [isValidedFlg, setIsValidedFlg] = useState(true);

  const [opponentsDeckInfo, setOpponentsDeckInfo] = useState<string>("");

  // 上限を超えたままではAPIが400を返すため、作成ボタンを押せないようにする
  const isOpponentsDeckInfoTooLong = exceedsTextLength(
    opponentsDeckInfo,
    MAX_OPPONENTS_DECK_INFO_LENGTH,
  );

  const [isGoFirst, setIsGoFirst] = useState("-1");
  const [isVictory, setIsVictory] = useState("-1");
  // チーム戦におけるチームの勝敗（group_match_victory_flg）
  const [isGroupMatchVictory, setIsGroupMatchVictory] = useState("-1");

  const [isDefaultVictory, setIsDefaultVictory] = useState(false);
  const [isDefaultDefeat, setIsDefaultDefeat] = useState(false);

  const [yourPrizeCards, setYourPrizeCards] = useState(0);
  const [opponentsPrizeCards, setOpponentsPrizeCards] = useState(0);

  const [memo, setMemo] = useState("");

  const [isDisabled, setIsDisabled] = useState(false);
  const [couldCreateFlg, setCouldCreateFlg] = useState(false);

  // 登録APIの実行中かどうか。実行中は登録ボタンを無効化し、Esc・ドラッグでも閉じられないようにする。
  // isDisabled は「不戦勝/不戦敗の選択中(相手情報の入力欄を無効化)」の意味であり、実行中フラグではない。
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 連打対策の最終防衛線。state の再レンダーを待たずに同期的に多重実行を弾く
  const submittingRef = useRef(false);

  // フッター下部の余白をOS別に切り替えるための判定。
  // navigator参照のためSSRとのハイドレーション不整合を避け、マウント後に確定させる。
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  const [pokemonSprite1, setPokemonSprite1] = useState<PokemonSpriteType | null>(null);
  const [pokemonSprite2, setPokemonSprite2] = useState<PokemonSpriteType | null>(null);

  // モーダルが開いているときだけ直近マッチを取得（limit=100 で十分な候補数を確保）
  const { data: recentMatches } = useSWR<MatchGetResponseType[]>(
    isOpen && record ? `/api/users/${record.user_id}/matches?limit=100` : null,
    fetchMatches,
  );

  // 出現回数の多い順に並んだデッキ履歴（上位30件、不戦勝/不戦敗を除外）
  const deckHistories = useMemo<DeckHistory[]>(() => {
    if (!recentMatches) return [];
    const countMap = new Map<string, { history: DeckHistory; count: number }>();
    for (const match of recentMatches) {
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
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map((item) => item.history);
  }, [recentMatches]);

  // ユーザ履歴がない場合のみ全体の直近100件を取得してダミー候補を作成
  const { data: globalMatches } = useSWR<MatchGetResponseType[]>(
    isOpen && recentMatches !== undefined && deckHistories.length === 0
      ? `/api/matches?limit=100`
      : null,
    fetchMatches,
  );

  const dummyHistories = useMemo<DeckHistory[]>(() => {
    if (!globalMatches) return [];
    const seen = new Set<string>();
    const result: DeckHistory[] = [];
    for (const match of globalMatches) {
      if (match.default_victory_flg || match.default_defeat_flg) continue;
      if (!match.opponents_deck_info) continue;
      const s1Id = getSpriteBySlot(match.pokemon_sprites, 1)?.id;
      const s2Id = getSpriteBySlot(match.pokemon_sprites, 2)?.id;
      const key = `${match.opponents_deck_info}|${s1Id ?? ""}|${s2Id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
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
      });
    }
    return result;
  }, [globalMatches]);

  // 表示に使う候補（ユーザ履歴優先、なければダミー）
  const activeCandidates = deckHistories.length > 0 ? deckHistories : dummyHistories;

  // ユーザ履歴ロード中、またはダミー候補フェッチ中
  const isCandidatesLoading =
    recentMatches === undefined ||
    (deckHistories.length === 0 && globalMatches === undefined);

  // 入力テキストにマッチする候補（空入力は全件）
  const filteredHistories = useMemo(() => {
    if (!opponentsDeckInfo.trim()) return activeCandidates;
    const query = toKatakana(opponentsDeckInfo.toLowerCase());
    return activeCandidates.filter((h) =>
      toKatakana(h.deckInfo.toLowerCase()).includes(query),
    );
  }, [opponentsDeckInfo, activeCandidates]);

  const [activePokemonSpriteSlot, setActivePokemonSpriteSlot] = useState<1 | 2>(1);

  const {
    isOpen: isOpenForPokemonSpriteModal,
    onOpen: onOpenForPokemonSpriteModal,
    onOpenChange: onOpenChangeForPokemonSpriteModal,
  } = useDisclosure();

  const resetForm = () => {
    setSelectedTab("bo1");

    setQualifyingRoundFlg(false);
    setFinalTournamentFlg(false);

    setOpponentsDeckInfo("");

    setIsGoFirst("-1");
    setIsVictory("-1");
    setIsGroupMatchVictory("-1");

    setBo3Games(newGameInputs());

    setIsDefaultVictory(false);
    setIsDefaultDefeat(false);

    setYourPrizeCards(0);
    setOpponentsPrizeCards(0);

    setMemo("");

    setPokemonSprite1(null);
    setPokemonSprite2(null);

    setIsDisabled(false);
    setCouldCreateFlg(false);
  };

  const attachHeader = useModalDragToClose(
    () => {
      resetForm();
      onClose();
    },
    // 登録APIの実行中にドラッグで閉じられると、結果(成功/失敗トースト)を確認できないまま
    // フォームが消えてしまうため、実行中はドラッグを受け付けない
    { disabled: isSubmitting },
  );


  useEffect(() => {
    if (qualifyingRoundFlg && finalTournamentFlg) {
      setIsValidedFlg(false);
    } else {
      setIsValidedFlg(true);
    }
  }, [qualifyingRoundFlg, finalTournamentFlg]);

  useEffect(() => {
    // 不戦勝/不戦敗の場合は相手のデッキも勝敗も入力しないため、常に登録可能
    if (isDefaultVictory || isDefaultDefeat) {
      setCouldCreateFlg(true);
      return;
    }

    if (opponentsDeckInfo === "") {
      setCouldCreateFlg(false);
      return;
    }

    // BO3タブは各ゲームの先攻/後攻と勝敗がすべて入力されている必要がある
    if (selectedTab === "bo3") {
      setCouldCreateFlg(isBO3GamesFilled(bo3Games));
      return;
    }

    if (isGoFirst === "-1" || isVictory === "-1") {
      setCouldCreateFlg(false);
      // チーム戦タブの場合はチームの勝敗（group_match_victory_flg）も必須
    } else if (selectedTab === "team" && isGroupMatchVictory === "-1") {
      setCouldCreateFlg(false);
    } else {
      setCouldCreateFlg(true);
    }
  }, [
    opponentsDeckInfo,
    isGoFirst,
    isVictory,
    isGroupMatchVictory,
    selectedTab,
    bo3Games,
    isDefaultVictory,
    isDefaultDefeat,
  ]);

  useEffect(() => {
    // 不戦勝/不戦敗が選択された場合
    if (isDefaultVictory || isDefaultDefeat) {
      setIsDisabled(true);

      setOpponentsDeckInfo("");

      setIsGoFirst("-1");

      setYourPrizeCards(0);
      setOpponentsPrizeCards(0);

      // 不戦勝/不戦敗は対戦が行われていないためゲームを登録しない
      setBo3Games(newGameInputs());

      if (isDefaultVictory) {
        setIsVictory("1");
        setIsGroupMatchVictory("1");
      } else {
        setIsVictory("0");
        setIsGroupMatchVictory("0");
      }

      // どちらかが戻された場合
    } else if (!isDefaultVictory && !isDefaultDefeat) {
      setIsDisabled(false);

      setIsVictory("-1");
      setIsGroupMatchVictory("-1");
    }
  }, [isDefaultVictory, isDefaultDefeat]);

  const createMatch = async (onClose: () => void) => {
    // 連打による多重登録(同じ対戦結果が2件できる)を防ぐ。
    // state(isSubmitting)によるボタン無効化は再レンダー待ちの隙間があるため、ref で同期的に弾く
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    // BO3タブが選択されている場合はBO3(2本先取)として登録する
    const isBO3 = selectedTab === "bo3";
    // チーム戦タブが選択されている場合はチーム戦として登録する（BO3とは排他）
    const isGroupMatch = selectedTab === "team";
    const isDefault = isDefaultVictory || isDefaultDefeat;

    let games: GameRequestType[] = [];

    if (!isDefault) {
      const isInvalid = isBO3
        ? !isBO3GamesFilled(bo3Games)
        : isGoFirst === "-1" || isVictory === "-1";

      if (isInvalid) {
        addToast({
          title: "エラーが発生しました",
          description: <>エラーが発生しました</>,
          color: "danger",
          timeout: 5000,
        });

        // 入力し直して再登録できるよう、モーダルは開いたままにする
        submittingRef.current = false;
        setIsSubmitting(false);

        return;
      }

      if (isBO3) {
        // 2本先取で決着した時点までのゲームを登録する（2-0なら2件、2-1なら3件）
        games = submittedGames(bo3Games).map((game) => ({
          go_first: game.goFirst === "1",
          winnging_flg: game.victory === "1",
          your_prize_cards: game.yourPrizeCards,
          opponents_prize_cards: game.opponentsPrizeCards,
          memo: "",
        }));
      } else {
        games = [
          {
            go_first: isGoFirst === "1",
            winnging_flg: isVictory === "1",
            your_prize_cards: yourPrizeCards,
            opponents_prize_cards: opponentsPrizeCards,
            memo: "",
          },
        ];
      }
    }

    // position(1/2)を必ず付与してスロットを固定する(空スロットを詰めない)
    const pokemon_sprites: MatchPokemonSpriteType[] = [];

    if (pokemonSprite1) {
      pokemon_sprites.push({ id: pokemonSprite1.id, position: 1 });
    }

    if (pokemonSprite2) {
      pokemon_sprites.push({ id: pokemonSprite2.id, position: 2 });
    }

    // BO3の対戦全体の勝敗はゲームの勝敗から導出する（不戦勝/不戦敗はトグルの値を使う）
    const victoryFlg = isBO3 && !isDefault ? bo3VictoryFlg(bo3Games) : isVictory === "1";

    const match: MatchCreateRequestType = {
      record_id: record ? record.id : "",
      deck_id: record ? record.deck_id : "",
      deck_code_id: record ? record.deck_code_id : "",
      opponents_user_id: "",
      bo3_flg: isBO3,
      group_match_flg: isGroupMatch,
      qualifying_round_flg: qualifyingRoundFlg,
      final_tournament_flg: finalTournamentFlg,
      default_victory_flg: isDefaultVictory,
      default_defeat_flg: isDefaultDefeat,
      victory_flg: victoryFlg,
      // チーム戦のときのみチームの勝敗を設定（個人戦では常に false）
      // 不戦勝の場合はチームも勝ちとして扱う
      group_match_victory_flg:
        isGroupMatch && (isDefaultVictory || isGroupMatchVictory === "1"),
      opponents_deck_info: opponentsDeckInfo,
      memo: memo,
      games: games,
      pokemon_sprites: pokemon_sprites,
    };

    const toastId = addToast({
      title: "対戦結果を追加中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(match),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: MatchCreateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の追加が完了",
        description: "対戦結果を追加しました",
        color: "success",
        timeout: 3000,
      });

      setMatches((prev) => {
        if (!prev) return [ret];
        return [...prev, ret];
      });

      triggerNotificationsRefresh();

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の追加に失敗",
        description: (
          <>
            対戦結果の追加に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      // 失敗時は閉じない。入力内容を保持したまま、そのまま再登録(リトライ)できるようにする
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // BO1 / BO3 / チーム戦タブで共通の入力フォーム
  // mode に応じてゲームの入力欄（1ゲーム or BO3の複数ゲーム）とチームの勝敗欄を切り替える
  //
  // CardBody の overflow-visible は iOS のスクロール不能対策。
  // HeroUI の CardBody は overflow-y-auto を持つが実際には溢れないため、その上に指を置いた
  // スワイプが usePreventScroll(react-aria) に殺され、モーダルがスクロールしなくなる
  const renderMatchForm = (mode: "bo1" | "bo3" | "team") => {
    const showGroupMatch = mode === "team";
    const isBO3 = mode === "bo3";

    return (
      <div className="flex flex-col gap-2 pt-0">
        <Card shadow="md" className="w-full">
          <CardHeader className="pb-0 text-tiny">予選/本戦</CardHeader>
          <CardBody className="overflow-visible">
            <CheckboxGroup
              size="md"
              label=""
              isInvalid={!isValidedFlg}
              errorMessage="予選と本戦は同時に選択できません"
              orientation="horizontal"
              classNames={{
                base: "w-full",
                // 2枚のカードを等幅で並べ、タップ領域を広く取る
                wrapper: "grid grid-cols-2 gap-2 w-full",
              }}
            >
              <Checkbox
                value="qualifying_round"
                color="warning"
                isSelected={qualifyingRoundFlg}
                onChange={(e) => {
                  setQualifyingRoundFlg(e.target.checked);
                }}
                classNames={{
                  // チェックマークは表示せず、カード全体の枠線・背景で選択状態を示す
                  wrapper: "hidden",
                  base: "inline-flex max-w-full w-full m-0 items-center justify-center cursor-pointer rounded-xl gap-0 p-3 border-2 border-default-200 bg-default-50 data-[selected=true]:border-warning data-[selected=true]:bg-warning/10",
                  label: "text-sm font-bold text-center",
                }}
              >
                🎯 予選
              </Checkbox>
              <Checkbox
                value="final_tournament"
                color="warning"
                isSelected={finalTournamentFlg}
                onChange={(e) => {
                  setFinalTournamentFlg(e.target.checked);
                }}
                classNames={{
                  wrapper: "hidden",
                  base: "inline-flex max-w-full w-full m-0 items-center justify-center cursor-pointer rounded-xl gap-0 p-3 border-2 border-default-200 bg-default-50 data-[selected=true]:border-warning data-[selected=true]:bg-warning/10",
                  label: "text-sm font-bold text-center",
                }}
              >
                🏆 本戦
              </Checkbox>
            </CheckboxGroup>
          </CardBody>
        </Card>

        <Card data-opponents-deck-field shadow="md" className="w-full">
          <CardHeader className="pb-0 flex flex-col items-start text-tiny">
            <label className="flex items-center gap-1">
              <span>相手のデッキ</span>
              <span className="text-sm text-red-500">*</span>
            </label>
            {/* アイコン枠がタップできることに気づかれにくいため、常に案内を出す */}
            <span className="text-default-400">
              アイコン枠をタップするとポケモンを選べます（任意）
            </span>
          </CardHeader>
          <CardBody className="overflow-visible flex flex-col gap-3">
            {/* スプライト + デッキ名入力 */}
            <div className="flex items-center gap-1.5 w-full">
              <PokemonSpriteSelectButton
                sprite1={pokemonSprite1}
                sprite2={pokemonSprite2}
                isDisabled={isDefaultVictory || isDefaultDefeat}
                onOpen={(slot) => {
                  setActivePokemonSpriteSlot(slot);
                  onOpenForPokemonSpriteModal();
                }}
              />

              <Input
                isDisabled={isDisabled}
                size="md"
                radius="md"
                type="text"
                label=""
                labelPlacement="outside"
                placeholder={"例）" + (activeCandidates[0]?.deckInfo ?? "相手のデッキ")}
                value={opponentsDeckInfo}
                onChange={(e) => setOpponentsDeckInfo(e.target.value)}
                // Android のキーボードで隠れないよう、カードごと可視領域の上端へ
                // 引き上げる(下に出る履歴候補まで見せるため、入力欄単体ではなくカード基準)
                onFocus={(e) =>
                  scrollToTopAfterKeyboard(
                    e.currentTarget.closest("[data-opponents-deck-field]"),
                  )
                }
                isInvalid={isOpponentsDeckInfoTooLong}
                errorMessage={`${MAX_OPPONENTS_DECK_INFO_LENGTH}文字以内で入力してください`}
              />
            </div>

            {/* 履歴候補 - 横スクロールカード（入力欄の下に自動表示） */}
            {isCandidatesLoading ? (
              <HScrollRow className="flex gap-2 py-2">
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
              <HScrollRow className="flex gap-2 py-2">
                {filteredHistories.length > 0 ? (
                  filteredHistories.map((history, index) => {
                    const isSelected =
                      opponentsDeckInfo === history.deckInfo &&
                      pokemonSprite1?.id === (history.sprite1?.id ?? undefined) &&
                      pokemonSprite2?.id === (history.sprite2?.id ?? undefined);
                    return (
                      <button
                        key={index}
                        disabled={isDisabled}
                        className={`shrink-0 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border-2 w-24 transition-colors ${
                          isDisabled
                            ? "opacity-40 cursor-not-allowed border-default-200 bg-default-50"
                            : isSelected
                              ? "border-primary bg-primary/10"
                              : "border-default-200 bg-default-50 active:bg-default-100"
                        }`}
                        onClick={() => {
                          if (isDisabled) return;
                          if (isSelected) {
                            setOpponentsDeckInfo("");
                            setPokemonSprite1(null);
                            setPokemonSprite2(null);
                          } else {
                            setOpponentsDeckInfo(history.deckInfo);
                            setPokemonSprite1(history.sprite1);
                            setPokemonSprite2(history.sprite2);
                          }
                        }}
                      >
                        <div className="flex items-end justify-center w-full h-9">
                          <PokemonSprite id={history.sprite1?.id} size={36} />
                          <PokemonSprite id={history.sprite2?.id} size={36} />
                        </div>
                        <CardDeckName text={history.deckInfo} />
                      </button>
                    );
                  })
                ) : (
                  <div className="shrink-0 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border-2 w-24 border-default-200 bg-default-50 opacity-40">
                    <div className="flex items-end justify-center w-full h-9">
                      <PokemonSprite size={36} />
                      <PokemonSprite size={36} />
                    </div>
                    <span className="text-[10px] leading-snug w-full text-center whitespace-nowrap">
                      候補なし
                    </span>
                  </div>
                )}
              </HScrollRow>
            ) : null}
          </CardBody>
        </Card>

        {isBO3 ? (
          <BO3GamesInput
            games={bo3Games}
            onChange={updateBO3Game}
            isDisabled={isDisabled}
          />
        ) : (
          <>
            <div className="flex items-center gap-6">
              <Card shadow="md" className="w-full">
                <CardHeader className="pb-0 text-tiny">
                  <label className="flex items-center gap-1">
                    先攻/後攻
                    <span className="text-red-500 text-sm">*</span>
                  </label>
                </CardHeader>
                <CardBody className="overflow-visible">
                  <ChoiceButtonGroup
                    value={isGoFirst}
                    onChange={setIsGoFirst}
                    isDisabled={isDisabled}
                    options={[
                      { value: "1", label: "先攻", color: "secondary" },
                      { value: "0", label: "後攻", color: "secondary" },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card shadow="md" className="w-full">
                <CardHeader className="pb-0 text-tiny">
                  <label className="flex items-center gap-1">
                    {showGroupMatch ? "自分の勝敗" : "勝ち/負け"}
                    <span className="text-red-500 text-sm">*</span>
                  </label>
                </CardHeader>
                <CardBody className="overflow-visible">
                  <ChoiceButtonGroup
                    value={isVictory}
                    onChange={setIsVictory}
                    isDisabled={isDisabled}
                    options={[
                      { value: "1", label: "勝ち", color: "success" },
                      { value: "0", label: "負け", color: "danger" },
                    ]}
                  />
                </CardBody>
              </Card>
            </div>

            <Card shadow="md" className="w-full">
              <CardHeader className="pb-0 text-tiny">
                サイド（取ったサイドの枚数）
              </CardHeader>
              <CardBody className="overflow-visible">
                <PrizeCardsStepper
                  yourPrizeCards={yourPrizeCards}
                  opponentsPrizeCards={opponentsPrizeCards}
                  onYourChange={setYourPrizeCards}
                  onOpponentsChange={setOpponentsPrizeCards}
                  isDisabled={isDisabled}
                />
              </CardBody>
            </Card>
          </>
        )}

        {showGroupMatch && (
          <Card shadow="md" className="w-full">
            <CardHeader className="pb-0 text-tiny">
              <label className="flex items-center gap-1">
                チームの勝敗
                <span className="text-red-500 text-sm">*</span>
              </label>
            </CardHeader>
            <CardBody className="overflow-visible">
              <ChoiceButtonGroup
                value={isGroupMatchVictory}
                onChange={setIsGroupMatchVictory}
                isDisabled={isDisabled}
                options={[
                  { value: "1", label: "勝ち", color: "success" },
                  { value: "0", label: "負け", color: "danger" },
                ]}
              />
            </CardBody>
          </Card>
        )}

        {/* textarea 自身に overflow を持たせると、その上のスワイプが iOS で
            モーダルのスクロールに繋がらない。内容の高さまで伸ばし、スクロールはモーダルに任せる */}
        <Textarea
          size="md"
          className=""
          label="対戦メモ"
          value={memo}
          placeholder="対戦のメモを残そう"
          maxRows={999}
          classNames={{ input: "overflow-hidden" }}
          onChange={(e) => {
            const inputValue = e.target.value;
            setMemo(inputValue);
          }}
          onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
        />
      </div>
    );
  };

  return (
    <>
      <PokemonSpriteModal
        pokemonSprite1={pokemonSprite1}
        setPokemonSprite1={setPokemonSprite1}
        pokemonSprite2={pokemonSprite2}
        setPokemonSprite2={setPokemonSprite2}
        isOpen={isOpenForPokemonSpriteModal}
        onOpenChange={onOpenChangeForPokemonSpriteModal}
        initialActiveSlot={activePokemonSpriteSlot}
      />

      <Modal
        size="md"
        placement="bottom"
        isDismissable={false}
        // 登録APIの実行中はESCキーでも閉じられないようにする
        // (isDisabled は不戦勝/不戦敗の選択中を表すフラグなので、ここでは使わない)
        isKeyboardDismissDisabled={isSubmitting}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={resetForm}
        hideCloseButton
        /*
         * --visual-viewport-height は HeroUI が wrapper に付ける「実際に見えている高さ」。
         * iOS はキーボードが出てもレイアウトビューポート(= 100dvh)を縮めないため、100dvh 基準だと
         * シートが wrapper からはみ出し、下端がキーボードの裏に隠れる。隠れた入力欄を見せようと
         * ブラウザがビューポートごと押し上げるので、ヘッダーが画面外へ出てスクロールでも戻せなくなる。
         *
         * min() で可視領域を上限にする。キーボードが無いときは従来どおり 100dvh-108px、
         * キーボードが出ているときは残った可視領域いっぱい(= 108px を更に削らない)になる。
         */
        className="h-[min(calc(100dvh-108px),var(--visual-viewport-height,100dvh))] max-h-[min(calc(100dvh-108px),var(--visual-viewport-height,100dvh))] my-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
          ...closingPassthroughClassNames(isOpen),
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                ref={attachHeader}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />
                <div>対戦結果を追加</div>
              </ModalHeader>
              <ModalBody
                data-keyboard-scroll-container
                className="flex flex-col gap-0 px-1 py-1 pb-0 overflow-y-auto"
              >
                <Tabs
                  fullWidth
                  size="sm"
                  className="left-0 right-0 pl-1 pr-1 font-bold"
                  // fullWidth のため溢れない overflow-x-scroll を打ち消す。
                  // 残すとタブバー上のスワイプが iOS でモーダルのスクロールに繋がらない
                  classNames={{ tabList: "overflow-x-visible" }}
                  selectedKey={selectedTab}
                  onSelectionChange={(key) => setSelectedTab(key as string)}
                >
                  <Tab key="bo1" title="BO1">
                    {renderMatchForm("bo1")}
                  </Tab>
                  {/* BO3は一旦提供を停止しているため無効化する */}
                  <Tab key="bo3" title="BO3(準備中)" isDisabled>
                    {renderMatchForm("bo3")}
                  </Tab>
                  <Tab key="team" title="チーム戦">
                    {renderMatchForm("team")}
                  </Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter
                className={`pt-2 ${isIOSDevice ? "pb-5" : "pb-2"} flex items-center`}
              >
                <div className="w-full">
                  <div className="flex items-center gap-6">
                    <Switch
                      size="md"
                      isDisabled={isDisabled && isDefaultDefeat}
                      isSelected={isDefaultVictory}
                      onValueChange={(isSelected) => {
                        setPokemonSprite1(null);
                        setPokemonSprite2(null);
                        setIsDefaultVictory(isSelected);
                      }}
                    >
                      不戦勝
                    </Switch>
                    <Switch
                      size="md"
                      isDisabled={isDisabled && isDefaultVictory}
                      isSelected={isDefaultDefeat}
                      onValueChange={(isSelected) => {
                        setPokemonSprite1(null);
                        setPokemonSprite2(null);
                        setIsDefaultDefeat(isSelected);
                      }}
                    >
                      不戦敗
                    </Switch>
                  </div>
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  // isSubmitting: 登録APIの実行中の連打による多重登録を防ぐ。
                  // 不戦勝/不戦敗(isDisabled)の場合は couldCreateFlg が効かないため、これが唯一のガードになる
                  isDisabled={
                    isSubmitting ||
                    !isValidedFlg ||
                    isOpponentsDeckInfoTooLong ||
                    (!isDisabled && !couldCreateFlg)
                  }
                  isLoading={isSubmitting}
                  onPress={() => {
                    createMatch(onClose);
                  }}
                  className="font-bold"
                >
                  作成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
