"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  addToast,
  closeToast,
} from "@heroui/react";
import { LuTriangleAlert } from "react-icons/lu";

import { UserPlayerCreateRequestType, UserPlayerType } from "@app/types/user_player";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  onLinked: (userPlayer: UserPlayerType) => void;
};

export default function LinkPlayerIdModal({ isOpen, onOpenChange, onLinked }: Props) {
  const [playerId, setPlayerId] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlayerId("");
      setIsDisabled(false);
    }
  }, [isOpen]);

  const handleRegister = async (onClose: () => void) => {
    const trimmed = playerId.trim();
    if (!trimmed) return;

    setIsDisabled(true);

    const toastId = addToast({
      title: "プレイヤーIDを登録中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const body: UserPlayerCreateRequestType = { player_id: trimmed };

      const res = await fetch("/api/usersplayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        const baseMessage =
          typeof resBody?.message === "string"
            ? resBody.message
            : `連携に失敗しました: ${res.status}`;

        if (res.status === 429) {
          throw new Error(
            "試行回数の上限に達しました。しばらく時間をおいてから再度お試しください。",
          );
        }

        // 503は連携機能が一時停止されている場合
        if (res.status === 503) {
          throw new Error(
            "現在プレイヤーズクラブとの連携をご利用いただけません。時間をおいてから再度お試しください。",
          );
        }

        throw new Error(baseMessage);
      }

      if (toastId) closeToast(toastId);

      addToast({
        title: "プレイヤーIDを連携しました",
        color: "success",
        timeout: 3000,
      });

      onLinked(resBody as UserPlayerType);
      onClose();
    } catch (error) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "連携に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 8000,
      });
    } finally {
      setIsDisabled(false);
    }
  };

  return (
    <Modal
      size="sm"
      placement="center"
      isOpen={isOpen}
      isDismissable={!isDisabled}
      // 処理中(isDisabled)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
      isKeyboardDismissDisabled={isDisabled}
      hideCloseButton={isDisabled}
      onOpenChange={() => {
        if (isDisabled) return;
        onOpenChange();
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              プレイヤーIDを連携
            </ModalHeader>

            <ModalBody className="px-3 py-1 flex flex-col gap-3">
              <Input
                isRequired
                isDisabled={isDisabled}
                type="text"
                label="プレイヤーズクラブに表示されているプレイヤーID"
                labelPlacement="outside"
                placeholder="プレイヤーIDを入力"
                maxLength={16}
                value={playerId}
                onValueChange={setPlayerId}
                onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                className="w-full"
              />

              <div className="flex items-center justify-center gap-5 text-xs text-warning-600 bg-warning-50 rounded-xl p-3">
                <LuTriangleAlert className="w-5 h-5 shrink-0" />
                <span>
                  入力されたプレイヤーIDが
                  <br />
                  <span className="font-bold">正しいかどうかの確認は行いません</span>。
                  <br />
                  <br />
                  一度連携すると、
                  <span className="font-bold">1ヶ月間は変更できません</span>。
                  <br />
                  プレイヤーIDに間違いがないか確認してから
                  <br />
                  登録してください。
                </span>
              </div>
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
                color="primary"
                variant="solid"
                isDisabled={isDisabled || !playerId.trim()}
                onPress={() => handleRegister(onClose)}
                className="font-bold"
              >
                連携
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
