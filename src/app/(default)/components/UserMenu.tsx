"use client";

import { Avatar } from "@heroui/avatar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import { useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";

import { handleSignOut } from "@app/(default)/handlers/handleSignOut";

import { Button } from "@heroui/react";
import { UserType } from "@app/(default)/types";

type Props = {
  user: UserType;
};

export default function UserMenu({ user }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Avatar size="md" src={user.image_url} />
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem
            key="signout"
            className="text-danger"
            color="danger"
            onPress={onOpen}
          >
            ログアウト
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">ログアウト</ModalHeader>
              <ModalBody>
                <p>バトレコからログアウトしますか？</p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
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
