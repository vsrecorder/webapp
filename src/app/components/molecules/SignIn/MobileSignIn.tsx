"use client";

import Image from "next/image";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import SocialSignIn from "./SocialSingIn";

export default function MobileSignIn() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <div className="lg:hidden">
      <Button size="md" onPress={onOpen}>
        ログイン
      </Button>

      <Modal
        backdrop={"opaque"}
        placement="center"
        size={"sm"}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="text-2xl">ログイン</div>
              </ModalHeader>

              <ModalBody className="items-center px-16">
                <div className="pt-6 flex flex-col items-center justify-center gap-4.5 w-full">
                  <div className="w-24 h-24 relative">
                    <Image
                      alt="バトレコ"
                      src="https://xx8nnpgt.user.webaccel.jp/images/icons/logo.png"
                      fill
                      className="object-contain"
                      sizes="96px"
                      priority
                    />
                  </div>

                  <span className="text-3xl font-bold">バトレコ</span>

                  <div className="flex flex-col justify-center gap-0.5">
                    <span className="text-tiny">友達との　勝負や</span>
                    <span className="text-tiny">特殊な　施設での　勝負を</span>
                    <span className="text-tiny">記録できる　かっこいい　アプリ。</span>
                  </div>
                </div>

                <div className="text-md">お好みのアカウントでログイン</div>
                <SocialSignIn />
              </ModalBody>

              <ModalFooter></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
