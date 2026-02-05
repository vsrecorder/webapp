import { useEffect, useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Image } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

import { DeckCodeType, DeckCodeCreateRequestType } from "@app/types/deck_code";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function CreateDeckCodeModal({
  deck,
  //setDeck,
  //deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
}: Props) {
  const [newdeckcode, setNewDeckCode] = useState<string>("");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isValidedDeckCode, setIsValidedDeckCode] = useState<boolean>(true);

  useEffect(() => {
    if (!newdeckcode) {
      setIsValidedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", newdeckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        setIsValidedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [newdeckcode]);

  if (!deck) {
    return;
  }

  const createNewDeckCode = async () => {
    const data: DeckCodeCreateRequestType = {
      deck_id: deck.id,
      code: newdeckcode,
      private_code_flg: isSelected,
      memo: "",
    };

    const toastId = addToast({
      title: "デッキコードを作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成が完了",
        description: "デッキコードを作成しました",
        color: "success",
        timeout: 3000,
      });

      setDeckCode(ret);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成に失敗",
        description: (
          <>
            デッキコードの作成に失敗しました
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
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement={"center"}
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {
        setNewDeckCode("");
        setIsSelected(false);
      }}
      classNames={{
        base: "sm:max-w-full md:max-w-lg",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <div>
            <ModalHeader className="flex flex-col gap-1 px-3">
              新しいバージョンを作成
            </ModalHeader>
            <ModalBody className="px-3 py-1">
              <Input
                //isDisabled={isDisabled}
                isRequired
                isInvalid={!isValidedDeckCode}
                errorMessage="有効なデッキコードを入力してください"
                type="text"
                label="デッキコード"
                labelPlacement="outside"
                placeholder="例）"
                value={newdeckcode}
                onChange={(e) => setNewDeckCode(e.target.value)}
              />

              <Checkbox
                isDisabled={newdeckcode == "" || !isValidedDeckCode}
                defaultSelected={false}
                size={"sm"}
                isSelected={isSelected}
                onValueChange={setIsSelected}
              >
                デッキコードを非公開にする
              </Checkbox>

              <Image
                className="relative z-0"
                radius="sm"
                shadow="none"
                alt={newdeckcode ? newdeckcode : "デッキコードなし"}
                src={
                  isValidedDeckCode || newdeckcode
                    ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${newdeckcode}.jpg`
                    : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                }
                onLoad={() => {}}
                onError={() => {}}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={() => {
                  setNewDeckCode("");
                  setIsSelected(false);
                  onClose();
                }}
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={!isValidedDeckCode || !newdeckcode}
                onPress={() => {
                  createNewDeckCode();
                  setNewDeckCode("");
                  setIsSelected(false);
                  onClose();
                }}
              >
                作成
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
