"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";

import useSWR from "swr";

import { useDisclosure } from "@heroui/react";

import { LuRotateCcw } from "react-icons/lu";

import DeckSprites from "@app/components/molecules/DeckSprites";
import PokemonSpriteSelectButton from "@app/components/molecules/PokemonSpriteSelectButton";
import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { DeckPokemonSpriteType, PokemonSpriteType } from "@app/types/pokemon_sprite";
import { swrFetcher } from "@app/utils/deckCodePost";
import { hasVersionSprites } from "@app/utils/deckSprite";
import { spriteImageUrl } from "@app/utils/sprite";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

/*
 * デッキのバージョン(デッキコード)に設定するスプライトの入力欄。
 * バージョンの編集モーダルと、新しいバージョンの作成モーダルで共通に使う。
 *
 * スプライトはデッキ単位に加えてバージョン単位でも設定できる。同じデッキ名のまま相棒を
 * 入れ替えたバージョンを、記録やバージョン履歴で見分けられるようにするためのもの。
 * 未設定(value が空)のバージョンはデッキのスプライトで表示される(resolveVersionSprites)ので、
 * 「いま何が表示されるか」が分かるよう、未設定のときはデッキのスプライトを添えて案内する。
 *
 * 値は id と枠(position)だけの配列で持つ(API のリクエスト・レスポンスと同じ形)。
 * アイコン選択モーダルは名前・画像つきの PokemonSpriteType を扱うので、この部品の中で変換する。
 */

type Slot = 1 | 2;

type Props = {
  // このバージョンに設定するスプライト。空なら未設定(デッキのスプライトを表示)
  value: DeckPokemonSpriteType[];
  onChange: (next: DeckPokemonSpriteType[]) => void;
  // 未設定のときに表示されるデッキのスプライト(案内に使う)
  deckSprites: DeckPokemonSpriteType[] | null | undefined;
  isDisabled?: boolean;
  // 最新バージョン(これから作るバージョンを含む)か。最新バージョンのアイコンはデッキのアイコンと
  // 常に揃えるので、設定するとデッキ一覧などのアイコンも変わることを案内する
  syncsDeck?: boolean;
};

// 枠ごとの選択から、API へ送る形(position 付き・空き枠は詰めない)へ直す。
// 1枠目が空で2枠目だけ選んだときも position:2 のまま保つ(開き直したときに枠が化けない)
function toValue(
  sprite1: PokemonSpriteType | null,
  sprite2: PokemonSpriteType | null,
): DeckPokemonSpriteType[] {
  const next: DeckPokemonSpriteType[] = [];
  if (sprite1) next.push({ id: sprite1.id, position: 1 });
  if (sprite2) next.push({ id: sprite2.id, position: 2 });
  return next;
}

export default function VersionSpriteField({
  value,
  onChange,
  deckSprites,
  isDisabled = false,
  syncsDeck = false,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<Slot>(1);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const isSet = hasVersionSprites(value);

  // 値は id と枠しか持たないため、名前(読み上げ用)はポケモンのアイコン一覧から引く。
  // 一覧はアイコン選択モーダル(SpritePickerPanel)と同じ URL なので SWR のキャッシュを共有する。
  // 未設定のあいだは引かない(選択モーダルを開いたときにパネルが自分で取る)
  const { data: spriteMaster } = useSWR<PokemonSpriteType[], Error>(
    isSet ? "/api/pokemon-sprites" : null,
    (url: string) => swrFetcher<PokemonSpriteType[]>(url),
    { revalidateOnFocus: false },
  );

  // 一覧が届く前でも絵は id から描けるので、名前だけ空のまま仮の値で出す
  const toSprite = (slot: Slot): PokemonSpriteType | null => {
    const sprite = getSpriteBySlot(value, slot);
    if (!sprite) return null;

    return (
      spriteMaster?.find((s) => s.id === sprite.id) ?? {
        id: sprite.id,
        name: "",
        image_url: spriteImageUrl(sprite.id),
      }
    );
  };

  const sprite1 = toSprite(1);
  const sprite2 = toSprite(2);

  /*
   * アイコン選択モーダルは「決定」で setPokemonSprite1 → setPokemonSprite2 を続けて呼ぶ。
   * それぞれで onChange すると、2回目が1回目の反映前の値(この描画の sprite1)を元に
   * 組み立てられ、1枠目の変更を打ち消してしまう。そこで1枠目の結果を控えておき、
   * 2枠目が届いた時点でまとめて1回だけ onChange する(undefined は「控えていない」)。
   */
  const pendingSprite1Ref = useRef<PokemonSpriteType | null | undefined>(undefined);

  const resolve = (
    action: SetStateAction<PokemonSpriteType | null>,
    current: PokemonSpriteType | null,
  ) => (typeof action === "function" ? action(current) : action);

  const setSprite1: Dispatch<SetStateAction<PokemonSpriteType | null>> = (action) => {
    pendingSprite1Ref.current = resolve(action, sprite1);
  };

  const setSprite2: Dispatch<SetStateAction<PokemonSpriteType | null>> = (action) => {
    const pending = pendingSprite1Ref.current;
    const next1 = pending !== undefined ? pending : sprite1;
    pendingSprite1Ref.current = undefined;
    onChange(toValue(next1, resolve(action, sprite2)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-medium">このバージョンのアイコン</span>
        {isSet && !isDisabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-tiny text-default-500 active:opacity-70"
          >
            <LuRotateCcw className="text-xs" />
            デッキのアイコンに戻す
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <PokemonSpriteSelectButton
          sprite1={sprite1}
          sprite2={sprite2}
          isDisabled={isDisabled}
          label="このバージョンのアイコン"
          onOpen={(slot) => {
            setActiveSlot(slot);
            onOpen();
          }}
        />

        {isSet ? (
          <p className="min-w-0 text-tiny text-default-500">
            このバージョンを使った記録や
            <br />
            バージョン履歴に表示されます
            {syncsDeck && (
              <span className="mt-0.5 block text-[0.625rem] leading-snug">
                最新バージョンなので、デッキのアイコンにもなります
              </span>
            )}
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-0.5 text-tiny text-default-500">
            {/* 補足の案内なので、隣の「現在の表示」より一段小さくして目立たせない */}
            <span className="text-[0.625rem] leading-snug">
              未設定のときはデッキのアイコンを表示します
            </span>
            {/* デッキにもアイコンが無いときは、並べても unknown が2つ出るだけなので省く */}
            {(deckSprites?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                現在の表示:
                <DeckSprites sprites={deckSprites} size={24} />
              </span>
            )}
          </div>
        )}
      </div>

      <PokemonSpriteModal
        pokemonSprite1={sprite1}
        setPokemonSprite1={setSprite1}
        pokemonSprite2={sprite2}
        setPokemonSprite2={setSprite2}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        initialActiveSlot={activeSlot}
      />
    </div>
  );
}
