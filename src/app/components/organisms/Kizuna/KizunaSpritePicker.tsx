"use client";

import { useMemo, useRef, useState } from "react";

import useSWR from "swr";

import { Input } from "@heroui/react";

import { CgSearch } from "react-icons/cg";
import { LuX } from "react-icons/lu";

import { katakanaToHiragana } from "@app/utils/kana";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";
import PokemonSprite from "@app/components/atoms/PokemonSprite";

// 一度に描画する候補数の上限。全件（1000体超）を並べると描画が重く、
// 目的のポケモンも見つけにくいため、この件数を超える分は検索で辿らせる。
const MAX_VISIBLE = 24;

export type SpriteSlot = 1 | 2;

async function fetcher(url: string): Promise<PokemonSpriteType[]> {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

  // 失敗レスポンスのボディをそのまま返すと、配列前提の絞り込み（filter）がレンダー中に
  // 例外になりページ全体が落ちる。取得できなかったことはSWRのerrorとして扱う。
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

type Props = {
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
  onSelect: (slot: SpriteSlot, sprite: PokemonSpriteType | null) => void;
};

/*
 * きずな試算のQ0で使うポケモン選択。
 * 対戦記録のポケモンアイコン（PokemonSpriteModal）と同じく2枠を持ち、
 * 枠をタップで切り替えて、それぞれにポケモンを割り当てる。
 * 1体目は必須、2体目は任意（1体だけが主役のデッキもあるため）。
 */
export default function KizunaSpritePicker({ sprite1, sprite2, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [activeSlot, setActiveSlot] = useState<SpriteSlot>(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // /api/pokemon-sprites は認証不要のため、非会員向けの本ページからも取得できる。
  const { data, error, isLoading } = useSWR<PokemonSpriteType[], Error>(
    "/api/pokemon-sprites",
    fetcher,
  );

  const isSearching = query.trim().length > 0;

  // 絞り込み結果（上限なし）。表示は MAX_VISIBLE 件までに切る。
  const matched = useMemo(() => {
    if (!data) return [];
    if (!isSearching) return data;

    const q = katakanaToHiragana(query.trim());
    return data.filter((sprite) => katakanaToHiragana(sprite.name).includes(q));
  }, [data, query, isSearching]);

  const candidates = matched.slice(0, MAX_VISIBLE);
  const hasMore = matched.length > MAX_VISIBLE;

  const slots: { slot: SpriteSlot; sprite: PokemonSpriteType | null; hint: string }[] = [
    { slot: 1, sprite: sprite1, hint: "1体目" },
    { slot: 2, sprite: sprite2, hint: "2体目（任意）" },
  ];

  const handlePick = (sprite: PokemonSpriteType) => {
    onSelect(activeSlot, sprite);

    // 選んだら検索語を消し、次の1体を最初から探せる状態に戻す
    setQuery("");

    // 1体目を選んだら、2体目が空ならそのまま続けて選べるようにする
    // （対戦記録のアイコン選択と同じ挙動）
    if (activeSlot === 1 && !sprite2) setActiveSlot(2);
  };

  const spriteButtonClass = (sprite: PokemonSpriteType) => {
    const isSelected = sprite1?.id === sprite.id || sprite2?.id === sprite.id;

    return `flex w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${
      isSelected
        ? "border-amber-500 bg-amber-500/10"
        : "border-default-200 hover:border-amber-400 hover:bg-amber-500/5"
    }`;
  };

  const spriteButtonContent = (sprite: PokemonSpriteType) => (
    <>
      <PokemonSprite id={sprite.id} size={40} />
      <span className="w-full truncate px-0.5 text-center text-[10px] leading-tight text-default-500">
        {sprite.name}
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 選択中の2枠。タップで入力先を切り替える */}
      <div className="flex items-stretch gap-3">
        {slots.map(({ slot, sprite, hint }) => {
          const isActive = activeSlot === slot;

          return (
            // min-w-0: flex の子は既定で min-width:auto となり、中身（長いポケモン名）より
            // 小さくなれない。指定しないと truncate が効かず、枠がページ幅を押し広げる。
            <div key={slot} className="relative min-w-0 flex-1">
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={`${hint}のポケモンを選ぶ`}
                onClick={() => setActiveSlot(slot)}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 transition-colors ${
                  isActive
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-default-200 hover:border-amber-400"
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center">
                  {sprite ? (
                    <PokemonSprite id={sprite.id} size={56} />
                  ) : (
                    <span className="text-tiny text-default-400">未選択</span>
                  )}
                </span>
                <span className="w-full truncate text-center text-xs font-bold">
                  {sprite ? sprite.name : hint}
                </span>
              </button>

              {sprite && (
                <button
                  type="button"
                  aria-label={`${hint}の選択を解除`}
                  onClick={() => onSelect(slot, null)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-default-200 bg-content1 text-default-500 transition-colors hover:text-danger"
                >
                  <LuX className="text-sm" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* classNames.input の text-base(16px) は必須。
          iOS Safari はフォントサイズが16px未満の入力欄にフォーカスすると
          自動でページを拡大してしまうため、16px以上にして拡大を防ぐ。 */}
      <Input
        ref={searchInputRef}
        value={query}
        onValueChange={setQuery}
        placeholder="ポケモンの名前を入力（ひらがなでも検索できます）"
        startContent={<CgSearch className="shrink-0 text-lg text-default-400" />}
        isClearable
        onClear={() => setQuery("")}
        aria-label="ポケモンを検索"
        classNames={{ input: "text-base" }}
      />

      {error ? (
        <p className="py-4 text-center text-sm text-danger">
          ポケモンの取得に失敗しました。時間をおいて再度お試しください。
        </p>
      ) : isLoading ? (
        <p className="py-4 text-center text-sm text-default-500">読み込んでいます...</p>
      ) : candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-default-500">
          「{query}」に一致するポケモンはいませんでした。
        </p>
      ) : isSearching ? (
        // 検索中は結果を一覧で見せる
        <div className="flex flex-col gap-2">
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {candidates.map((sprite) => (
              <li key={sprite.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={sprite1?.id === sprite.id || sprite2?.id === sprite.id}
                  onClick={() => handlePick(sprite)}
                  className={spriteButtonClass(sprite)}
                >
                  {spriteButtonContent(sprite)}
                </button>
              </li>
            ))}
          </ul>

          {hasMore && (
            <p className="text-center text-xs text-default-500">
              ほかにも{matched.length - MAX_VISIBLE}体が該当します。名前をもう少し入れて絞り込んでください。
            </p>
          )}
        </div>
      ) : (
        // 未検索のときは1列だけ。横スクロールで24体まで辿れる。
        <div className="flex flex-col gap-2">
          <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {candidates.map((sprite) => (
              <li key={sprite.id} className="w-20 shrink-0 snap-start">
                <button
                  type="button"
                  aria-pressed={sprite1?.id === sprite.id || sprite2?.id === sprite.id}
                  onClick={() => handlePick(sprite)}
                  className={spriteButtonClass(sprite)}
                >
                  {spriteButtonContent(sprite)}
                </button>
              </li>
            ))}

            {/* 24体の先は検索でしか辿れないことを、列の終端で明示する */}
            {hasMore && (
              <li className="w-24 shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => searchInputRef.current?.focus()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-default-300 px-2 py-2 text-default-500 transition-colors hover:border-amber-400 hover:text-amber-500"
                >
                  <CgSearch className="text-xl" />
                  <span className="text-[10px] leading-tight">
                    ほか{matched.length - MAX_VISIBLE}体は
                    <br />
                    検索から
                  </span>
                </button>
              </li>
            )}
          </ul>

          <p className="text-center text-xs text-default-500">
            横にスクロールして選べます。ほかのポケモンは検索から探してください。
          </p>
        </div>
      )}
    </div>
  );
}
