"use client";

import Image from "next/image";

import { Button } from "@heroui/react";

import { useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/modal";

import { handleSignOut } from "@app/handlers/handleSignOut";

type Props = {
  iconUrl: string;
  isDevEnv: boolean;
};

export default function SignOut({ iconUrl, isDevEnv }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button onPress={onOpen}>ログアウト</Button>
      <Modal
        backdrop="blur"
        placement="center"
        size="sm"
        hideCloseButton
        isOpen={isOpen}
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
                    priority
                    sizes="56px"
                    className="object-contain rounded-xl shadow-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg leading-tight">バトレコ</p>
                  <p className="text-white/70 text-xs mt-1">
                    バトレコからログアウトしますか？
                  </p>
                </div>
              </div>

              <ModalBody className="px-6 pt-6 pb-2 flex flex-col gap-3">
                <Button
                  size="md"
                  color="danger"
                  fullWidth
                  className="font-medium"
                  onPress={() => handleSignOut()}
                >
                  ログアウト
                </Button>
                <Button
                  size="md"
                  variant="bordered"
                  fullWidth
                  className="border-default-200 font-medium"
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
    </>
  );
}
