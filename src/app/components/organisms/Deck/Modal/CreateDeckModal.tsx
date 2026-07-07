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

import PokemonSpriteModal from "@app/components/organisms/Match/Modal/PokemonSpriteModal";

import { PokemonSpriteType, DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckCreateRequestType } from "@app/types/deck";
import { spriteScaleClass } from "@app/utils/sprite";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

const UNKNOWN_SPRITE_URL =
  "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png";

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

  const {
    isOpen: isSprite1Open,
    onOpen: onSprite1Open,
    onOpenChange: onSprite1OpenChange,
  } = useDisclosure();

  const {
    isOpen: isSprite2Open,
    onOpen: onSprite2Open,
    onOpenChange: onSprite2OpenChange,
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

    let cancelled = false;

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
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

    checkDeckCode();

    return () => {
      cancelled = true;
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
    const pokemon_sprites: DeckPokemonSpriteType[] = [];
    if (sprite1) pokemon_sprites.push({ id: sprite1.id });
    if (sprite2) pokemon_sprites.push({ id: sprite2.id });

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
        onOpenChange={onOpenChange}
        isDismissable={false}
        onClose={resetState}
        classNames={{
          base: "sm:max-w-full",
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
                  <div className="w-11 h-11 p-0 shrink-0">
                    <Image
                      onClick={() => !isDisabled && onSprite1Open()}
                      alt={sprite1 ? sprite1.name : "アイコン1"}
                      src={sprite1 ? sprite1.image_url : UNKNOWN_SPRITE_URL}
                      radius="none"
                      loading="eager"
                      className={`w-full h-full object-contain ${spriteScaleClass(sprite1?.id)} origin-bottom ${isDisabled ? "contrast-0" : "cursor-pointer"}`}
                    />
                  </div>
                  <div className="w-11 h-11 p-0 shrink-0">
                    <Image
                      onClick={() => !isDisabled && onSprite2Open()}
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
                  type="text"
                  label="デッキ名"
                  labelPlacement="outside"
                  placeholder="デッキ名を入力"
                  value={deckname}
                  onChange={(e) => setDeckName(e.target.value)}
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

                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={deckcode ? deckcode : "デッキコードなし"}
                    src={
                      isValidatedDeckCode && deckcode
                        ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckcode}.png`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className=""
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {}}
                  />
                </div>

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
        pokemonSprite={sprite1}
        setPokemonSprite={setSprite1}
        isOpen={isSprite1Open}
        onOpenChange={onSprite1OpenChange}
      />

      <PokemonSpriteModal
        pokemonSprite={sprite2}
        setPokemonSprite={setSprite2}
        isOpen={isSprite2Open}
        onOpenChange={onSprite2OpenChange}
      />
    </>
  );
}
