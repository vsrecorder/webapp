"use client";

import { useState } from "react";

import Image from "next/image";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/react";

import SocialSignIn from "./SocialSingIn";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function DesktopSignIn({ iconUrl, isDevEnv }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <div className="hidden lg:block">
      <Button
        size="sm"
        variant="bordered"
        onPress={onOpen}
        className="border-white/60 text-white font-medium"
      >
        ログイン
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
          {() => (
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
                  アカウントでログイン
                </p>
                <SocialSignIn onLoadingChange={setIsSigningIn} />
              </ModalBody>

              <ModalFooter />
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
