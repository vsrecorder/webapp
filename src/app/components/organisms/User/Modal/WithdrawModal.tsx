"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
  closeToast,
} from "@heroui/react";
import { LuTriangleAlert } from "react-icons/lu";

import { handleWithdraw } from "@app/handlers/handleWithdraw";

type Props = {
  userId: string;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function WithdrawModal({ userId, isOpen, onOpenChange }: Props) {
  const [isDisabled, setIsDisabled] = useState(false);

  const handleConfirm = async () => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "退会処理中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      await handleWithdraw(userId);
      if (toastId) closeToast(toastId);
    } catch (error) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "退会に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 5000,
      });
      setIsDisabled(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      placement="center"
      size="sm"
      isDismissable={!isDisabled}
      hideCloseButton
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-danger">
              <LuTriangleAlert className="w-5 h-5 shrink-0" />
              退会の確認
            </ModalHeader>

            <ModalBody className="flex flex-col gap-2 text-sm">
              <p>退会すると、以下のデータがすべて削除され、元に戻すことはできません。</p>
              <ul className="list-disc pl-5 text-default-500 flex flex-col gap-1">
                <li>アカウント情報（名前・アイコン）</li>
                <li>対戦記録・登録デッキ</li>
                <li>その他バトレコに保存されているすべてのデータ</li>
              </ul>
              <p className="font-semibold">本当に退会しますか？</p>
            </ModalBody>

            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={onClose}
                className="font-bold"
              >
                キャンセル
              </Button>
              <Button
                color="danger"
                variant="solid"
                isDisabled={isDisabled}
                onPress={handleConfirm}
                className="font-bold"
              >
                退会する
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
