import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function ArchiveDeckModal({ deck, setDeck, isOpen, onOpenChange }: Props) {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  if (!deck) {
    return;
  }

  const archiveDeck = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキをアーカイブ中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck.id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアーカイブが完了",
        description: "デッキをアーカイブしました",
        color: "success",
        timeout: 3000,
      });

      setDeck(null);

      onClose();
      setIsSelected(false);
      setIsDisabled(false);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアーカイブに失敗",
        description: (
          <>
            デッキのアーカイブに失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
      setIsSelected(false);
      setIsDisabled(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
      isDismissable={!isDisabled}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex items-center gap-2">
              このデッキをアーカイブしますか？
            </ModalHeader>
            <ModalBody className="px-2 py-1">
              <Alert color="warning">
                <Checkbox
                  size={"sm"}
                  color="default"
                  isDisabled={isDisabled}
                  isSelected={isSelected}
                  defaultSelected={false}
                  onValueChange={setIsSelected}
                >
                  アーカイブする
                </Checkbox>
              </Alert>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  onClose();
                  setIsSelected(false);
                  setIsDisabled(false);
                }}
              >
                戻る
              </Button>
              <Button
                color="danger"
                variant="solid"
                isDisabled={isDisabled || !isSelected}
                onPress={() => {
                  archiveDeck(onClose);
                }}
                className="text-white font-bold"
              >
                アーカイブ
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
