"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, useDisclosure } from "@heroui/react";

import { UserBadgeType } from "@app/types/badge";
import {
  BadgeDetailModal,
  BadgeTile,
  BadgeTileSkeleton,
} from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
};

// 「はじめの一歩」(category="onboarding")はシーズンに依存せず一度達成したら永久に
// 保持されるため、シーズン切り替えの効く BadgeGallery(バッジ)とは別パネル
// として独立させている。season は問わないため固定値のクエリで取得する。
export default function OnboardingBadgePanel({ userId }: Props) {
  const [badges, setBadges] = useState<UserBadgeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeType | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function handleSelect(badge: UserBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}/badges`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const allBadges: UserBadgeType[] = data?.badges ?? [];
        setBadges(allBadges.filter((b) => b.category === "onboarding"));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-2">
          <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <BadgeTileSkeleton key={i} singleLineName />
            ))}
          </div>
        </CardBody>
      </Card>
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
