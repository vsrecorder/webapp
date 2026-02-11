"use client";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import SocialSignIn from "../SignIn/SocialSingIn";

export default function MobileSignUp() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <div className="lg:hidden">
      <Button size="md" onPress={onOpen}>
        新規登録
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
                <div className="text-2xl">新規登録</div>
              </ModalHeader>

              <ModalBody className="items-center px-16">
                <div className="text-xl">バトレコ</div>
                <div className="text-xs text-gray-500">
                  <p>友達との　勝負や</p>
                  <p>特殊な　施設での　勝負を</p>
                  <p>記録できる　かっこいい　機械。</p>
                </div>
                <div className="text-md">お好みのアカウントで新規登録</div>
                <SocialSignIn />
                <div className="text-xs">
                  新規登録するにあたり、バトレコの{" "}
                  <a href="/terms" className="text-red-400">
                    利用規約
                  </a>{" "}
                  および{" "}
                  <a href="/privacy" className="text-red-400">
                    プライバシーポリシー
                  </a>{" "}
                  に同意したものとみなされます。
                </div>
              </ModalBody>

              <ModalFooter></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
