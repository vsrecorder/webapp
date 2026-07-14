import useSWR from "swr";

import { useEffect, useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Image } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { spriteScaleClass } from "@app/utils/sprite";

import {
  DeckUpdateRequestType,
  DeckGetByIdResponseType,
  DeckUpdateResponseType,
} from "@app/types/deck";

const UNKNOWN_SPRITE_URL =
  "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png";

async function fetcherForPokemonSprites(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  // 失敗レスポンスのボディをそのまま返すと、配列前提のfind/mapが例外になりページ全体が落ちる
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: PokemonSpriteType[] = await res.json();

  return ret;
}

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateDeckModal({ deck, setDeck, isOpen, onOpenChange }: Props) {
  const [newDeckName, setNewDeckName] = useState<string>("");
  /*
  const [isSelectedPrivate, setIsSelectedPrivate] = useState<boolean>(
    deck ? deck.private_flg : false,
  );
  */
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(null);
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(null);
  const [activeSpriteSlot, setActiveSpriteSlot] = useState<1 | 2>(1);

  const {
    isOpen: isSpriteOpen,
    onOpen: onSpriteOpen,
    onOpenChange: onSpriteOpenChange,
  } = useDisclosure();

  // ポケモンのアイコン一覧を取得（初期スプライトの解決に使用）
  const { data: pokemonSpritesData } = useSWR<PokemonSpriteType[], Error>(
    "/api/pokemon-sprites",
    fetcherForPokemonSprites,
  );

  // デッキに設定済みのアイコンを初期値として反映
  useEffect(() => {
    if (!deck?.pokemon_sprites?.[0] || !pokemonSpritesData) return;

    const matched1 = pokemonSpritesData.find((s) => s.id === deck.pokemon_sprites[0].id);
    if (matched1) {
      setSprite1(matched1);
    }

    if (deck?.pokemon_sprites?.[1]) {
      const matched2 = pokemonSpritesData.find(
        (s) => s.id === deck.pokemon_sprites[1].id,
      );
      if (matched2) {
        setSprite2(matched2);
      }
    }
  }, [deck, pokemonSpritesData]);

  useEffect(() => {
    if (deck) {
      setNewDeckName(deck.name);
    }
  }, [deck]);

  if (!deck) {
    return;
  }

  const hasChanges =
    newDeckName !== deck.name ||
    (sprite1?.id ?? null) !== (deck.pokemon_sprites?.[0]?.id ?? null) ||
    (sprite2?.id ?? null) !== (deck.pokemon_sprites?.[1]?.id ?? null);

  const resetToDefaults = () => {
    setNewDeckName(deck.name);
    setSprite1(
      pokemonSpritesData?.find((s) => s.id === deck.pokemon_sprites?.[0]?.id) ?? null,
    );
    setSprite2(
      pokemonSpritesData?.find((s) => s.id === deck.pokemon_sprites?.[1]?.id) ?? null,
    );
  };

  const updateDeck = async (onClose: () => void) => {
    const pokemon_sprites: DeckPokemonSpriteType[] = [];

    if (sprite1) {
      pokemon_sprites.push({
        id: sprite1.id,
      });
    }

    if (sprite2) {
      pokemon_sprites.push({
        id: sprite2.id,
      });
    }

    const data: DeckUpdateRequestType = {
      name: newDeckName,
      private_flg: true,
      //private_flg: isSelectedPrivate,
      pokemon_sprites: pokemon_sprites,
    };

    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキ情報を更新中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck.id}/`, {
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

      const ret: DeckUpdateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ情報の更新が完了",
        description: "デッキ情報を更新しました",
        color: "success",
        timeout: 3000,
      });

      setDeck({
        ...ret,
        name: newDeckName,
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
        title: "デッキ情報の更新に失敗",
        description: (
          <>
            デッキ情報の更新に失敗しました
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

  return (
    <>
      <Modal
        size={"sm"}
        placement="center"
        isOpen={isOpen}
        isDismissable={false}
        // 処理中(isDisabled)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
        isKeyboardDismissDisabled={isDisabled}
        hideCloseButton={isDisabled}
        onOpenChange={() => {
          if (isDisabled) return;
          onOpenChange();
        }}
        onClose={() => {
          setIsDisabled(false);
          resetToDefaults();
        }}
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg px-3">デッキ情報を更新</ModalHeader>
              <ModalBody className="px-3 py-1 gap-3">
                {/* スプライト2枚 */}
                <div className="flex items-center gap-0">
                  <div className="w-11 h-11 p-0 shrink-0">
                    <Image
                      onClick={() => {
                        if (isDisabled) return;
                        setActiveSpriteSlot(1);
                        onSpriteOpen();
                      }}
                      alt={sprite1 ? sprite1.name : "アイコン1"}
                      src={sprite1 ? sprite1.image_url : UNKNOWN_SPRITE_URL}
                      radius="none"
                      loading="eager"
                      className={`w-full h-full object-contain ${spriteScaleClass(sprite1?.id)} origin-bottom ${isDisabled ? "contrast-0" : "cursor-pointer"}`}
                    />
                  </div>
                  <div className="w-11 h-11 p-0 shrink-0">
                    <Image
                      onClick={() => {
                        if (isDisabled) return;
                        setActiveSpriteSlot(2);
                        onSpriteOpen();
                      }}
                      alt={sprite2 ? sprite2.name : "アイコン2"}
                      src={sprite2 ? sprite2.image_url : UNKNOWN_SPRITE_URL}
                      radius="none"
                      loading="eager"
                      className={`w-full h-full object-contain ${spriteScaleClass(sprite2?.id)} origin-bottom ${isDisabled ? "contrast-0" : "cursor-pointer"}`}
                    />
                  </div>
                </div>

                <Input
                  isRequired
                  isDisabled={isDisabled}
                  //isInvalid={!isValidedDeckName}
                  //errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキ名"
                  labelPlacement="outside"
                  placeholder={deck.name}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                />

                {/*
                <Checkbox
                  isDisabled={isDisabled}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelectedPrivate}
                  onValueChange={setIsSelectedPrivate}
                >
                  デッキ情報を非公開にする
                </Checkbox>
                */}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isDisabled}
                  onPress={() => {
                    resetToDefaults();
                    onClose();
                  }}
                  className="font-bold"
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={!hasChanges || isDisabled}
                  onPress={() => {
                    updateDeck(onClose);
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

      <PokemonSpriteModal
        pokemonSprite1={sprite1}
        setPokemonSprite1={setSprite1}
        pokemonSprite2={sprite2}
        setPokemonSprite2={setSprite2}
        isOpen={isSpriteOpen}
        onOpenChange={onSpriteOpenChange}
        initialActiveSlot={activeSpriteSlot}
      />
    </>
  );
}
