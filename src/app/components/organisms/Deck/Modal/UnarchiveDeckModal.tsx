import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UnarchiveDeckModal({
  deck,
  setDeck,
  isOpen,
  onOpenChange,
}: Props) {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  if (!deck) {
    return;
  }

  const unarchiveDeck = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキをアンアーカイブ中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck?.id}/unarchive`, {
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
        title: "デッキのアンアーカイブが完了",
        description: "デッキをアンアーカイブしました",
        color: "success",
        timeout: 3000,
      });

      setDeck(null);

      onClose();
      setIsDisabled(false);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアンアーカイブに失敗",
        description: (
          <>
            デッキのアンアーカイブに失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
      setIsDisabled(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement={"center"}
      hideCloseButton
      onOpenChange={onOpenChange}
      isDismissable={!isDisabled}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex items-center gap-2">
              このデッキを利用中に変更しますか？
            </ModalHeader>
            <ModalBody className="px-2 py-1"></ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={onClose}
              >
                戻る
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  unarchiveDeck(onClose);
                }}
              >
                変更
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
