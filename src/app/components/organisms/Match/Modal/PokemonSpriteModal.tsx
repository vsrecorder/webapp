"use client";

import { useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { Button } from "@heroui/react";

import SpritePickerPanel from "@app/components/molecules/SpritePickerPanel";
import type { SpriteSlot } from "@app/components/molecules/SpritePickerPanel";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

// ポケモンのアイコン(スプライト)を2体まで選ぶモーダル。
// 中身はきずな試算のQ0と同じ SpritePickerPanel を使う(枠をタップで切り替え、
// 検索または一覧から選ぶ)。ここでは 決定 を押すまで呼び出し側へ反映しないよう、
// パネルの選択を下書き(draft)として持つ。

type Props = {
  pokemonSprite1: PokemonSpriteType | null;
  setPokemonSprite1: Dispatch<SetStateAction<PokemonSpriteType | null>>;
  pokemonSprite2: PokemonSpriteType | null;
  setPokemonSprite2: Dispatch<SetStateAction<PokemonSpriteType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  // モーダルを開いた直後にどちらの枠を選択対象にするか(タップしたアイコン側)
  initialActiveSlot?: SpriteSlot;
};

export default function PokemonSpriteModal({
  pokemonSprite1,
  setPokemonSprite1,
  pokemonSprite2,
  setPokemonSprite2,
  isOpen,
  onOpenChange,
  initialActiveSlot = 1,
}: Props) {
  const [draft1, setDraft1] = useState<PokemonSpriteType | null>(null);
  const [draft2, setDraft2] = useState<PokemonSpriteType | null>(null);

  // モーダルを開いた瞬間に、外部の選択状態(1枚目/2枚目)を下書きへ取り込む
  useEffect(() => {
    if (!isOpen) return;

    setDraft1(pokemonSprite1);
    setDraft2(pokemonSprite2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (slot: SpriteSlot, sprite: PokemonSpriteType | null) => {
    if (slot === 1) setDraft1(sprite);
    else setDraft2(sprite);
  };

  // どちらの枠も変更がなければ決定ボタンを押させない(誤って無操作のまま確定させない)
  const isUnchanged =
    (draft1?.id ?? null) === (pokemonSprite1?.id ?? null) &&
    (draft2?.id ?? null) === (pokemonSprite2?.id ?? null);

  return (
    <Modal
      size="sm"
      placement="center"
      scrollBehavior="inside"
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={onOpenChange}
      /*
       * --visual-viewport-height は HeroUI が wrapper に付ける「実際に見えている高さ」。
       * iOS はキーボードが出てもレイアウトビューポート(= 100dvh)を縮めないため、
       * 100dvh 基準だと検索キーボードを出したときにモーダルの下端が裏に隠れる。
       * min() で可視領域を上限にし、はみ出す分は本文側をスクロールさせる。
       */
      className="max-h-[min(calc(100dvh-2rem),var(--visual-viewport-height,100dvh))]"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex-col items-start gap-0.5">
              <span>ポケモンのアイコンを選択</span>
              <span className="text-tiny font-normal text-default-400">
                下の2枠をタップで切り替えて、それぞれのアイコンを選べます
              </span>
            </ModalHeader>
            <ModalBody className="px-4">
              <SpritePickerPanel
                sprite1={draft1}
                sprite2={draft2}
                onSelect={handleSelect}
                accent="primary"
                initialActiveSlot={initialActiveSlot}
                slot1Hint="1枚目"
                slot2Hint="2枚目（任意）"
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={() => {
                  onClose();
                }}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={isUnchanged}
                onPress={() => {
                  setPokemonSprite1(draft1);
                  setPokemonSprite2(draft2);
                  onClose();
                }}
                className="font-bold"
              >
                決定
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
