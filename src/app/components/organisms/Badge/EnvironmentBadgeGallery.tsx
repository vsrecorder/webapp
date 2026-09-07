"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Image,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { LuLock, LuChevronDown, LuChevronUp } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import FetchError from "@app/components/molecules/FetchError";

import EnvironmentBadgeGallerySkeleton, {
  ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT,
  renderEnvironmentBadgeTitle,
} from "@app/components/organisms/Badge/Skeleton/EnvironmentBadgeGallerySkeleton";

import { useSeededResource } from "@app/hooks/useSeededResource";
import {
  UserEnvironmentBadgeType,
  UserEnvironmentBadgesResponseType,
} from "@app/types/environment_badge";

async function fetchEnvironmentBadges(
  userId: string,
): Promise<UserEnvironmentBadgesResponseType> {
  const res = await fetch(`/api/users/${userId}/environment_badges`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return (await res.json()) as UserEnvironmentBadgesResponseType;
}
import { environmentBadgeImageUrl } from "@app/utils/badgeImage";
import { formatAchievedAt } from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
  // サーバ描画(dashboardServer)で取った値。あればこれを出し、取りに行かない
  initialBadges?: UserEnvironmentBadgesResponseType;
};

// 対戦環境(environments)ごとに、初めて対戦結果を追加したことを表すバッジパネル。
// badge_definitions/user_badges とは別の独立した仕組み(user_environment_badges)で、
// 閾値ではなく画像で実績を表現するため、BadgeGallery/OnboardingBadgePanelとは別コンポーネントとして
// 独立させている。

function EnvironmentBadgeTile({
  badge,
  onSelect,
}: {
  badge: UserEnvironmentBadgeType;
  onSelect: (badge: UserEnvironmentBadgeType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(badge)}
      className={`flex w-full flex-col items-center gap-1.5 px-1 py-3 rounded-xl text-center transition-transform active:scale-95 ${
        badge.achieved ? "bg-warning/10" : "bg-default-100"
      }`}
      aria-label={`${badge.title}の詳細を見る`}
    >
      <div
        className={`flex items-center justify-center w-11 h-11 ${
          badge.achieved ? "" : "rounded-lg bg-default-200 text-default-400"
        }`}
      >
        {badge.achieved ? (
          <Image
            alt={badge.title}
            src={environmentBadgeImageUrl(badge.environment_id)}
            radius="none"
            className="w-11 h-11 object-contain"
          />
        ) : (
          <LuLock className="w-5 h-5" />
        )}
      </div>
      <span
        className={`text-[0.6875rem] font-bold leading-tight ${
          badge.achieved ? "text-default-700" : "text-default-400"
        }`}
      >
        {renderEnvironmentBadgeTitle(badge.title)}
      </span>
    </button>
  );
}

export default function EnvironmentBadgeGallery({ userId, initialBadges }: Props) {
  // 取得に失敗したことを「獲得数 0 / 0」の空表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const {
    data,
    loading: isLoading,
    error,
    retry: loadBadges,
  } = useSeededResource(userId, fetchEnvironmentBadges, initialBadges);
  const badges = useMemo(() => (data ? (data.badges ?? []) : null), [data]);
  const [selectedBadge, setSelectedBadge] = useState<UserEnvironmentBadgeType | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function handleSelect(badge: UserEnvironmentBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  if (isLoading) {
    return <EnvironmentBadgeGallerySkeleton />;
  }

  if (error) {
    return <FetchError message="環境バッジの取得に失敗しました" onRetry={loadBadges} />;
  }

  const achievedCount = badges?.filter((b) => b.achieved).length ?? 0;
  const hasMore = (badges?.length ?? 0) > ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT;
  const visibleBadges = isExpanded
    ? (badges ?? [])
    : (badges ?? []).slice(0, ENVIRONMENT_BADGE_INITIAL_VISIBLE_COUNT);

  return (
    <Card className="shadow-md">
      <CardBody className="p-3 flex flex-col gap-2">
        <span className="text-xs font-bold text-default-500 shrink-0">
          獲得数 {achievedCount} / {badges?.length ?? 0}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {visibleBadges.map((badge) => (
            <EnvironmentBadgeTile
              key={badge.environment_id}
              badge={badge}
              onSelect={handleSelect}
            />
          ))}
        </div>
        {hasMore && (
          <Button
            size="sm"
            variant="light"
            className="text-default-500"
            onPress={() => setIsExpanded((prev) => !prev)}
            endContent={isExpanded ? <LuChevronUp /> : <LuChevronDown />}
          >
            {isExpanded ? "閉じる" : `すべて表示 (${badges?.length ?? 0})`}
          </Button>
        )}
      </CardBody>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
        <ModalContent>
          {selectedBadge && (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 pt-6 pb-2">
                <div
                  className={`flex items-center justify-center w-28 h-28 ${
                    selectedBadge.achieved
                      ? ""
                      : "rounded-lg bg-default-200 text-default-400"
                  }`}
                >
                  {selectedBadge.achieved ? (
                    <Image
                      alt={selectedBadge.title}
                      src={environmentBadgeImageUrl(selectedBadge.environment_id)}
                      radius="none"
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <LuLock className="w-12 h-12" />
                  )}
                </div>
                <span className="text-base font-black text-center">
                  {renderEnvironmentBadgeTitle(selectedBadge.title)}
                </span>
              </ModalHeader>
              <ModalBody className="pb-6 pt-0 text-center gap-1">
                <p className="text-sm text-default-600">
                  『{selectedBadge.title}』環境で対戦をした
                </p>
                {selectedBadge.achieved && selectedBadge.achieved_at && (
                  <p className="text-xs text-default-400 mt-1">
                    {formatAchievedAt(selectedBadge.achieved_at)}
                  </p>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
}
