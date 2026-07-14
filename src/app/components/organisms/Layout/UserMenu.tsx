"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";

import { addToast, useDisclosure } from "@heroui/react";
import { Modal, ModalContent, ModalBody, ModalFooter } from "@heroui/modal";
import { useRouter } from "next/navigation";
import {
  LuLayoutDashboard,
  LuUser,
  LuMessageCircle,
  LuExternalLink,
  LuLogOut,
  LuChartColumn,
  LuCopy,
  LuCheck,
} from "react-icons/lu";

import { handleSignOut } from "@app/handlers/handleSignOut";

import { Button } from "@heroui/react";
import { UserType } from "@app/types/user";
import { UserDesignationType } from "@app/types/designation";
import { useUserAvatar } from "@app/contexts/UserAvatarContext";
import { CUSTOMIZE_QUERY_PARAM } from "@app/components/organisms/Dashboard/DashboardSections";
import { rankForTier, NO_RANK_IMAGE } from "@app/utils/designationRank";

const CONTACT_FORM_URL = "https://forms.gle/pN8vUF9sQMPnZWc5A";

type Props = {
  user: UserType;
  iconUrl: string;
  isDevEnv: boolean;
};

export default function UserMenu({ user, iconUrl, isDevEnv }: Props) {
  const router = useRouter();
  const { avatarUrl } = useUserAvatar();
  const [rankName, setRankName] = useState<string | null>(null);
  const [rankImage, setRankImage] = useState(NO_RANK_IMAGE);
  const [copied, setCopied] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  async function handleCopyUserId() {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      addToast({ title: "ユーザIDをコピーしました", color: "success", timeout: 2000 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  }

  useEffect(() => {
    fetch(`/api/users/${user.id}/designation`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: UserDesignationType | null) => {
        const tier = d?.current?.tier;
        const rank = tier != null ? rankForTier(tier) : null;
        setRankName(rank?.name ?? "ランクなし");
        setRankImage(rank?.image ?? NO_RANK_IMAGE);
      })
      .catch(() => setRankName("ランクなし"));
  }, [user.id]);

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
              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" src={avatarUrl ?? user.image_url} />
                  <div className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1 text-tiny text-default-400">
                      <Image
                        src={rankImage}
                        alt=""
                        width={14}
                        height={14}
                        unoptimized
                        className="object-contain shrink-0"
                      />
                      {rankName ?? "ランク取得中…"}
                    </span>
                    <span className="font-semibold text-sm truncate max-w-40">
                      {user.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    // ドロップダウンを閉じずにコピーする
                    e.stopPropagation();
                    handleCopyUserId();
                  }}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-lg bg-default-100 px-4 py-2 cursor-pointer text-default-400 hover:bg-default-200 hover:text-default-600 transition-colors"
                  aria-label="ユーザIDをコピー"
                >
                  <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest shrink-0">
                    ユーザID
                  </span>
                  <span className="flex-1 text-left text-xs font-mono text-default-600 break-all whitespace-normal">
                    {user.id}
                  </span>
                  {copied ? (
                    <LuCheck className="w-3 h-3 shrink-0 text-success" />
                  ) : (
                    <LuCopy className="w-3 h-3 shrink-0" />
                  )}
                </button>
              </div>
            </DropdownItem>
          </DropdownSection>

          <DropdownSection aria-label="ナビゲーション" showDivider>
            <DropdownItem
              key="profile"
              color="default"
              startContent={<LuUser className="w-4 h-4" />}
              description="称号やバッジを確認"
              onPress={() => {
                router.push("/users");
              }}
            >
              ユーザ情報
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
              key="deck_meta"
              color="default"
              startContent={<LuChartColumn className="w-4 h-4" />}
              description="週次のデッキ使用率・勝率"
              onPress={() => {
                router.push("/deck_meta");
              }}
            >
              対戦環境分析（β機能）
            </DropdownItem>
          </DropdownSection>

          <DropdownSection aria-label="サポート">
            <DropdownItem
              key="contact"
              color="default"
              startContent={<LuMessageCircle className="w-4 h-4" />}
              endContent={<LuExternalLink className="w-4 h-4 text-default-300" />}
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
