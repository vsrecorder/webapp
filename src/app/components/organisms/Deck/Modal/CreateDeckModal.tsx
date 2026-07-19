"use client";

import { useEffect, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Image, Button } from "@heroui/react";
import { Input } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { Link } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { useDisclosure } from "@heroui/react";

import { LuLayers } from "react-icons/lu";

import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckCreateRequestType } from "@app/types/deck";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

const DECK_CODE_LENGTH = 20;
const DECK_CODE_CHECK_DEBOUNCE_MS = 500;

type Props = {
  deck_code: string;
  isOpen: boolean;
  onOpenChange: () => void;
  onCreated: () => void;
};

export default function CreateDeckModal({
  deck_code,
  isOpen,
  onOpenChange,
  onCreated,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deckname, setDeckName] = useState<string>("");
  const [deckcode, setDeckCode] = useState<string>(deck_code);
  //const [isSelectedPrivateCode, setIsSelectedPrivateCode] = useState<boolean>(false);
  const [isValidatedDeckCode, setIsValidatedDeckCode] = useState<boolean>(true);
  const [isInvalid, setIsInvalid] = useState<boolean>(true);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const [sprite1, setSprite1] = useState<PokemonSpriteType | null>(null);
  const [sprite2, setSprite2] = useState<PokemonSpriteType | null>(null);
  const [activeSpriteSlot, setActiveSpriteSlot] = useState<1 | 2>(1);

  const {
    isOpen: isSpriteOpen,
    onOpen: onSpriteOpen,
    onOpenChange: onSpriteOpenChange,
  } = useDisclosure();

  /*
    入力項目のチェック
    - デッキ名
    - デッキコード
      - 有効なデッキコードかどうか
  */
  useEffect(() => {
    if (deckname != "" && isValidatedDeckCode) {
      setIsInvalid(false);
    } else {
      setIsInvalid(true);
    }
  }, [deckname, isValidatedDeckCode]);

  /*
    デッキコードが有効かどうかチェック
  */
  useEffect(() => {
    if (!deckcode) {
      setIsValidatedDeckCode(true);
      return;
    }

    // デッキコードは必ず20桁なので、桁数が違う時点で問い合わせるまでもなく無効
    if (deckcode.length !== DECK_CODE_LENGTH) {
      setIsValidatedDeckCode(false);
      return;
    }

    let cancelled = false;

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        if (!cancelled) {
          setIsValidatedDeckCode(data.result === 1);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setIsValidatedDeckCode(false);
        }
      }
    };

    // 入力が落ち着くまで外部APIへの問い合わせを遅らせる
    const timerId = setTimeout(checkDeckCode, DECK_CODE_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [deckcode]);

  const resetState = () => {
    setIsDisabled(false);
    setIsValidatedDeckCode(true);
    setDeckName("");
    setDeckCode(deck_code);
    setSprite1(null);
    setSprite2(null);
    //setIsSelectedPrivateCode(false);
  };

  const createDeck = async (onClose: () => void) => {
    // position(1/2)を必ず付与してスロットを固定する(空スロットを詰めない)
    const pokemon_sprites: DeckPokemonSpriteType[] = [];
    if (sprite1) pokemon_sprites.push({ id: sprite1.id, position: 1 });
    if (sprite2) pokemon_sprites.push({ id: sprite2.id, position: 2 });

    const deck: DeckCreateRequestType = {
      name: deckname,
      private_flg: true,
      deck_code: deckcode,
      private_deck_code_flg: true,
      //private_deck_code_flg: isSelectedPrivateCode,
      pokemon_sprites,
    };

    setIsDisabled(true);

    const toastId = addToast({
      title: "マイデッキ登録中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "マイデッキ登録が完了",
        description: "マイデッキに登録しました",
        color: "success",
        timeout: 3000,
      });

      triggerNotificationsRefresh();

      onCreated();
      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "マイデッキ登録に失敗",
        description: (
          <>
            マイデッキへの登録に失敗しました
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
        isOpen={isOpen}
        size="sm"
        placement="center"
        // キーボード表示などで可視領域より背が高くなったとき、モーダル全体が画面から
        // はみ出さないよう base に最大高を与え、はみ出す分は body 内スクロールにする
        scrollBehavior="inside"
        isDismissable={false}
        // 登録処理中(isDisabled)はESC・閉じるボタン・onOpenChange経由での
        // クローズをすべて無効化し、処理中にモーダルが閉じないようにする
        isKeyboardDismissDisabled={isDisabled}
        hideCloseButton={isDisabled}
        onOpenChange={() => {
          if (isDisabled) return;
          onOpenChange();
        }}
        onClose={resetState}
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
              <ModalHeader className="text-lg px-3">マイデッキ登録</ModalHeader>
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
                          size={48}
                          className={isDisabled ? "contrast-0" : ""}
                        />
                      </div>
                    );
                  })}
                </div>

                <Input
                  isRequired
                  isDisabled={isDisabled}
                  type="text"
                  label="デッキ名"
                  labelPlacement="outside"
                  placeholder="デッキ名を入力"
                  value={deckname}
                  onChange={(e) => setDeckName(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                />

                <Input
                  isDisabled={isDisabled}
                  isInvalid={!isValidatedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="デッキコードを入力"
                  value={deckcode}
                  onChange={(e) => setDeckCode(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                />

                {/*
                <Checkbox
                  isDisabled={deckcode == ""}
                  //isDisabled={deckcode == "" || !isValidatedDeckCode}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelectedPrivateCode}
                  onValueChange={setIsSelectedPrivateCode}
                >
                  デッキコードを非公開にする
                </Checkbox>
                */}

                {deckcode ? (
                  <div className="relative w-full aspect-2/1">
                    {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                    <Image
                      radius="sm"
                      shadow="none"
                      alt={deckcode}
                      src={
                        isValidatedDeckCode
                          ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckcode}.png`
                          : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                      }
                      className=""
                      onLoad={() => setImageLoaded(true)}
                      onError={() => {}}
                    />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <LuLayers className="text-xl text-primary" />
                    </div>
                    <div className="font-bold text-tiny text-primary">
                      デッキコードは後からでも登録できます
                    </div>
                    <div className="text-tiny text-default-400 text-center">
                      デッキコードを入力すると、
                      <br />
                      最初のバージョンとして登録されます。
                    </div>
                  </div>
                )}

                <div className="-translate-y-2">
                  <Link
                    isExternal
                    showAnchorIcon
                    underline="always"
                    href="https://www.pokemon-card.com/deck/"
                    className="text-xs"
                  >
                    <span>トレーナーズウェブサイトでデッキを構築する</span>
                  </Link>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isDisabled}
                  onPress={() => {
                    onClose();
                  }}
                  className="font-bold"
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={!isValidatedDeckCode || isInvalid || isDisabled}
                  onPress={() => {
                    createDeck(onClose);
                  }}
                  className="font-bold"
                >
                  登録
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
