"use client";

import { ModalHeader } from "@heroui/react";

import SignInModal from "@app/components/molecules/SignIn/SignInModal";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 何をするためにログインが要るのか(例: 「いいねするにはログインが必要です」)
  title: string;
};

/*
 * 未ログインの人がいいね・取り込みなどを押したときの案内。
 * 閲覧とコードのコピーはログインなしで使える旨を添え、その場でログインできるようにする。
 */
export default function LoginPromptModal({ isOpen, onOpenChange, title }: Props) {
  return (
    <SignInModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      header={<ModalHeader className="text-base">{title}</ModalHeader>}
      intro={
        <p className="text-sm text-default-500">
          みんなの公開デッキの閲覧とコードのコピーはログインなしで使えます。いいね・取り込み・公開はログイン後に使えます。
        </p>
      }
    />
  );
}
