"use client";

import { useEffect, useState, Fragment } from "react";
import { Card, CardBody, useDisclosure } from "@heroui/react";

import { UserBadgeType } from "@app/types/badge";
import {
  BadgeDetailModal,
  BadgeTile,
  BadgeTileSkeleton,
} from "@app/components/organisms/Badge/badgeUi";

type Props = {
  userId: string;
  userCreatedAt?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  milestone: "マイルストーン",
  streak: "週次ストリーク",
};

const CATEGORY_ORDER = ["milestone", "streak"];

// マイルストーンは記録数・デッキ数・対戦数の3系統がそれぞれ独立した昇格トラックのため、
// criteria_type ごとに分けて1系統=1行の「左→右」の流れとして見せる。
const MILESTONE_SUBGROUP_LABELS: Record<string, string> = {
  record_count: "記録数",
  deck_count: "デッキ数",
  match_count: "対戦数",
};

function subgroupByCriteriaType(
  badges: UserBadgeType[],
): { key: string; label: string; badges: UserBadgeType[] }[] {
  const order: string[] = [];
  const byType = new Map<string, UserBadgeType[]>();
  for (const badge of badges) {
    if (!byType.has(badge.criteria_type)) {
      order.push(badge.criteria_type);
    }
    const list = byType.get(badge.criteria_type) ?? [];
    list.push(badge);
    byType.set(badge.criteria_type, list);
  }
  return order.map((key) => ({
    key,
    label: MILESTONE_SUBGROUP_LABELS[key] ?? key,
    badges: [...(byType.get(key) ?? [])].sort(
      (a, b) => a.criteria_value - b.criteria_value,
    ),
  }));
}

function getCurrentSeason(): string {
  const now = new Date();
  // 9月(month=8)以降なら翌年がシーズン開始年、それ以前なら当年
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return String(year);
}

function generateSeasonOptions(createdAt?: Date): { value: string; label: string }[] {
  const now = new Date();
  const currentSeason = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const firstSeason = createdAt
    ? createdAt.getMonth() >= 8
      ? createdAt.getFullYear() + 1
      : createdAt.getFullYear()
    : currentSeason;
  const options: { value: string; label: string }[] = [];
  for (let s = currentSeason; s >= firstSeason; s--) {
    options.push({ value: String(s), label: `${s}シーズン` });
  }
  return options;
}

// マイルストーン・週次ストリークのように「易→難」の順で1本道になっているバッジ群を、
// 左から右へ">"でつないで昇格の流れを表現する行。DesignationPanelの称号ロードマップと
// 同じ区切り記号を使い、見た目の統一感を揃えている。
function BadgeFlowRow({
  badges,
  onSelect,
}: {
  badges: UserBadgeType[];
  onSelect: (badge: UserBadgeType) => void;
}) {
  return (
    <div className="flex items-stretch gap-1">
      {badges.map((badge, i) => (
        <Fragment key={badge.id}>
          <div className="flex-1 min-w-0">
            <BadgeTile badge={badge} onSelect={onSelect} />
          </div>
          {i < badges.length - 1 && (
            <span className="self-center shrink-0 text-warning/70 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

// BadgeFlowRow と同じ構造(タイル+"▶"区切り)のプレースホルダー。
// マイルストーン・週次ストリークは実際は▶で繋がる横並びのため、区切り分の幅もスケルトンに反映する。
function BadgeFlowRowSkeleton({ count }: { count: number }) {
  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Fragment key={i}>
          <div className="flex-1 min-w-0">
            <BadgeTileSkeleton />
          </div>
          {i < count - 1 && (
            <span className="self-center shrink-0 text-default-300 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function BadgeGallery({ userId, userCreatedAt }: Props) {
  const [badges, setBadges] = useState<UserBadgeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeType | null>(null);
  const [season, setSeason] = useState(getCurrentSeason());
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const seasonOptions = generateSeasonOptions(
    userCreatedAt ? new Date(userCreatedAt) : undefined,
  );

  function handleSelect(badge: UserBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}/badges?season=${season}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBadges(data?.badges ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [userId, season]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-20 h-3 rounded-full bg-default-100 animate-pulse" />
            <div className="w-24 h-8 rounded-xl bg-default-100 animate-pulse" />
          </div>

          {CATEGORY_ORDER.map((category) => (
            <div key={category} className="flex flex-col gap-2">
              <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
              {category === "milestone" ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, subIndex) => (
                    <div key={subIndex} className="flex flex-col gap-1.5">
                      <div className="w-14 h-2 rounded-full bg-default-100 animate-pulse" />
                      <BadgeFlowRowSkeleton count={4} />
                    </div>
                  ))}
                </div>
              ) : (
                <BadgeFlowRowSkeleton count={4} />
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  const achievedCount = badges?.filter((b) => b.achieved).length ?? 0;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    badges: (badges ?? []).filter((b) => b.category === category),
  })).filter((g) => g.badges.length > 0);

  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-default-500 shrink-0">
            獲得数 {achievedCount} / {badges?.length ?? 0}
          </span>
          <div className="relative inline-block shrink-0">
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="appearance-none rounded-xl border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {seasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-default-400">{group.label}</span>
            {group.category === "milestone" ? (
              <div className="flex flex-col gap-3">
                {subgroupByCriteriaType(group.badges).map((sub) => (
                  <div key={sub.key} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-default-300">
                      {sub.label}
                    </span>
                    <BadgeFlowRow badges={sub.badges} onSelect={handleSelect} />
                  </div>
                ))}
              </div>
            ) : (
              <BadgeFlowRow badges={group.badges} onSelect={handleSelect} />
            )}
          </div>
        ))}
      </CardBody>

      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </Card>
  );
}
