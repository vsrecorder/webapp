import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { RecordGetByIdResponseType } from "@app/types/record";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DeleteRecordModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
}: Props) {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const deleteRecord = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "レコードを削除中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/records/${record.id}`, {
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
        title: "レコードの削除が完了",
        description: "レコードを削除しました",
        color: "success",
        timeout: 3000,
      });

      setRecord(null);

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
        title: "レコードの削除に失敗",
        description: (
          <>
            レコードの削除に失敗しました
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
              このレコードを削除しますか？
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
                  deleteRecord(onClose);
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
