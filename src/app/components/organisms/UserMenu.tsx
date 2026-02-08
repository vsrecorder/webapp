"use client";

import { Avatar } from "@heroui/avatar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import { useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { useRouter } from "next/navigation";

import { handleSignOut } from "@app/handlers/handleSignOut";

import { Button } from "@heroui/react";
import { UserType } from "@app/types/user";

type Props = {
  user: UserType;
};

export default function UserMenu({ user }: Props) {
  const router = useRouter();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Dropdown backdrop="opaque">
        <DropdownTrigger>
          <Avatar size="md" src={user.image_url} />
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem
            key=""
            color="default"
            onPress={() => {
              router.push("/users");
            }}
          >
            ユーザ情報
          </DropdownItem>
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
