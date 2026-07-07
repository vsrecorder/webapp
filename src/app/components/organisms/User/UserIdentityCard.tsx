"use client";

import { useEffect, useState } from "react";
import { Avatar, Card, CardBody, addToast, useDisclosure } from "@heroui/react";
import { LuCopy, LuCheck, LuPencil, LuCalendar } from "react-icons/lu";

import UpdateNameModal from "@app/components/organisms/User/Modal/UpdateNameModal";
import { UserType } from "@app/types/user";
import { formatJoinDate } from "@app/utils/calendar";

type Props = {
  userId: string;
};

export default function UserIdentityCard({ userId }: Props) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState({ name: "", imageUrl: "" });
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data);
        if (data) setProfile({ name: data.name, imageUrl: data.image_url });
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [userId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      addToast({ title: "ユーザIDをコピーしました", color: "success", timeout: 2000 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-md">
        <div className="bg-linear-to-br from-primary via-primary to-secondary px-3 pt-4 pb-5 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-white/20 animate-pulse shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="w-28 h-3.5 rounded-full bg-white/20 animate-pulse" />
            <div className="w-36 h-2.5 rounded-full bg-white/20 animate-pulse" />
          </div>
        </div>
        <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
          <div className="w-full h-9 rounded-xl bg-default-100 animate-pulse" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <UpdateNameModal
        userId={userId}
        currentName={profile.name}
        imageUrl={profile.imageUrl}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onUpdated={setProfile}
      />

      <Card className="overflow-hidden shadow-md">
        {/* グラデーションヘッダー */}
        <div className="bg-linear-to-br from-primary via-primary to-secondary px-3 pt-4 pb-5 flex items-center gap-3.5">
          <button onClick={onOpen} className="shrink-0" aria-label="プロフィールを編集">
            <Avatar
              src={profile.imageUrl}
              size="lg"
              isBordered
              color="default"
              classNames={{ base: "ring-2 ring-white/40" }}
            />
          </button>
          <div className="min-w-0 overflow-hidden flex flex-col gap-1">
            <button
              onClick={onOpen}
              className="min-w-0 overflow-hidden text-white/60 hover:text-white/90 transition-colors"
              aria-label="プロフィールを編集"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white font-black text-base leading-tight truncate min-w-0">
                  {profile.name}
                </span>
                <LuPencil className="w-3.5 h-3.5 shrink-0" />
              </div>
            </button>
            {user?.created_at && (
              <span className="flex items-center gap-1 text-white/80 text-[10px] font-medium">
                <LuCalendar className="w-3 h-3 shrink-0" />
                {formatJoinDate(String(user.created_at))}
              </span>
            )}
          </div>
        </div>

        {/* ユーザID */}
        <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-default-100 hover:bg-default-200 transition-colors"
            aria-label="ユーザIDをコピー"
          >
            <span className="text-[9px] font-bold text-default-400 uppercase tracking-widest shrink-0">
              ユーザID
            </span>
            <span className="flex-1 text-left text-xs font-mono text-default-600 break-all">
              {userId}
            </span>
            {copied ? (
              <LuCheck className="w-3.5 h-3.5 shrink-0 text-success" />
            ) : (
              <LuCopy className="w-3.5 h-3.5 shrink-0 text-default-400" />
            )}
          </button>
        </CardBody>
      </Card>
    </>
  );
}
