"use client";

import { useEffect, useState } from "react";
import { Avatar, Card, CardBody, addToast } from "@heroui/react";
import { LuCopy, LuCheck } from "react-icons/lu";

import { UserType } from "@app/types/user";

type Props = {
  userId: string;
};

export default function UserIdentityCard({ userId }: Props) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data);
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
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-default-100 animate-pulse shrink-0" />
            <div className="w-32 h-3.5 rounded-full bg-default-100 animate-pulse" />
          </div>
          <div className="w-full h-9 rounded-xl bg-default-100 animate-pulse" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar src={user?.image_url} size="lg" isBordered className="shrink-0" />
          <span className="text-base font-black text-default-700 leading-tight truncate min-w-0">
            {user?.name}
          </span>
        </div>

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
  );
}
