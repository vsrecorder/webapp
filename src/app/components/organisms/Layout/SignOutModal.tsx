"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { addToast, Button } from "@heroui/react";
import { ModalContent, ModalBody, ModalFooter } from "@heroui/modal";

import { Modal } from "@app/components/atoms/AppModal";
import { handleSignOut } from "@app/handlers/handleSignOut";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

/*
 * サインアウトが成功したあと、ページの遷移が始まるのを待つ長さ。
 * next-auth の signOut は応答を受けてから location を書き換えるので、ふつうはすぐ離れる。
 * 万一遷移が始まらなかったときに処理中のまま閉じ込めないよう、これを過ぎたら処理中を解く
 * (遷移していればこの部品ごと消えているので何も起きない)
 */
const LEAVE_WAIT_MS = 5000;

/*
 * ログアウトの確認モーダル。ユーザメニュー(UserMenu)の「ログアウト」から開く。
 *
 * ログアウトは push 購読の解除 → Firebase のサインアウト → セッションのサインアウト(遷移)と
 * 数百 ms〜数秒かかる。その間にもう一度押せると同じ処理が二重に走るので、押したら
 * ボタンを処理中にして、キャンセルも外側タップも効かないようにする。
 * 失敗したら(通信など)処理中を解いて押し直せるようにし、失敗したことを伝える。
 */
export default function SignOutModal({ iconUrl, isDevEnv, isOpen, onOpenChange }: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    };
  }, []);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await handleSignOut();
      // 成功すると signOut がページごと遷移する。遷移が始まらなかったときの逃げ道だけ用意する
      leaveTimer.current = setTimeout(() => setSigningOut(false), LEAVE_WAIT_MS);
    } catch (error) {
      console.error("Failed to sign out:", error);
      addToast({ title: "ログアウトに失敗しました", color: "danger", timeout: 3000 });
      setSigningOut(false);
    }
  };

  return (
    <Modal
      backdrop="blur"
      placement="center"
      size="sm"
      hideCloseButton
      isOpen={isOpen}
      isDismissable={!signingOut}
      isKeyboardDismissDisabled={signingOut}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <div
              className={`px-6 pt-8 pb-7 flex flex-col items-center gap-3 rounded-t-xl ${
                isDevEnv
                  ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
                  : "bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700"
              }`}
            >
              <div className="w-14 h-14 relative">
                <Image
                  src={iconUrl}
                  alt="バトレコ"
                  fill
                  // モーダルを開いたときにだけ描画されるので、head に preload を
                  // 入れても間に合わない。遅延読み込みを外すだけにする。
                  loading="eager"
                  sizes="56px"
                  className="object-contain rounded-xl shadow-lg"
                />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg leading-tight">バトレコ</p>
                <p className="text-white/70 text-xs mt-1">バトレコからログアウトしますか？</p>
              </div>
            </div>

            <ModalBody className="px-6 pt-6 pb-2 flex flex-col gap-3">
              <Button
                size="md"
                color="danger"
                fullWidth
                className="font-medium"
                isLoading={signingOut}
                onPress={() => void signOut()}
              >
                ログアウト
              </Button>
              <Button
                size="md"
                variant="bordered"
                fullWidth
                className="border-default-200 font-medium"
                isDisabled={signingOut}
                onPress={onClose}
              >
                キャンセル
              </Button>
            </ModalBody>

            <ModalFooter />
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
