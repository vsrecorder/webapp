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
import { RadioGroup, Radio } from "@heroui/react";
import { NumberInput } from "@heroui/react";
import { Textarea } from "@heroui/react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { LuTrash2 } from "react-icons/lu";

import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";
import DeleteMatchModal from "@app/components/organisms/Match/Modal/DeleteMatchModal";
import BO3GamesInput from "@app/components/organisms/Match/BO3GamesInput";

import { MatchGetResponseType } from "@app/types/match";
import { MatchUpdateRequestType, MatchUpdateResponseType } from "@app/types/match";
import { GameRequestType } from "@app/types/game";
import { PokemonSpriteType, MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { spriteScaleClass } from "@app/utils/sprite";
import {
  GameInput,
  newGameInputs,
  submittedGames,
  bo3VictoryFlg,
  isBO3GamesFilled,
  toGameInputs,
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
  match: MatchGetResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function UpdateMatchModal({
  match,
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

  const [opponentsDeckInfo, setOpponentsDeckInfo] = useState<string>("");

  const [isGoFirst, setIsGoFirst] = useState("-1");
  const [isVictory, setIsVictory] = useState("-1");
  // チーム戦におけるチームの勝敗（group_match_victory_flg）
  const [isGroupMatchVictory, setIsGroupMatchVictory] = useState("-1");

  const [isDefaultVictory, setIsDefaultVictory] = useState(false);
  const [isDefaultDefeat, setIsDefaultDefeat] = useState(false);

  const [yourPrizeCards, setYourPrizeCards] = useState(0);
  const [opponentsPrizeCards, setOpponentsPrizeCards] = useState(0);

  const [memo, setMemo] = useState("");

  const [isValidedFlg, setIsValidedFlg] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);
  const [couldUpdateFlg, setCouldUpdateFlg] = useState(false);

  const [pokemonSprite1, setPokemonSprite1] = useState<PokemonSpriteType | null>(null);
  const [pokemonSprite2, setPokemonSprite2] = useState<PokemonSpriteType | null>(null);

  // モーダルが開いているときだけ直近マッチを取得（limit=100 で十分な候補数を確保）
  const { data: recentMatches } = useSWR<MatchGetResponseType[]>(
    isOpen && match ? `/api/users/${match.user_id}/matches?limit=100` : null,
    fetchMatches,
  );

  // 出現回数の多い順に並んだデッキ履歴（上位30件、不戦勝/不戦敗を除外）
  const deckHistories = useMemo<DeckHistory[]>(() => {
    if (!recentMatches) return [];
    const countMap = new Map<string, { history: DeckHistory; count: number }>();
    for (const m of recentMatches) {
      if (m.default_victory_flg || m.default_defeat_flg) continue;
      if (!m.opponents_deck_info) continue;
      const s1Id = m.pokemon_sprites[0]?.id;
      const s2Id = m.pokemon_sprites[1]?.id;
      const key = `${m.opponents_deck_info}|${s1Id ?? ""}|${s2Id ?? ""}`;
      const entry = countMap.get(key);
      if (entry) {
        entry.count++;
      } else {
        countMap.set(key, {
          count: 1,
          history: {
            deckInfo: m.opponents_deck_info,
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
    for (const m of globalMatches) {
      if (m.default_victory_flg || m.default_defeat_flg) continue;
      if (!m.opponents_deck_info) continue;
      const s1Id = m.pokemon_sprites[0]?.id;
      const s2Id = m.pokemon_sprites[1]?.id;
      const key = `${m.opponents_deck_info}|${s1Id ?? ""}|${s2Id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        deckInfo: m.opponents_deck_info,
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

  // 元の match データとの差分があるかを判定
  const hasChanges = useMemo(() => {
    if (!match) return false;

    if (qualifyingRoundFlg !== (match.qualifying_round_flg ?? false)) return true;
    if (finalTournamentFlg !== (match.final_tournament_flg ?? false)) return true;
    if (isDefaultVictory !== (match.default_victory_flg ?? false)) return true;
    if (isDefaultDefeat !== (match.default_defeat_flg ?? false)) return true;
    if (memo !== (match.memo ?? "")) return true;

    // BO3 / チーム戦の切り替え、またはチームの勝敗が変更された場合
    if ((selectedTab === "bo3") !== (match.bo3_flg ?? false)) return true;
    if ((selectedTab === "team") !== (match.group_match_flg ?? false)) return true;
    if (selectedTab === "team") {
      if (isGroupMatchVictory !== (match.group_match_victory_flg ? "1" : "0"))
        return true;
    }

    if (!isDefaultVictory && !isDefaultDefeat) {
      if (opponentsDeckInfo !== (match.opponents_deck_info ?? "")) return true;

      if (selectedTab === "bo3") {
        // BO3はゲーム数の増減(2-0 ⇔ 2-1)と各ゲームの内容を比較する
        const games = submittedGames(bo3Games);
        const original = match.games ?? [];

        if (games.length !== original.length) return true;

        for (let i = 0; i < games.length; i++) {
          if (games[i].goFirst !== (original[i].go_first ? "1" : "0")) return true;
          if (games[i].victory !== (original[i].winnging_flg ? "1" : "0")) return true;
          if (games[i].yourPrizeCards !== (original[i].your_prize_cards ?? 0))
            return true;
          if (games[i].opponentsPrizeCards !== (original[i].opponents_prize_cards ?? 0))
            return true;
        }
      } else {
        if (isGoFirst !== (match.games?.[0]?.go_first ? "1" : "0")) return true;
        if (isVictory !== (match.victory_flg ? "1" : "0")) return true;
        if (yourPrizeCards !== (match.games?.[0]?.your_prize_cards ?? 0)) return true;
        if (opponentsPrizeCards !== (match.games?.[0]?.opponents_prize_cards ?? 0))
          return true;
      }

      if ((pokemonSprite1?.id ?? null) !== (match.pokemon_sprites[0]?.id ?? null))
        return true;
      if ((pokemonSprite2?.id ?? null) !== (match.pokemon_sprites[1]?.id ?? null))
        return true;
    }

    return false;
  }, [
    match,
    selectedTab,
    qualifyingRoundFlg,
    finalTournamentFlg,
    isDefaultVictory,
    isDefaultDefeat,
    memo,
    opponentsDeckInfo,
    isGoFirst,
    isVictory,
    isGroupMatchVictory,
    yourPrizeCards,
    opponentsPrizeCards,
    bo3Games,
    pokemonSprite1,
    pokemonSprite2,
  ]);

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

  const {
    isOpen: isOpenForDeleteMatchModal,
    onOpen: onOpenForDeleteMatchModal,
    onOpenChange: onOpenChangeForDeleteMatchModal,
  } = useDisclosure();

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    // 下方向に30px以上スワイプしたら閉じる
    if (diff > 30) {
      startY.current = null;
      onClose();
    }
  };

  useEffect(() => {
    if (!match || !isOpen) return;

    // BO3 / チーム戦 / BO1 は排他なので、フラグからタブを復元する
    setSelectedTab(match.bo3_flg ? "bo3" : match.group_match_flg ? "team" : "bo1");

    // 登録済みのゲームをBO3の入力値に復元する（BO1でもタブ切替時に活きるよう常に設定）
    setBo3Games(toGameInputs(match.games));

    setQualifyingRoundFlg(match.qualifying_round_flg ?? false);
    setFinalTournamentFlg(match.final_tournament_flg ?? false);

    setOpponentsDeckInfo(match.opponents_deck_info ?? "");

    setIsGoFirst(match.games?.[0]?.go_first ? "1" : "0");
    setIsVictory(match.victory_flg ? "1" : "0");
    setIsGroupMatchVictory(match.group_match_victory_flg ? "1" : "0");

    setIsDefaultVictory(match.default_victory_flg ?? false);
    setIsDefaultDefeat(match.default_defeat_flg ?? false);

    setYourPrizeCards(match.games?.[0]?.your_prize_cards ?? 0);
    setOpponentsPrizeCards(match.games?.[0]?.opponents_prize_cards ?? 0);

    setMemo(match.memo ?? "");

    setPokemonSprite1(
      match.pokemon_sprites[0]
        ? {
            id: match.pokemon_sprites[0].id,
            name: "",
            image_url: `${SPRITE_BASE_URL}/${match.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`,
          }
        : null,
    );

    setPokemonSprite2(
      match.pokemon_sprites[1]
        ? {
            id: match.pokemon_sprites[1].id,
            name: "",
            image_url: `${SPRITE_BASE_URL}/${match.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`,
          }
        : null,
    );
  }, [match, isOpen]);

  useEffect(() => {
    if (qualifyingRoundFlg && finalTournamentFlg) {
      setIsValidedFlg(false);
    } else {
      setIsValidedFlg(true);
    }
  }, [qualifyingRoundFlg, finalTournamentFlg]);

  useEffect(() => {
    // 不戦勝/不戦敗の場合は相手のデッキも勝敗も入力しないため、常に更新可能
    if (isDefaultVictory || isDefaultDefeat) {
      setCouldUpdateFlg(true);
      return;
    }

    if (opponentsDeckInfo === "") {
      setCouldUpdateFlg(false);
      return;
    }

    // BO3タブは各ゲームの先攻/後攻と勝敗がすべて入力されている必要がある
    if (selectedTab === "bo3") {
      setCouldUpdateFlg(isBO3GamesFilled(bo3Games));
      return;
    }

    if (isGoFirst === "-1" || isVictory === "-1") {
      setCouldUpdateFlg(false);
      // チーム戦タブの場合はチームの勝敗（group_match_victory_flg）も必須
    } else if (selectedTab === "team" && isGroupMatchVictory === "-1") {
      setCouldUpdateFlg(false);
    } else {
      setCouldUpdateFlg(true);
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

  const updateMatch = async (onClose: () => void) => {
    setCouldUpdateFlg(false);

    // BO3タブが選択されている場合はBO3(2本先取)として更新する
    const isBO3 = selectedTab === "bo3";
    // チーム戦タブが選択されている場合はチーム戦として更新する（BO3とは排他）
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

        onClose();

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

    const pokemon_sprites: MatchPokemonSpriteType[] = [];

    if (pokemonSprite1) {
      pokemon_sprites.push(pokemonSprite1);
    }

    if (pokemonSprite2) {
      pokemon_sprites.push(pokemonSprite2);
    }

    // BO3の対戦全体の勝敗はゲームの勝敗から導出する（不戦勝/不戦敗はトグルの値を使う）
    const victoryFlg = isBO3 && !isDefault ? bo3VictoryFlg(bo3Games) : isVictory === "1";

    const data: MatchUpdateRequestType = {
      record_id: match?.record_id ?? "",
      deck_id: match?.deck_id ?? "",
      deck_code_id: match?.deck_code_id ?? "",
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
      title: "対戦結果を更新中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/matches/${match?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: MatchUpdateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の更新が完了",
        description: "対戦結果を更新しました",
        color: "success",
        timeout: 3000,
      });

      setMatches((prev) => {
        if (!prev) return [ret];

        return prev.map((m) => (m.id === ret.id ? ret : m));
      });

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の更新に失敗",
        description: (
          <>
            対戦結果の更新に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  // BO1 / BO3 / チーム戦タブで共通の入力フォーム
  // mode に応じてゲームの入力欄（1ゲーム or BO3の複数ゲーム）とチームの勝敗欄を切り替える
  const renderMatchForm = (mode: "bo1" | "bo3" | "team") => {
    const showGroupMatch = mode === "team";
    const isBO3 = mode === "bo3";

    return (
      <div className="flex flex-col gap-2 pt-0">
        <Card shadow="md" className="w-full">
          <CardHeader className="pb-0 text-tiny">予選/本戦</CardHeader>
          <CardBody className="">
            <CheckboxGroup
              size="md"
              label=""
              isInvalid={!isValidedFlg}
              errorMessage=""
              orientation="horizontal"
              classNames={{
                base: "",
                wrapper: "flex items-center justify-center gap-21 mx-auto",
              }}
            >
              <Checkbox
                value="qualifying_round"
                isSelected={qualifyingRoundFlg}
                onChange={(e) => {
                  setQualifyingRoundFlg(e.target.checked);
                }}
              >
                予選
              </Checkbox>
              <Checkbox
                value="final_tournament"
                isSelected={finalTournamentFlg}
                onChange={(e) => {
                  setFinalTournamentFlg(e.target.checked);
                }}
              >
                本戦
              </Checkbox>
            </CheckboxGroup>
          </CardBody>
        </Card>

        <Card shadow="md" className="w-full">
          <CardHeader className="pb-0 flex flex-col items-start text-tiny">
            <label className="flex items-center gap-1">
              <span>相手のデッキ</span>
              <span className="text-sm text-red-500">*</span>
            </label>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {/* スプライト + デッキ名入力 */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex items-center gap-0 shrink-0">
                <div className="w-11 h-11 p-0 shrink-0">
                  {pokemonSprite1 ? (
                    <Image
                      onClick={() => {
                        if (!isDefaultVictory && !isDefaultDefeat) {
                          setActivePokemonSpriteSlot(1);
                          onOpenForPokemonSpriteModal();
                        }
                      }}
                      alt={pokemonSprite1.id}
                      src={pokemonSprite1.image_url}
                      radius="none"
                      className={`w-full h-full object-contain ${spriteScaleClass(pokemonSprite1.id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      onClick={() => {
                        if (!isDefaultVictory && !isDefaultDefeat) {
                          setActivePokemonSpriteSlot(1);
                          onOpenForPokemonSpriteModal();
                        }
                      }}
                      alt="unknown"
                      src={`${SPRITE_BASE_URL}/unknown.png`}
                      radius="none"
                      loading="eager"
                      className={`w-full h-full object-contain scale-150 origin-bottom ${isDefaultVictory || isDefaultDefeat ? "contrast-0" : ""}`}
                    />
                  )}
                </div>

                <div className="w-11 h-11 p-0 shrink-0">
                  {pokemonSprite2 ? (
                    <Image
                      onClick={() => {
                        if (!isDefaultVictory && !isDefaultDefeat) {
                          setActivePokemonSpriteSlot(2);
                          onOpenForPokemonSpriteModal();
                        }
                      }}
                      alt={pokemonSprite2.id}
                      src={pokemonSprite2.image_url}
                      radius="none"
                      className={`w-full h-full object-contain ${spriteScaleClass(pokemonSprite2.id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      onClick={() => {
                        if (!isDefaultVictory && !isDefaultDefeat) {
                          setActivePokemonSpriteSlot(2);
                          onOpenForPokemonSpriteModal();
                        }
                      }}
                      alt="unknown"
                      src={`${SPRITE_BASE_URL}/unknown.png`}
                      radius="none"
                      loading="eager"
                      className={`w-full h-full object-contain scale-150 origin-bottom ${isDefaultVictory || isDefaultDefeat ? "contrast-0" : ""}`}
                    />
                  )}
                </div>
              </div>

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
              />
            </div>

            {/* 履歴候補 - 横スクロールカード（入力欄の下に自動表示） */}
            {isCandidatesLoading ? (
              <div className="flex gap-2 overflow-x-auto py-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-24 rounded-xl border-2 border-default-200 bg-default-50 py-2 px-2 flex flex-col items-center gap-1"
                  >
                    <Skeleton className="w-full h-9 rounded-lg" />
                    <Skeleton className="w-full h-3 rounded-md" />
                  </div>
                ))}
              </div>
            ) : activeCandidates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto py-2">
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
                          <div className="w-9 h-9 shrink-0">
                            <Image
                              alt={history.sprite1?.id ?? "unknown"}
                              src={
                                history.sprite1?.image_url ??
                                `${SPRITE_BASE_URL}/unknown.png`
                              }
                              radius="none"
                              className={`w-full h-full object-contain ${spriteScaleClass(history.sprite1?.id)} origin-bottom`}
                            />
                          </div>
                          <div className="w-9 h-9 shrink-0">
                            <Image
                              alt={history.sprite2?.id ?? "unknown"}
                              src={
                                history.sprite2?.image_url ??
                                `${SPRITE_BASE_URL}/unknown.png`
                              }
                              radius="none"
                              className={`w-full h-full object-contain ${spriteScaleClass(history.sprite2?.id)} origin-bottom`}
                            />
                          </div>
                        </div>
                        <CardDeckName text={history.deckInfo} />
                      </button>
                    );
                  })
                ) : (
                  <div className="shrink-0 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border-2 w-24 border-default-200 bg-default-50 opacity-40">
                    <div className="flex items-end justify-center w-full h-9">
                      <div className="w-9 h-9 shrink-0">
                        <Image
                          alt="unknown"
                          src={`${SPRITE_BASE_URL}/unknown.png`}
                          radius="none"
                          className="w-full h-full object-contain scale-150 origin-bottom"
                        />
                      </div>
                      <div className="w-9 h-9 shrink-0">
                        <Image
                          alt="unknown"
                          src={`${SPRITE_BASE_URL}/unknown.png`}
                          radius="none"
                          className="w-full h-full object-contain scale-150 origin-bottom"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] leading-snug w-full text-center whitespace-nowrap">
                      候補なし
                    </span>
                  </div>
                )}
              </div>
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
                <CardBody className="">
                  <RadioGroup
                    isRequired
                    isDisabled={isDisabled}
                    size="md"
                    label=""
                    orientation="horizontal"
                    value={isGoFirst}
                    onValueChange={setIsGoFirst}
                    classNames={{
                      base: "items-center",
                      wrapper: "flex items-center gap-6",
                    }}
                  >
                    <Radio value="1">先攻</Radio>
                    <Radio value="0">後攻</Radio>
                  </RadioGroup>
                </CardBody>
              </Card>

              <Card shadow="md" className="w-full">
                <CardHeader className="pb-0 text-tiny">
                  <label className="flex items-center gap-1">
                    {showGroupMatch ? "自分の勝敗" : "勝ち/負け"}
                    <span className="text-red-500 text-sm">*</span>
                  </label>
                </CardHeader>
                <CardBody className="">
                  <RadioGroup
                    isRequired
                    isDisabled={isDisabled}
                    size="md"
                    label=""
                    orientation="horizontal"
                    value={isVictory}
                    onValueChange={setIsVictory}
                    classNames={{
                      base: "items-center",
                      wrapper: "flex items-center gap-6",
                    }}
                  >
                    <Radio value="1">勝ち</Radio>
                    <Radio value="0">負け</Radio>
                  </RadioGroup>
                </CardBody>
              </Card>
            </div>

            <div className="flex items-center gap-5">
              <NumberInput
                label="自分"
                placeholder=""
                isDisabled={isDisabled}
                minValue={0}
                maxValue={6}
                defaultValue={0}
                value={yourPrizeCards}
                onValueChange={setYourPrizeCards}
                className=""
              />

              <span className="font-bold text-2xl">-</span>

              <NumberInput
                label="相手"
                placeholder=""
                isDisabled={isDisabled}
                minValue={0}
                maxValue={6}
                defaultValue={0}
                value={opponentsPrizeCards}
                onValueChange={setOpponentsPrizeCards}
                className=""
              />
            </div>
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
            <CardBody className="">
              <RadioGroup
                isRequired
                isDisabled={isDisabled}
                size="md"
                label=""
                orientation="horizontal"
                value={isGroupMatchVictory}
                onValueChange={setIsGroupMatchVictory}
                classNames={{
                  base: "items-center",
                  wrapper: "flex items-center gap-6",
                }}
              >
                <Radio value="1">勝ち</Radio>
                <Radio value="0">負け</Radio>
              </RadioGroup>
            </CardBody>
          </Card>
        )}

        <Textarea
          size="md"
          className=""
          label="対戦メモ"
          value={memo}
          placeholder="対戦のメモを残そう"
          onChange={(e) => {
            const inputValue = e.target.value;
            setMemo(inputValue);
          }}
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

      <DeleteMatchModal
        match={match}
        setMatches={setMatches}
        isOpen={isOpenForDeleteMatchModal}
        onOpenChange={onOpenChangeForDeleteMatchModal}
        onCloseForCallBackModal={onClose}
      />

      <Modal
        size="md"
        placement="bottom"
        isDismissable={false}
        // 処理中はESCキーでも閉じられないようにする
        isKeyboardDismissDisabled={isDisabled}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={() => {
          setSelectedTab("bo1");

          setQualifyingRoundFlg(false);
          setFinalTournamentFlg(false);

          setOpponentsDeckInfo("");

          setIsGoFirst("-1");
          setIsVictory("-1");
          setIsGroupMatchVictory("-1");

          setIsDefaultVictory(false);
          setIsDefaultDefeat(false);

          setYourPrizeCards(0);
          setOpponentsPrizeCards(0);

          setMemo("");

          setIsDisabled(false);
          setCouldUpdateFlg(false);

          setPokemonSprite1(null);
          setPokemonSprite2(null);
        }}
        hideCloseButton
        className="h-[calc(100dvh-108px)] max-h-[calc(100dvh-108px)] my-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="flex flex-col items-start">
                    <div>対戦結果を編集</div>
                  </div>

                  {/* 右側 */}
                  <div>
                    <LuTrash2
                      className="text-xl cursor-pointer text-red-500"
                      onClick={() => {
                        onOpenForDeleteMatchModal();
                      }}
                    />
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="flex flex-col gap-0 px-1 py-1 pb-0 overflow-y-auto">
                <Tabs
                  fullWidth
                  size="sm"
                  className="left-0 right-0 pl-1 pr-1 font-bold"
                  selectedKey={selectedTab}
                  onSelectionChange={(key) => setSelectedTab(key as string)}
                >
                  {/* 編集時は元の試合の種別に応じてタブを固定する */}
                  {/* group_match_flg と bo3_flg が共に false の場合のみ BO1 を有効化 */}
                  <Tab
                    key="bo1"
                    title="BO1"
                    isDisabled={
                      (match?.group_match_flg ?? false) || (match?.bo3_flg ?? false)
                    }
                  >
                    {renderMatchForm("bo1")}
                  </Tab>
                  {/* bo3_flg が true の場合のみ BO3 を有効化 */}
                  <Tab
                    key="bo3"
                    title={(match?.bo3_flg ?? false) ? "BO3" : "BO3(準備中)"}
                    isDisabled={!(match?.bo3_flg ?? false)}
                  >
                    {renderMatchForm("bo3")}
                  </Tab>
                  {/* group_match_flg が true の場合のみ チーム戦 を有効化 */}
                  <Tab
                    key="team"
                    title="チーム戦"
                    isDisabled={!(match?.group_match_flg ?? false)}
                  >
                    {renderMatchForm("team")}
                  </Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter className="pt-2 pb-2 flex items-center">
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
                  color="success"
                  variant="solid"
                  isDisabled={
                    !isValidedFlg || (!isDisabled && !couldUpdateFlg) || !hasChanges
                  }
                  onPress={() => {
                    updateMatch(onClose);
                  }}
                  className="font-bold"
                >
                  更新
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
