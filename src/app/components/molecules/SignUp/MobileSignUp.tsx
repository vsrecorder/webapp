"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/react";

import SocialSignIn from "../SignIn/SocialSingIn";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function MobileSignUp({ iconUrl, isDevEnv }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        size="sm"
        onPress={onOpen}
        className="bg-white text-indigo-600 font-semibold shadow-sm"
      >
        新規登録
      </Button>

      <Modal
        backdrop="blur"
        placement="center"
        size="sm"
        hideCloseButton
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={!isSigningIn}
        isKeyboardDismissDisabled={isSigningIn}
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
                    priority
                    sizes="56px"
                    className="object-contain rounded-xl shadow-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg leading-tight">バトレコ</p>
                  <p className="text-white/70 text-xs mt-1">
                    ポケカの対戦を、記録しよう。
                  </p>
                </div>
              </div>

              <ModalBody className="px-6 pt-6 pb-2 flex flex-col gap-4">
                <p className="text-center text-sm text-default-500">
                  アカウントで新規登録
                </p>
                <SocialSignIn mode="signup" onLoadingChange={setIsSigningIn} onClose={onClose} />
                <p className="text-center text-xs text-default-400 leading-relaxed">
                  登録することで、バトレコの{" "}
                  <Link
                    href="/terms"
                    className="text-primary hover:underline underline-offset-2"
                  >
                    利用規約
                  </Link>{" "}
                  および{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline underline-offset-2"
                  >
                    プライバシーポリシー
                  </Link>{" "}
                  に同意したものとみなされます。
                </p>
              </ModalBody>

              <ModalFooter />
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
