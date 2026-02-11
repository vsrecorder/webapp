"use client";

import { Button } from "@heroui/react";

import { useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";

import { handleSignOut } from "@app/handlers/handleSignOut";

export default function SignOut() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button onPress={onOpen}>ログアウト</Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="sm"
        placement="top"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg">ログアウト</ModalHeader>
              <ModalBody>
                <p>バトレコからログアウトしますか？</p>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  キャンセル
                </Button>
                <Button color="danger" variant="light" onPress={() => handleSignOut()}>
                  ログアウト
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
