"use client";

import { useEffect, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Image, Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Link } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { DeckCreateRequestType } from "@app/types/deck";

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
  const [isSelectedPrivateCode, setIsSelectedPrivateCode] = useState<boolean>(false);
  const [isValidatedDeckCode, setIsValidatedDeckCode] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(true);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  /*
    入力項目のチェック
    - デッキ名
    - デッキコード
      - 有効なデッキコードかどうか
  */
  useEffect(() => {
    if (deckname != "" && deckcode != "" && isValidatedDeckCode) {
      setIsInvalid(false);
    } else {
      setIsInvalid(true);
    }
  }, [deckname, deckcode, isValidatedDeckCode]);

  /*
    デッキコードが有効かどうかチェック
  */
  useEffect(() => {
    if (!deckcode) {
      setIsValidatedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setIsValidatedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidatedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [deckcode]);

  /*
    デッキ作成のAPIを叩く関数
    Next.jsのAPI Routesを経由してAPIを叩く
  */
  const createDeck = async (onClose: () => void) => {
    const deck: DeckCreateRequestType = {
      name: deckname,
      private_flg: false,
      deck_code: deckcode,
      private_deck_code_flg: isSelectedPrivateCode,
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
        title: "マイデッキ登録完了",
        description: "マイデッキに登録しました",
        color: "success",
        timeout: 3000,
      });

      onCreated();

      onClose();

      //setIsDisabled(false);
      //setDeckName("");
      //setDeckCode(deck_code);
      //setIsSelectedPrivateCode(false);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "マイデッキ登録失敗",
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

      //setIsDisabled(false);
      //setDeckName("");
      //setDeckCode(deck_code);
      //setIsSelectedPrivateCode(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
      isDismissable={!isDisabled}
      onClose={() => {
        setIsDisabled(false);
        setDeckName("");
        setDeckCode(deck_code);
        setIsSelectedPrivateCode(false);
      }}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-lg px-3">マイデッキ登録</ModalHeader>
            <ModalBody className="px-3 py-1">
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
                isRequired
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

              <Checkbox
                isDisabled={deckcode == "" || !isValidatedDeckCode}
                defaultSelected={false}
                size={"sm"}
                isSelected={isSelectedPrivateCode}
                onValueChange={setIsSelectedPrivateCode}
              >
                デッキコードを非公開にする
              </Checkbox>

              <div className="relative w-full aspect-2/1">
                {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                <Image
                  radius="sm"
                  shadow="none"
                  alt={deckcode ? deckcode : "デッキコードなし"}
                  src={
                    isValidatedDeckCode || deckcode
                      ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckcode}.png`
                      : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                  }
                  className=""
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {}}
                />
              </div>

              <Link
                isExternal
                showAnchorIcon
                underline="always"
                href="https://www.pokemon-card.com/deck/"
                className="text-xs"
              >
                <span>トレーナーズウェブサイトでデッキを構築する</span>
              </Link>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  //setDeckName("");
                  //setDeckCode(deck_code);
                  //setIsSelectedPrivateCode(false);
                  onClose();
                }}
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={isInvalid || isDisabled}
                onPress={() => {
                  createDeck(onClose);
                }}
              >
                登録
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
