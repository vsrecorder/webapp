"use client";

import Image from "next/image";

import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";

import { useDisclosure } from "@heroui/react";
import { Chip } from "@heroui/chip";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/modal";
import { useRouter } from "next/navigation";
import {
  LuLayoutDashboard,
  LuFileText,
  LuLayers,
  LuUser,
  LuMessageCircle,
  LuExternalLink,
  LuLogOut,
} from "react-icons/lu";

import { handleSignOut } from "@app/handlers/handleSignOut";

import { Button } from "@heroui/react";
import { UserType } from "@app/types/user";
import { useUserAvatar } from "@app/contexts/UserAvatarContext";
import { CUSTOMIZE_QUERY_PARAM } from "@app/components/organisms/Dashboard/DashboardSections";

const CONTACT_FORM_URL = "https://forms.gle/pN8vUF9sQMPnZWc5A";

type Props = {
  user: UserType;
};

export default function UserMenu({ user }: Props) {
  const router = useRouter();
  const { avatarUrl } = useUserAvatar();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  return (
    <>
      <Dropdown
        backdrop="opaque"
        classNames={{
          content:
            "min-w-72 p-1.5 rounded-2xl shadow-xl border border-default-100 dark:border-default-50",
        }}
      >
        <DropdownTrigger>
          <Avatar
            size="md"
            src={avatarUrl ?? user.image_url}
            className="cursor-pointer transition-transform hover:scale-105"
            classNames={{ base: "ring-2 ring-white/40" }}
          />
        </DropdownTrigger>
        <DropdownMenu aria-label="ユーザメニュー" variant="flat">
          <DropdownSection aria-label="アカウント" showDivider>
            <DropdownItem
              key="profile-header"
              isReadOnly
              textValue={user.name}
              className="cursor-default data-[hover=true]:bg-transparent"
            >
              <div className="flex items-center gap-3 py-1">
                <Avatar size="sm" src={avatarUrl ?? user.image_url} />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate max-w-40">
                    {user.name}
                  </span>
                  <span className="text-tiny text-default-400">アカウント</span>
                </div>
              </div>
            </DropdownItem>
          </DropdownSection>

          <DropdownSection aria-label="ナビゲーション" showDivider>
            <DropdownItem
              key="records"
              color="default"
              startContent={<LuFileText className="w-4 h-4" />}
              description="これまでの対戦を確認"
              onPress={() => {
                router.push("/records");
              }}
            >
              対戦記録一覧
            </DropdownItem>
            <DropdownItem
              key="decks"
              color="default"
              startContent={<LuLayers className="w-4 h-4" />}
              description="登録デッキを管理"
              onPress={() => {
                router.push("/decks");
              }}
            >
              マイデッキ一覧
            </DropdownItem>
            <DropdownItem
              key="dashboard-customize"
              color="default"
              startContent={<LuLayoutDashboard className="w-4 h-4" />}
              description="ホームの表示項目や並び順を変更"
              onPress={() => {
                router.push(`/?${CUSTOMIZE_QUERY_PARAM}=1`);
              }}
            >
              ホームの表示設定
            </DropdownItem>
            <DropdownItem
              key="profile"
              isReadOnly
              color="default"
              startContent={<LuUser className="w-4 h-4" />}
              description="公開プロフィールを編集"
              endContent={
                <Chip size="sm" radius="full" variant="flat" color="default">
                  準備中
                </Chip>
              }
              className="cursor-default opacity-60 data-[hover=true]:bg-transparent"
            >
              プロフィールの設定
            </DropdownItem>
          </DropdownSection>

          <DropdownSection aria-label="サポート">
            <DropdownItem
              key="contact"
              color="default"
              startContent={<LuMessageCircle className="w-4 h-4" />}
              endContent={<LuExternalLink className="w-3 h-3 text-default-300" />}
              onPress={() => {
                window.open(CONTACT_FORM_URL, "_blank", "noopener,noreferrer");
              }}
            >
              お問い合わせ
            </DropdownItem>
            <DropdownItem
              key="signout"
              className="text-danger"
              color="danger"
              startContent={<LuLogOut className="w-4 h-4" />}
              onPress={onOpen}
            >
              ログアウト
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

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
