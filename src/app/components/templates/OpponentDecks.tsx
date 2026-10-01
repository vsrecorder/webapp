"use client";

import { useMemo, useState } from "react";

import useSWR, { useSWRConfig } from "swr";

import { useDisclosure } from "@heroui/react";
import { Button, Input, Skeleton, Tab, Tabs } from "@heroui/react";
import { addToast } from "@heroui/react";

import { CgSearch } from "react-icons/cg";
import { LuArrowDown, LuArrowRight, LuChevronLeft, LuChevronRight } from "react-icons/lu";

import HScrollRow from "@app/components/atoms/HScrollRow";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import FetchError from "@app/components/molecules/FetchError";
import PokemonSpriteSelectButton from "@app/components/molecules/PokemonSpriteSelectButton";
import type { SpriteSlot } from "@app/components/molecules/PokemonSpriteSelectButton";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import {
  OpponentDeckReplaceRequestType,
  OpponentDeckReplaceResponseType,
  OpponentDecksGetResponseType,
  OpponentDeckType,
} from "@app/types/opponent_deck";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

import { toSprite } from "@app/utils/opponentDeckCandidates";
import {
  OpponentDeckOrder,
  filterOpponentDecks,
  formatLastEventDate,
  opponentDeckKey,
  sortOpponentDecks,
  specOfOpponentDeck,
  toOpponentDeckSpec,
} from "@app/utils/opponentDecks";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { MAX_OPPONENTS_DECK_INFO_LENGTH, exceedsTextLength } from "@app/utils/textLength";

/*
 * 相手デッキの一括編集。自分の対戦結果に付けた相手デッキを「表記 × アイコン(スプライト)」の
 * 組み合わせで一覧にし、選んだ組み合わせの対戦をまとめて別の表記・アイコンに置き換える。
 *
 * 表記ゆれ(「ドラパ」「ドラパルトex」)やアイコンの付け忘れがあると、対戦相手のデッキ分析で
 * 別のデッキとして数えられる。これまでは対戦を 1 件ずつ開いて直すしかなかった。
 *
 * ユーザメニューから開くページ(/users/opponent_decks)。一覧 → 編集 → 確認をこのページの中で
 * 切り替える(モーダルを重ねるのはアイコン選択だけ)。置き換えると元の組み合わせとは
 * 見分けが付かなくなり戻せないので、確認を一段挟む。
 */

const OPPONENT_DECKS_URL = "/api/matches/opponent_decks";

// 編集画面で「作成済みの相手のデッキに揃える」に並べる数
const MAX_SUGGESTIONS = 20;

async function fetchOpponentDecks(url: string): Promise<OpponentDecksGetResponseType> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  return res.json();
}

function spritesOf(
  deck: OpponentDeckType,
): [PokemonSpriteType | null, PokemonSpriteType | null] {
  return [
    toSprite(getSpriteBySlot(deck.pokemon_sprites, 1)?.id),
    toSprite(getSpriteBySlot(deck.pokemon_sprites, 2)?.id),
  ];
}

function DeckName({ text, className = "" }: { text: string; className?: string }) {
  return text ? (
    <span className={`truncate ${className}`}>{text}</span>
  ) : (
    <span className={`truncate text-default-400 ${className}`}>（表記なし）</span>
  );
}

