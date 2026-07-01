"use client";

import Image from "next/image";

import { Avatar } from "@heroui/avatar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import { useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/modal";
import { useRouter } from "next/navigation";

import { handleSignOut } from "@app/handlers/handleSignOut";

import { Button } from "@heroui/react";
import { UserType } from "@app/types/user";
import { useUserAvatar } from "@app/contexts/UserAvatarContext";

type Props = {
  user: UserType;
};

export default function UserMenu({ user }: Props) {
  const router = useRouter();
  const { avatarUrl } = useUserAvatar();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Dropdown backdrop="opaque">
        <DropdownTrigger>
          <Avatar size="md" src={avatarUrl ?? user.image_url} />
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

      <Modal backdrop="blur" placement="center" size="sm" isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <div className="bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 pt-8 pb-7 flex flex-col items-center gap-3 rounded-t-xl">
                <div className="w-14 h-14 relative">
                  <Image
                    src="/images/icon.png"
                    alt="バトレコ"
                    fill
                    priority
                    sizes="56px"
                    className="object-contain rounded-xl shadow-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg leading-tight">バトレコ</p>
                  <p className="text-white/70 text-xs mt-1">バトレコからログアウトしますか？</p>
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
