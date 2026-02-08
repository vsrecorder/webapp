"use client";

import { useSWRConfig } from "swr";

import { useState } from "react";
import { useEffect } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Link } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import { DeckCreateRequestType } from "@app/types/deck";

export default function CreateDeckModal() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [deckname, setDeckName] = useState<string>("");
  const [deckcode, setDeckCode] = useState<string>("");
  const [isSelectedPrivateCode, setIsSelectedPrivateCode] = useState<boolean>(false);
  const [isValidatedDeckCode, setIsValidatedDeckCode] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(true);

  const { mutate } = useSWRConfig();

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
  const createDeck = async () => {
    const deck: DeckCreateRequestType = {
      name: deckname,
      private_flg: false,
      deck_code: deckcode,
      private_deck_code_flg: isSelectedPrivateCode,
    };

    const toastId = addToast({
      title: "デッキ作成中",
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

      mutate(`/api/decks/all`);

      addToast({
        title: "デッキ作成完了",
        description: "デッキを作成しました",
        color: "success",
        timeout: 3000,
      });
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ作成失敗",
        description: (
          <>
            デッキの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };

  return (
    <>
      <Button size="sm" radius="full" onPress={onOpen}>
        <div className="flex items-center gap-1">
          <span className="text-xs">
            <LuCirclePlus />
          </span>
          <span className="text-xs">新しいデッキを作成する</span>
        </div>
      </Button>

      <Modal
        isOpen={isOpen}
        size="sm"
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChange}
        onClose={() => {
          setDeckName("");
          setDeckCode("");
          setIsSelectedPrivateCode(false);
        }}
        classNames={{
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg px-3">新しいデッキを作成</ModalHeader>
              <ModalBody className="px-3 py-1">
                <Input
                  isRequired
                  type="text"
                  label="デッキ名"
                  labelPlacement="outside"
                  placeholder="例）メガルカリオ"
                  value={deckname}
                  onChange={(e) => setDeckName(e.target.value)}
                />
                <Input
                  isRequired
                  isInvalid={!isValidatedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="例）LnQLQn-SWgB9g-nngNgL"
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
                  <Skeleton className="absolute inset-0 rounded-lg" />
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={"test"}
                    src={
                      isValidatedDeckCode
                        ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode}.jpg`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    onLoad={() => {}}
                    onError={() => {}}
                    className=""
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
                  onPress={() => {
                    setDeckName("");
                    setDeckCode("");
                    setIsSelectedPrivateCode(false);
                    onClose();
                  }}
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={isInvalid}
                  onPress={() => {
                    createDeck();
                    setDeckName("");
                    setDeckCode("");
                    setIsSelectedPrivateCode(false);
                    onClose();
                  }}
                >
                  作成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
