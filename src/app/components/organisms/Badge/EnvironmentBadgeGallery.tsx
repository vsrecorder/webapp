"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Image,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { LuLock, LuChevronDown, LuChevronUp } from "react-icons/lu";

import { UserEnvironmentBadgeType } from "@app/types/environment_badge";
import { environmentBadgeImageUrl } from "@app/utils/badgeImage";
import { formatAchievedAt } from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
};

// 対戦環境(environments)ごとに、初めて対戦結果を追加したことを表すバッジパネル。
// badge_definitions/user_badges とは別の独立した仕組み(user_environment_badges)で、
// 閾値ではなく画像で実績を表現するため、BadgeGallery/OnboardingBadgePanelとは別コンポーネントとして
// 独立させている。

// 1行3列で表示し、多い場合は初期表示を2行分に折りたたむ。
const COLUMN_COUNT = 3;
const INITIAL_VISIBLE_ROWS = 2;
const INITIAL_VISIBLE_COUNT = COLUMN_COUNT * INITIAL_VISIBLE_ROWS;

// "/"区切りやスペース区切りのタイトル(例:「スタン/ローテ」「シティリーグ 2024」)は
// タイル幅が狭く不格好に折り返されるため、区切り文字の直後で明示的に改行する。
function renderEnvironmentBadgeTitle(title: string) {
  const segments = title.split(/(?<=[/ ])/);
  return segments.map((segment, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {segment}
    </Fragment>
  ));
}

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
        className={`text-[11px] font-bold leading-tight ${
          badge.achieved ? "text-default-700" : "text-default-400"
        }`}
      >
        {renderEnvironmentBadgeTitle(badge.title)}
      </span>
    </button>
  );
}

// EnvironmentBadgeTile と同じ構造(画像枠+テキスト)のプレースホルダー。
// アイコンバッジ用の BadgeTileSkeleton は円形前提のため、画像の形に合わせたこちら専用のものを使う。
function EnvironmentBadgeTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 py-3 rounded-xl bg-default-100">
      <div className="w-11 h-11 rounded-lg bg-default-200 animate-pulse" />
      <div className="w-4/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
    </div>
  );
}

export default function EnvironmentBadgeGallery({ userId }: Props) {
  const [badges, setBadges] = useState<UserEnvironmentBadgeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<UserEnvironmentBadgeType | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  function handleSelect(badge: UserEnvironmentBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}/environment_badges`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBadges(data?.badges ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-2">
          <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
          <div className="grid grid-cols-3 gap-2 -mx-3">
            {Array.from({ length: INITIAL_VISIBLE_COUNT }).map((_, i) => (
              <EnvironmentBadgeTileSkeleton key={i} />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const achievedCount = badges?.filter((b) => b.achieved).length ?? 0;
  const hasMore = (badges?.length ?? 0) > INITIAL_VISIBLE_COUNT;
  const visibleBadges = isExpanded
    ? (badges ?? [])
    : (badges ?? []).slice(0, INITIAL_VISIBLE_COUNT);

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
