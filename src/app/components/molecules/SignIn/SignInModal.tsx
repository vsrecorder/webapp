"use client";

import { ReactNode, useState } from "react";

import { ModalBody, ModalContent } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";

import SocialSignIn from "./LazySocialSignIn";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 本文の上に置く見出し(ブランドの帯や ModalHeader)
  header?: ReactNode;
  // ログインボタンの上に添える説明
  intro?: ReactNode;
  backdrop?: "transparent" | "opaque" | "blur";
  hideCloseButton?: boolean;
  // 下端はフッターを置かず、ボタン群が常に確保する案内の行(SocialSignIn)と本文の余白で取る
  bodyClassName?: string;
};

/*
 * ソーシャルログインを載せたモーダルの共通部分。
 * ログイン処理中(成功後のリダイレクト待ちを含む)は閉じられないようにする。
 * ヘッダのログインボタン(MobileSignIn)と、みんなの公開デッキでログインが要る操作をしたときの
 * 案内(LoginPromptModal)で同じ挙動になるように1つにまとめている。
 */
export default function SignInModal({
  isOpen,
  onOpenChange,
  header,
  intro,
  backdrop,
  hideCloseButton = false,
  bodyClassName = "flex flex-col gap-4 pb-3",
}: Props) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <Modal
      backdrop={backdrop}
      placement="center"
      size="sm"
      hideCloseButton={hideCloseButton}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!isSigningIn}
      isKeyboardDismissDisabled={isSigningIn}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {header}
            <ModalBody className={bodyClassName}>
              {intro}
              <SocialSignIn onLoadingChange={setIsSigningIn} onClose={onClose} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
