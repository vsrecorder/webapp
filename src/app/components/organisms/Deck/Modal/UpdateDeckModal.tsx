import useSWR from "swr";

import { useEffect, useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import PokemonSprite from "@app/components/atoms/PokemonSprite";

import {
  DeckUpdateRequestType,
  DeckGetByIdResponseType,
  DeckUpdateResponseType,
} from "@app/types/deck";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

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
        // キーボード表示などで可視領域より背が高くなったとき、モーダル全体が画面から
        // はみ出さないよう base に最大高を与え、はみ出す分は body 内スクロールにする
        scrollBehavior="inside"
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
          // scrollBehavior="inside" 既定の max-h(100%-8rem) は特にキーボード表示中に
          // 窮屈なため、余白を 3rem まで縮めてモーダルを大きく使う
          base: "sm:max-w-full max-h-[calc(100%-3rem)]",
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
                  {([1, 2] as const).map((slot) => {
                    const sprite = slot === 1 ? sprite1 : sprite2;
                    return (
                      <div
                        key={slot}
                        className={`shrink-0 ${isDisabled ? "" : "cursor-pointer"}`}
                        onClick={() => {
                          if (isDisabled) return;
                          setActiveSpriteSlot(slot);
                          onSpriteOpen();
                        }}
                      >
                        <PokemonSprite
                          id={sprite?.id}
                          size={44}
                          className={isDisabled ? "contrast-0" : ""}
                        />
                      </div>
                    );
                  })}
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
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
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