// 確認画面で「変更前 → 変更後」を横に並べるときの 1 つ分。アイコンの下にデッキ名と対戦数
function DeckSummary({
  sprite1,
  sprite2,
  name,
  note,
  emphasized = false,
}: {
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
  name: string;
  note: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 ${
        emphasized ? "border-2 border-primary/50 bg-background" : "bg-default-100"
      }`}
    >
      <span className="flex h-9 items-end">
        <PokemonSprite id={sprite1?.id} size={36} />
        <PokemonSprite id={sprite2?.id} size={36} />
      </span>
      <DeckName
        text={name}
        className={`w-full text-center text-small ${emphasized ? "font-bold" : "text-default-600"}`}
      />
      <span className="text-tiny tabular-nums text-default-500">{note}</span>
    </div>
  );
}

function OpponentDeckRow({
  deck,
  onSelect,
}: {
  deck: OpponentDeckType;
  onSelect: (deck: OpponentDeckType) => void;
}) {
  const [sprite1, sprite2] = spritesOf(deck);
  const lastDate = formatLastEventDate(deck.last_event_date);

  return (
    <li className="border-t border-divider first:border-t-0">
      <button
        type="button"
        onClick={() => onSelect(deck)}
        className="flex w-full items-center gap-2 py-2.5 text-left active:opacity-70"
      >
        <span className="flex shrink-0 items-end">
          {/* 一覧は数百種類になりうるので、画面外の行の画像は見えてから読む */}
          <PokemonSprite id={sprite1?.id} size={32} loading="lazy" />
          <PokemonSprite id={sprite2?.id} size={32} loading="lazy" />
        </span>
        <span className="min-w-0 flex-1">
          <DeckName
            text={deck.opponents_deck_info}
            className="block text-small font-bold"
          />
          {lastDate && (
            <span className="block text-tiny text-default-500">最終 {lastDate}</span>
          )}
        </span>
        <span className="shrink-0 text-small tabular-nums text-default-600">
          {deck.count}戦
        </span>
        <LuChevronRight className="shrink-0 text-default-400" />
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-2 py-2.5">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 w-8 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

/*
 * 編集画面。置き換え先の表記とアイコンを決め、確認してから置き換える。
 * deck が差し替わるたびに作り直す(key に組み合わせを渡す)ので、入力の初期値は props から取る
 */
function EditOpponentDeck({
  deck,
  decks,
  onBack,
  onReplaced,
}: {
  deck: OpponentDeckType;
  decks: OpponentDeckType[];
  onBack: () => void;
  onReplaced: (updatedCount: number) => void;
}) {
  const [fromSprite1, fromSprite2] = spritesOf(deck);

  const [deckInfo, setDeckInfo] = useState(deck.opponents_deck_info);
  // 候補を絞る文字列。入力欄に打ったときだけ変わる(候補を選んで表記が入ったときに、
  // 候補がその 1 件に絞られて他を選び直せなくならないよう、表記とは別に持つ)
  const [typed, setTyped] = useState("");
  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(fromSprite1);
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(fromSprite2);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    isOpen: isSpriteModalOpen,
    onOpen: openSpriteModal,
    onOpenChange: onSpriteModalOpenChange,
  } = useDisclosure();
  const [activeSlot, setActiveSlot] = useState<SpriteSlot>(1);

  const to = toOpponentDeckSpec(deckInfo, sprite1, sprite2);
  const toKey = opponentDeckKey(to);
  const isUnchanged = toKey === opponentDeckKey(deck);
  const isTooLong = exceedsTextLength(deckInfo, MAX_OPPONENTS_DECK_INFO_LENGTH);
  const isEmpty = to.opponents_deck_info === "";
  const canSubmit = !isUnchanged && !isTooLong && !isEmpty;

  // 置き換え先が既にある組み合わせなら、その対戦とまとめて数えられるようになる
  const mergeTarget = decks.find((d) => opponentDeckKey(d) === toKey && !isUnchanged);

  // 作成済みの相手のデッキから選ぶ候補。いま編集している組み合わせは除き、入力欄に打った表記で絞る
  const suggestions = useMemo(() => {
    // 表記の無い組み合わせ(アイコンだけ)は除く。選ぶと表記が空になり、変更できない状態になるため
    const others = decks.filter(
      (d) =>
        d.opponents_deck_info.trim() !== "" &&
        opponentDeckKey(d) !== opponentDeckKey(deck),
    );
    return filterOpponentDecks(others, typed).slice(0, MAX_SUGGESTIONS);
  }, [decks, deck, typed]);

  async function submit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    const body: OpponentDeckReplaceRequestType = { from: specOfOpponentDeck(deck), to };

    try {
      const res = await fetch(OPPONENT_DECKS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const ret: OpponentDeckReplaceResponseType = await res.json();
      onReplaced(ret.updated_count);
    } catch {
      addToast({
        title: "相手デッキを変更できませんでした",
        description: "時間をおいてやり直してください",
        color: "danger",
        timeout: 5000,
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="flex items-center gap-0.5 self-start text-small text-primary active:opacity-70"
      >
        <LuChevronLeft />
        一覧に戻る
      </button>

      {/* 変更前 → 変更後を上から下へ矢印でつなぐ。変更前は控えめに、入力する変更後は色付きの枠で囲み、
          どちらを書き換えるのかを見ただけで分かるようにする */}
      <div className="flex flex-col items-stretch">
        {/* 変更前は変更後の入力と同じ骨組みで描く(アイコン枠と同じ幅・高さ・スプライトの大きさ、
            入力欄と同じ左の余白と文字の大きさ)。上下で同じ位置に並ぶので、どこが変わるのかを
            見比べやすい。枠線は透明にして、変更後の枠線(2px)ぶんの位置も合わせる */}
        <div className="flex flex-col gap-2 rounded-xl border-2 border-transparent bg-default-100 px-3 pt-2.5 pb-3.5">
          <div className="text-tiny font-bold text-default-500">変更前</div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-14 w-25 shrink-0 items-center rounded-xl border-2 border-transparent">
              <span className="flex w-1/2 justify-center">
                <PokemonSprite id={fromSprite1?.id} size={44} />
              </span>
              <span className="flex w-1/2 justify-center">
                <PokemonSprite id={fromSprite2?.id} size={44} />
              </span>
            </div>
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 px-3">
              <DeckName
                text={deck.opponents_deck_info}
                className="min-w-0 flex-1 text-base text-default-600"
              />
              <span className="shrink-0 text-small tabular-nums text-default-500">
                {deck.count}戦
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 -my-2 flex justify-center" aria-hidden>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md ring-4 ring-background">
            <LuArrowDown />
          </span>
        </div>

        <div
          className="flex flex-col gap-2 rounded-xl border-2 border-primary/50 bg-primary/5 px-3 pt-3.5 pb-2.5"
          data-opponents-deck-field
        >
          <div className="text-tiny font-bold text-primary">変更後</div>
          <div className="flex items-center gap-1.5">
            <PokemonSpriteSelectButton
              sprite1={sprite1}
              sprite2={sprite2}
              isDisabled={isSubmitting}
              onOpen={(slot) => {
                setActiveSlot(slot);
                openSpriteModal();
              }}
            />
            {/* classNames.input の text-base(16px) は必須。iOS Safari は 16px 未満の入力欄に
              フォーカスするとページを拡大してしまう */}
            <Input
              aria-label="変更後の相手デッキ"
              value={deckInfo}
              onValueChange={(value) => {
                setDeckInfo(value);
                setTyped(value);
                setIsConfirming(false);
              }}
              isDisabled={isSubmitting}
              placeholder="相手のデッキ"
              classNames={{ input: "text-base" }}
              // 表記が空だと変更できない(API も弾く)。ボタンが押せない理由をここで伝える
              isInvalid={isTooLong || isEmpty}
              errorMessage={
                isEmpty
                  ? "相手デッキの表記を入力してください"
                  : `${MAX_OPPONENTS_DECK_INFO_LENGTH}文字以内で入力してください`
              }
            />
          </div>
          <p className="text-tiny text-default-400">
            アイコン枠をタップするとポケモンを選べます
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {suggestions.length > 0 && (
          <>
            <div className="text-tiny text-default-500">作成済みの相手のデッキに揃える</div>
            <HScrollRow className="flex gap-2 pb-1">
              {suggestions.map((s) => {
                const [s1, s2] = spritesOf(s);
                const isSelected = opponentDeckKey(s) === toKey;
                return (
                  <button
                    key={opponentDeckKey(s)}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setDeckInfo(s.opponents_deck_info);
                      setTyped("");
                      setSprite1(s1);
                      setSprite2(s2);
                      setIsConfirming(false);
                    }}
                    className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-default-200 bg-default-50 active:bg-default-100"
                    }`}
                  >
                    <span className="flex h-9 w-full items-end justify-center">
                      <PokemonSprite id={s1?.id} size={36} />
                      <PokemonSprite id={s2?.id} size={36} />
                    </span>
                    <DeckName
                      text={s.opponents_deck_info}
                      className="w-full text-center text-[0.625rem] leading-snug"
                    />
                    <span className="text-[0.625rem] text-default-500">{s.count}戦</span>
                  </button>
                );
              })}
            </HScrollRow>
          </>
        )}
      </div>

      {isConfirming ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning-300 bg-warning-50 px-3 py-3">
          <div className="text-small font-bold">この内容で変更しますか？</div>
          {/* 変更前 → 変更後。既にある組み合わせへまとめるときは、変更後の対戦数がいくつになるかも出す */}
          <div className="flex items-center gap-1.5">
            <DeckSummary
              sprite1={fromSprite1}
              sprite2={fromSprite2}
              name={deck.opponents_deck_info}
              note={`${deck.count}戦`}
            />
            <LuArrowRight className="shrink-0 text-xl text-primary" aria-label="から" />
            <DeckSummary
              sprite1={sprite1}
              sprite2={sprite2}
              name={to.opponents_deck_info}
              note={
                mergeTarget
                  ? `${mergeTarget.count}戦 → ${mergeTarget.count + deck.count}戦`
                  : `${deck.count}戦`
              }
              emphasized
            />
          </div>
          <p className="text-small">
            {deck.count}戦の相手デッキを「{to.opponents_deck_info}」に変更します。
            {mergeTarget && (
              <>
                すでにある「{mergeTarget.opponents_deck_info}」の{mergeTarget.count}
                戦とまとめて数えられるようになります。
              </>
            )}
          </p>
          <p className="text-tiny text-default-600">
            変更すると元の表記・アイコンの対戦とは見分けが付かなくなるため、まとめて元に戻すことはできません。
          </p>
          <div className="flex gap-2">
            <Button
              variant="flat"
              className="flex-1"
              isDisabled={isSubmitting}
              onPress={() => setIsConfirming(false)}
            >
              やめる
            </Button>
            <Button
              color="primary"
              className="flex-1"
              isLoading={isSubmitting}
              onPress={submit}
            >
              変更する
            </Button>
          </div>
        </div>
      ) : (
        <Button
          color="primary"
          isDisabled={!canSubmit}
          onPress={() => setIsConfirming(true)}
        >
          {deck.count}戦をまとめて変更
        </Button>
      )}

      <PokemonSpriteModal
        pokemonSprite1={sprite1}
        setPokemonSprite1={(value) => {
          setSprite1(value);
          setIsConfirming(false);
        }}
        pokemonSprite2={sprite2}
        setPokemonSprite2={(value) => {
          setSprite2(value);
          setIsConfirming(false);
        }}
        isOpen={isSpriteModalOpen}
        onOpenChange={onSpriteModalOpenChange}
        initialActiveSlot={activeSlot}
      />
    </div>
  );
}

