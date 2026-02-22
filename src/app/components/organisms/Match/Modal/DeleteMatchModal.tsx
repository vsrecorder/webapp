import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { MatchGetResponseType } from "@app/types/match";

type Props = {
  match: MatchGetResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onCloseForCallBackModal: () => void;
};

export default function DeleteMatchModal({
  match,
  setMatches,
  isOpen,
  onOpenChange,
  onCloseForCallBackModal,
}: Props) {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const deleteMatch = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "対戦結果を削除中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/matches/${match?.id}`, {
        method: "DELETE",
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
        title: "対戦結果の削除が完了",
        description: "対戦結果を削除しました",
        color: "success",
        timeout: 3000,
      });

      setMatches((prev) => {
        if (!prev) return prev;
        return prev.filter((m) => m.id !== match?.id);
      });

      onClose();
      setIsSelected(false);
      setIsDisabled(false);
      onCloseForCallBackModal();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の削除に失敗",
        description: (
          <>
            対戦結果の削除に失敗しました
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
      onCloseForCallBackModal();
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
              この対戦結果を削除しますか？
            </ModalHeader>
            <ModalBody className="px-2 py-1">
              <Alert color="danger">
                <Checkbox
                  size={"sm"}
                  color="danger"
                  isDisabled={isDisabled}
                  isSelected={isSelected}
                  defaultSelected={false}
                  onValueChange={setIsSelected}
                >
                  削除する
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
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="danger"
                variant="solid"
                isDisabled={isDisabled || !isSelected}
                onPress={() => {
                  deleteMatch(onClose);
                }}
                className="text-white font-bold"
              >
                削除
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
