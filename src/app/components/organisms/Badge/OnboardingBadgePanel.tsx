"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, useDisclosure } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";

import { useSeededResource } from "@app/hooks/useSeededResource";
import { UserBadgeType, UserBadgesType } from "@app/types/badge";

async function fetchBadges(userId: string): Promise<UserBadgesType> {
  const res = await fetch(`/api/users/${userId}/badges`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return (await res.json()) as UserBadgesType;
}
import {
  BadgeDetailModal,
  BadgeTile,
  BadgeTileSkeleton,
} from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
  // サーバ描画(dashboardServer)で取った全バッジ。あればこれを使い、取りに行かない
  initialBadges?: UserBadgesType;
};

// 「はじめの一歩」(category="onboarding")はシーズンに依存せず一度達成したら永久に
// 保持されるため、シーズン切り替えの効く BadgeGallery(バッジ)とは別パネル
// として独立させている。season は問わないため固定値のクエリで取得する。
export default function OnboardingBadgePanel({ userId, initialBadges }: Props) {
  // 取得に失敗したことを空のバッジ一覧で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const {
    data,
    loading: isLoading,
    error,
    retry: loadBadges,
  } = useSeededResource(userId, fetchBadges, initialBadges);
  const badges = useMemo(
    () => (data ? (data.badges ?? []).filter((b) => b.category === "onboarding") : null),
    [data],
  );
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeType | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function handleSelect(badge: UserBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-2">
          {/* 獲得数(text-xs = 16px の行) */}
          <div className="h-4 flex items-center">
            <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <BadgeTileSkeleton key={i} nameSample="初デッキ" />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <FetchError message="「はじめの一歩」の取得に失敗しました" onRetry={loadBadges} />
    );
  }

  const achievedCount = badges?.filter((b) => b.achieved).length ?? 0;

  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-2">
        <span className="text-xs font-bold text-default-500 shrink-0">
          獲得数 {achievedCount} / {badges?.length ?? 0}
        </span>
        <div className="grid grid-cols-4 gap-2">
          {(badges ?? []).map((badge) => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              onSelect={handleSelect}
              showCount={false}
            />
          ))}
        </div>
      </CardBody>

      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </Card>
  );
}