export default function OpponentDecks() {
  const { mutate: mutateGlobal } = useSWRConfig();

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<OpponentDecksGetResponseType>(OPPONENT_DECKS_URL, fetchOpponentDecks, {
      revalidateOnFocus: false,
    });

  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<OpponentDeckOrder>("count");
  const [editing, setEditingState] = useState<OpponentDeckType | null>(null);

  // 一覧と編集を切り替えたら先頭から見せる(一覧の下の方で選ぶと、編集画面が途中から始まるため)
  function setEditing(deck: OpponentDeckType | null) {
    setEditingState(deck);
    window.scrollTo({ top: 0 });
  }

  const decks = useMemo(() => data?.data ?? [], [data]);
  const shown = useMemo(
    () => sortOpponentDecks(filterOpponentDecks(decks, query), order),
    [decks, query, order],
  );

  async function handleReplaced(updatedCount: number) {
    // 一覧を開いたあとに別の画面・端末で対戦を直していると、変更前の組み合わせがもう無く 0 件になる。
    // 「0戦を変更しました」と成功に見せず、一覧を取り直して最新の状態から選び直してもらう
    addToast(
      updatedCount > 0
        ? {
            title: "相手デッキを変更しました",
            description: `${updatedCount}戦の相手デッキを変更しました`,
            color: "success",
            timeout: 3000,
          }
        : {
            title: "変更する対戦が見つかりませんでした",
            description: "すでに変更されている可能性があります。一覧を更新しました",
            color: "warning",
            timeout: 5000,
          },
    );
    setEditing(null);
    await mutate();
    // 対戦結果の入力フォームの候補にも、変更後の表記を出す
    void mutateGlobal(
      (key) =>
        typeof key === "string" &&
        key.startsWith("/api/matches/opponent_deck_candidates"),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-4 pb-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-black leading-none tracking-tight text-foreground">
          相手デッキの一括編集
        </h1>
        <p className="text-xs leading-relaxed text-default-400">
          同じ表記・アイコンの対戦をまとめて変更できます。表記ゆれ（例：「ドラパ」と「ドラパルトex」）を揃えると、対戦相手のデッキ分析で同じデッキとして数えられます。
        </p>
      </div>

      {editing ? (
        <EditOpponentDeck
          key={opponentDeckKey(editing)}
          deck={editing}
          decks={decks}
          onBack={() => setEditing(null)}
          onReplaced={handleReplaced}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              aria-label="相手デッキを検索"
              value={query}
              onValueChange={setQuery}
              placeholder="表記で検索"
              startContent={<CgSearch className="shrink-0 text-lg text-default-400" />}
              isClearable
              onClear={() => setQuery("")}
              classNames={{ input: "text-base" }}
            />
            <Tabs
              aria-label="並び順"
              size="sm"
              selectedKey={order}
              onSelectionChange={(key) => setOrder(key as OpponentDeckOrder)}
              classNames={{ base: "shrink-0" }}
            >
              <Tab key="count" title="件数順" />
              <Tab key="name" title="名前順" />
            </Tabs>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <FetchError
              message="相手デッキの一覧を取得できませんでした"
              onRetry={() => void mutate()}
              isRetrying={isValidating}
              compact
            />
          ) : decks.length === 0 ? (
            <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
              相手デッキを入力した対戦がまだありません
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
              「{query.trim()}」を含む相手デッキはありません
            </div>
          ) : (
            <>
              <div className="px-1 text-tiny text-default-500">
                {shown.length}種類・タップして変更
              </div>
              <ul className="px-1">
                {shown.map((deck) => (
                  <OpponentDeckRow
                    key={opponentDeckKey(deck)}
                    deck={deck}
                    onSelect={setEditing}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
