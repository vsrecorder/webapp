"use client";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import SocialSignIn from "./SocialSingIn";

export default function DesktopSignIn() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <div className="hidden lg:block">
      <Button size="md" onPress={onOpen}>
        ログイン
      </Button>

      <Modal
        backdrop={"opaque"}
        placement="center"
        size="md"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="text-2xl">ログイン</div>
              </ModalHeader>

              <ModalBody className="items-center px-24">
                <div className="text-xl">バトレコ</div>
                <div className="text-xs text-gray-500">
                  <p>友達との　勝負や</p>
                  <p>特殊な　施設での　勝負を</p>
                  <p>記録できる　かっこいい　機械。</p>
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
