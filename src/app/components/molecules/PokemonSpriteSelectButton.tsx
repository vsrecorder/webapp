"use client";

import { LuPlus } from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

export type SpriteSlot = 1 | 2;

// ポケモンのアイコン(スプライト)選択モーダルを開くためのトリガー。
//
// 以前は未選択時に unknown(モンスターボール)のスプライトをそのまま並べていたが、
// 「ただの飾り」に見えてタップできることが伝わらず、アイコン選択が使われない
// 原因になっていた。そこで空き枠は破線 + ＋ の「入力できる枠」として見せ、
// 未選択のときも枠を2つ並べて2体まで選べることが分かるようにしている。
// どちらも未選択のときだけ外枠をプライマリ色で強調し、入口として目立たせる。
// (2枠とも埋まっている状態は、スプライトの絵を隠さないようバッジ類を重ねない)
//
// 未選択/選択済みで枠のサイズが変わらないよう、外枠は固定サイズにしている。

const SPRITE_SIZE = 44;

type Props = {
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
  /** 枠をタップしたときに呼ばれる。slot は選択対象にする枠(1枚目/2枚目) */
  onOpen: (slot: SpriteSlot) => void;
  isDisabled?: boolean;
  /** スクリーンリーダー向けの名称。既定「ポケモンのアイコン」 */
  label?: string;
  className?: string;
};

export default function PokemonSpriteSelectButton({
  sprite1,
  sprite2,
  onOpen,
  isDisabled = false,
  label = "ポケモンのアイコン",
  className = "",
}: Props) {
  const isEmpty = !sprite1 && !sprite2;

  const frameStateClass = isDisabled
    ? "border-default-300 bg-default-100 opacity-40"
    : isEmpty
      ? "border-primary/50 bg-primary/5"
      : "border-default-300 bg-default-50";

  return (
    <div
      // 外枠のサイズ: スプライト2枚 + 内側の余白 + 枠線
      className={`relative shrink-0 w-25 h-14 rounded-xl border-2 flex items-center ${frameStateClass} ${className}`}
    >
      {([1, 2] as const).map((slot) => {
        const sprite = slot === 1 ? sprite1 : sprite2;

        return (
          <button
            key={slot}
            type="button"
            disabled={isDisabled}
            aria-label={
              sprite
                ? `${label}${slot}枚目(${sprite.name})を変更する`
                : `${label}${slot}枚目を選ぶ`
            }
            onClick={() => onOpen(slot)}
            className="flex h-full w-1/2 items-center justify-center"
          >
            {sprite ? (
              <PokemonSprite id={sprite.id} size={SPRITE_SIZE} />
            ) : (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg border border-dashed ${
                  isDisabled
                    ? "border-default-400 text-default-400"
                    : "border-primary/50 text-primary"
                }`}
              >
                <LuPlus className="text-sm" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
