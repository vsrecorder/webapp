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
  Avatar,
  Chip,
  addToast,
  closeToast,
} from "@heroui/react";
import { LuTriangleAlert, LuMapPin, LuSwords } from "react-icons/lu";

import {
  UserPlayerCreateRequestType,
  UserPlayerVerifyRequestType,
  UserPlayerVerifyResponseType,
  UserPlayerType,
} from "@app/types/user_player";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  onLinked: (userPlayer: UserPlayerType) => void;
};

type ModalState = "input" | "confirm";

export default function LinkPlayerIdModal({ isOpen, onOpenChange, onLinked }: Props) {
  const [modalState, setModalState] = useState<ModalState>("input");
  const [playerId, setPlayerId] = useState("");
  const [verifiedAccount, setVerifiedAccount] =
    useState<UserPlayerVerifyResponseType | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModalState("input");
      setPlayerId("");
      setVerifiedAccount(null);
      setIsDisabled(false);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    const trimmed = playerId.trim();
    if (!trimmed) return;

    setIsDisabled(true);

    const toastId = addToast({
      title: "プレイヤーIDを確認中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const body: UserPlayerVerifyRequestType = { player_id: trimmed };

      const res = await fetch("/api/userplayers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof resBody?.message === "string"
            ? resBody.message
            : `確認に失敗しました: ${res.status}`,
        );
      }

      if (toastId) closeToast(toastId);

      setVerifiedAccount(resBody as UserPlayerVerifyResponseType);
      setModalState("confirm");
    } catch (error) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "プレイヤーIDが確認できませんでした",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setIsDisabled(false);
    }
  };

  const handleRegister = async (onClose: () => void) => {
    if (!verifiedAccount) return;

    setIsDisabled(true);

    const toastId = addToast({
      title: "連携中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const body: UserPlayerCreateRequestType = { player_id: verifiedAccount.player_id };

      const res = await fetch("/api/userplayers", {
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

        // 409は「他アカウントで使用中」の可能性があるため、なりすましだった場合の
        // 問い合わせ導線を案内する。
        const message =
          res.status === 409
            ? `${baseMessage}(心当たりがない場合はフッターの「お問い合わせ」よりご連絡ください)`
            : baseMessage;

        throw new Error(message);
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
        timeout: 5000,
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
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) =>
          modalState === "input" ? (
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
                  className="w-full"
                />

                <div className="flex items-center justify-center gap-5 text-xs text-warning-600 bg-warning-50 rounded-xl pt-3 pb-3">
                  <LuTriangleAlert className="w-5 h-5 shrink-0" />
                  <span>
                    一度連携すると、
                    <span className="font-bold">1ヶ月間は変更できません</span>。
                    <br />
                    プレイヤーIDに間違いがないか確認してから
                    <br />
                    進んでください。
                    <br />
                    <br />
                    また、
                    <span className="font-bold">
                      マイページが非公開の場合は連携することができません
                    </span>
                    。
                    <br />
                    ポケモンカードゲーム プレイヤーズクラブの
                    <br />
                    <span className="font-bold">ユーザー情報</span>から
                    <span className="font-bold">「マイページ公開／非公開」</span>が
                    <br />
                    <span className="font-bold">「公開」</span>
                    になっていること確認してください。
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
                  onPress={handleVerify}
                  className="font-bold"
                >
                  確認
                </Button>
              </ModalFooter>
            </>
          ) : (
            <>
              <ModalHeader className="flex flex-col gap-1 px-3">
                この情報で連携しますか？
              </ModalHeader>

              <ModalBody className="px-3 py-1 flex flex-col gap-3">
                {verifiedAccount && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-default-100">
                    <Avatar
                      src={verifiedAccount.avatar_image}
                      size="lg"
                      isBordered
                      className="shrink-0"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-black text-base text-default-700 truncate">
                        {verifiedAccount.nickname}
                      </span>
                      <span className="text-xs font-mono text-default-500 break-all">
                        プレイヤーID：{verifiedAccount.player_id}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {verifiedAccount.current_league && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<LuSwords className="w-3 h-3" />}
                          >
                            {verifiedAccount.current_league}リーグ
                          </Chip>
                        )}
                        {verifiedAccount.prefecture && (
                          <Chip
                            size="sm"
                            variant="flat"
                            startContent={<LuMapPin className="w-3 h-3" />}
                          >
                            {verifiedAccount.prefecture}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs text-warning-600 bg-warning-50 rounded-xl p-3">
                  <LuTriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    一度連携すると、
                    <span className="font-bold">1ヶ月間は変更できません</span>。
                    <br />
                    上記の情報に間違いがないか確認してください。
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
                  isDisabled={isDisabled}
                  onPress={() => handleRegister(onClose)}
                  className="font-bold"
                >
                  連携
                </Button>
              </ModalFooter>
            </>
          )
        }
      </ModalContent>
    </Modal>
  );
}
