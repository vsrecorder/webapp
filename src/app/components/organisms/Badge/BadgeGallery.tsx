"use client";

import { useEffect, useState, Fragment } from "react";
import {
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import {
  LuClipboardList,
  LuTrophy,
  LuLayers,
  LuMedal,
  LuFlame,
  LuAward,
  LuLock,
  LuUser,
} from "react-icons/lu";

import { UserBadgeType } from "@app/types/badge";

type Props = {
  userId: string;
  userCreatedAt?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "はじめの一歩",
  milestone: "マイルストーン",
  streak: "週次ストリーク",
};

const CATEGORY_ORDER = ["onboarding", "milestone", "streak"];

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
    badges: [...(byType.get(key) ?? [])].sort((a, b) => a.criteria_value - b.criteria_value),
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

function iconForKey(iconKey: string) {
  switch (iconKey) {
    case "user":
      return LuUser;
    case "record":
      return LuClipboardList;
    case "trophy":
      return LuTrophy;
    case "deck":
      return LuLayers;
    case "medal":
      return LuMedal;
    case "flame":
      return LuFlame;
    default:
      return LuAward;
  }
}

// 週次ストリークバッジ(例:「週次記録3週連続」)・マイルストーンバッジ
// (例:「駆け出しレコーダー」「駆け出しビルダー」「駆け出しバトラー」)はタイル幅が狭く
// 折り返しが不格好になるため、決まった区切り位置で明示的に改行して2行で見せる。
const BADGE_NAME_SUFFIXES = ["レコーダー", "ビルダー", "バトラー"];

function renderBadgeName(name: string) {
  const prefix = "週次記録";
  if (name.startsWith(prefix)) {
    return (
      <>
        {prefix}
        <br />
        {name.slice(prefix.length)}
      </>
    );
  }

  const suffix = BADGE_NAME_SUFFIXES.find((s) => name.endsWith(s));
  if (suffix) {
    return (
      <>
        {name.slice(0, name.length - suffix.length)}
        <br />
        {suffix}
      </>
    );
  }

  return name;
}

function BadgeTile({
  badge,
  onSelect,
}: {
  badge: UserBadgeType;
  onSelect: (badge: UserBadgeType) => void;
}) {
  const Icon = badge.achieved ? iconForKey(badge.icon_key) : LuLock;
  const progress =
    badge.criteria_value > 0
      ? Math.min(100, Math.round((badge.current_value / badge.criteria_value) * 100))
      : 0;
  // 「はじめの一歩」は基準値がほぼ1件のため、達成数の表示は不要
  const showCount = badge.category !== "onboarding";

  return (
    <button
      type="button"
      onClick={() => onSelect(badge)}
      className={`flex w-full flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-transform active:scale-95 ${
        badge.achieved ? "bg-warning/10" : "bg-default-100"
      }`}
      aria-label={`${badge.name}の詳細を見る`}
    >
      <div
        className={`flex items-center justify-center w-11 h-11 rounded-full ${
          badge.achieved
            ? "bg-warning/20 text-warning"
            : "bg-default-200 text-default-400"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span
        className={`text-[11px] font-bold leading-tight ${
          badge.achieved ? "text-default-700" : "text-default-400"
        }`}
      >
        {renderBadgeName(badge.name)}
      </span>
      {badge.achieved ? (
        <span className="text-[9px] font-bold text-warning">達成</span>
      ) : (
        <>
          <div className="w-full h-1 rounded-full bg-default-200 overflow-hidden">
            <div className="h-full bg-primary/60" style={{ width: `${progress}%` }} />
          </div>
          {showCount && (
            <span className="text-[9px] text-default-400 tabular-nums">
              {badge.current_value}/{badge.criteria_value}
            </span>
          )}
        </>
      )}
    </button>
  );
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

// BadgeTile と同じ構造(アイコン円+2行テキスト+進捗バー+件数)のプレースホルダー。
// 高さがBadgeTileの実サイズとズレるとロード完了時にガタつくため、内訳を揃えている。
// 「はじめの一歩」は件数表示を行わないため、showCount=false でその分の行を省く。
function BadgeTileSkeleton({ showCount = true }: { showCount?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-default-100">
      <div className="w-11 h-11 rounded-full bg-default-200 animate-pulse" />
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="w-3/4 h-2.5 rounded-full bg-default-200 animate-pulse" />
        <div className="w-1/2 h-2.5 rounded-full bg-default-200 animate-pulse" />
      </div>
      <div className="w-full h-1 rounded-full bg-default-200 animate-pulse" />
      {showCount && <div className="w-8 h-2 rounded-full bg-default-200 animate-pulse" />}
    </div>
  );
}

function formatAchievedAt(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日に獲得`;
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

          {[4, 12, 4].map((count, groupIndex) =>
            CATEGORY_ORDER[groupIndex] === "milestone" ? (
              <div key={groupIndex} className="flex flex-col gap-2">
                <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, subIndex) => (
                    <div key={subIndex} className="flex flex-col gap-1.5">
                      <div className="w-14 h-2 rounded-full bg-default-100 animate-pulse" />
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <BadgeTileSkeleton key={i} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={groupIndex} className="flex flex-col gap-2">
                <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: count }).map((_, i) => (
                    <BadgeTileSkeleton
                      key={i}
                      showCount={CATEGORY_ORDER[groupIndex] !== "onboarding"}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
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
            {group.category === "onboarding" ? (
              <div className="grid grid-cols-4 gap-2">
                {group.badges.map((badge) => (
                  <BadgeTile key={badge.id} badge={badge} onSelect={handleSelect} />
                ))}
              </div>
            ) : group.category === "milestone" ? (
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

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
        <ModalContent>
          {selectedBadge && (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 pt-6 pb-2">
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-full ${
                    selectedBadge.achieved
                      ? "bg-warning/20 text-warning"
                      : "bg-default-200 text-default-400"
                  }`}
                >
                  {(() => {
                    const Icon = selectedBadge.achieved
                      ? iconForKey(selectedBadge.icon_key)
                      : LuLock;
                    return <Icon className="w-7 h-7" />;
                  })()}
                </div>
                <span className="text-base font-black">{selectedBadge.name}</span>
              </ModalHeader>
              <ModalBody className="pb-6 pt-0 text-center gap-1">
                <p className="text-sm text-default-600">{selectedBadge.description}</p>
                {selectedBadge.achieved
                  ? selectedBadge.achieved_at && (
                      <p className="text-xs text-default-400 mt-1">
                        {formatAchievedAt(selectedBadge.achieved_at)}
                      </p>
                    )
                  : selectedBadge.category !== "onboarding" && (
                      <p className="text-xs text-default-400 mt-1 tabular-nums">
                        現在 {selectedBadge.current_value}/{selectedBadge.criteria_value}
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
