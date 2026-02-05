import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import {
  DeckUpdateRequestType,
  DeckGetByIdResponseType,
  //DeckUpdateResponseType,
} from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateDeckModal({ deck, setDeck, isOpen, onOpenChange }: Props) {
  const [newDeckName, setNewDeckName] = useState<string>(deck ? deck.name : "");
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  if (!deck) {
    return;
  }

  const updateDeck = async (onClose: () => void) => {
    const data: DeckUpdateRequestType = {
      name: newDeckName,
      private_flg: deck.private_flg,
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

      //const ret: DeckUpdateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ情報の更新がが完了",
        description: "デッキ情報を更新しました",
        color: "success",
        timeout: 3000,
      });

      deck.name = newDeckName;
      setDeck(deck);
      setIsDisabled(false);

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
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement={"center"}
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      isDismissable={!isDisabled}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              デッキ情報を更新
            </ModalHeader>
            <ModalBody className="px-3 py-1">
              <Input
                isRequired
                //isInvalid={!isValidedDeckName}
                //errorMessage="有効なデッキコードを入力してください"
                type="text"
                label="デッキ名"
                labelPlacement="outside"
                placeholder={deck.name}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  setNewDeckName(deck.name);
                  onClose();
                }}
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={newDeckName === "" || newDeckName === deck.name || isDisabled}
                onPress={() => {
                  updateDeck(onClose);
                }}
              >
                更新
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
