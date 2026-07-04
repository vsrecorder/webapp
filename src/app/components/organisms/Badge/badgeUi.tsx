"use client";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
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

// BadgeGallery(バッジ) と OnboardingBadgePanel(はじめの一歩) で共通して使う
// バッジ表示部品。両パネルは DashboardSections 上で独立して表示/非表示・並び替えできる
// 必要があるため、それぞれ別コンポーネント・別フェッチとして分離しつつ、見た目を揃えている。

export function iconForKey(iconKey: string) {
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

export function formatAchievedAt(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日に獲得`;
}

// 週次ストリークバッジ(例:「週次記録3週連続」)・マイルストーンバッジ
// (例:「駆け出しユーザー」「駆け出しビルダー」「駆け出しバトラー」)はタイル幅が狭く
// 折り返しが不格好になるため、決まった区切り位置で明示的に改行して2行で見せる。
const BADGE_NAME_SUFFIXES = ["ユーザー", "ビルダー", "バトラー"];

export function renderBadgeName(name: string) {
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

export function BadgeTile({
  badge,
  onSelect,
  showCount = true,
}: {
  badge: UserBadgeType;
  onSelect: (badge: UserBadgeType) => void;
  showCount?: boolean;
}) {
  const Icon = badge.achieved ? iconForKey(badge.icon_key) : LuLock;
  const progress =
    badge.criteria_value > 0
      ? Math.min(100, Math.round((badge.current_value / badge.criteria_value) * 100))
      : 0;

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
      <div className="w-full h-1 rounded-full bg-default-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${badge.achieved ? "bg-warning" : "bg-primary/60"}`}
          style={{ width: `${badge.achieved ? 100 : progress}%` }}
        />
      </div>
      <span
        className={`text-[9px] tabular-nums ${
          badge.achieved ? "font-bold text-warning" : "text-default-400"
        }`}
      >
        {badge.achieved
          ? "達成"
          : showCount
            ? `${badge.current_value}/${badge.criteria_value}`
            : " "}
      </span>
    </button>
  );
}

// BadgeTile と同じ構造(アイコン円+テキスト+進捗バー+件数)のプレースホルダー。
// 高さがBadgeTileの実サイズとズレるとロード完了時にガタつくため、内訳を揃えている。
export function BadgeTileSkeleton({
  singleLineName = false,
}: {
  singleLineName?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-default-100">
      <div className="w-11 h-11 rounded-full bg-default-200 animate-pulse" />
      {singleLineName ? (
        <div className="w-3/5 h-2.5 rounded-full bg-default-200 animate-pulse" />
      ) : (
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="w-3/4 h-2.5 rounded-full bg-default-200 animate-pulse" />
          <div className="w-1/2 h-2.5 rounded-full bg-default-200 animate-pulse" />
        </div>
      )}
      <div className="w-full h-1 rounded-full bg-default-200 animate-pulse" />
      <div className="w-8 h-2 rounded-full bg-default-200 animate-pulse" />
    </div>
  );
}

export function BadgeDetailModal({
  badge,
  isOpen,
  onOpenChange,
}: {
  badge: UserBadgeType | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
      <ModalContent>
        {badge && (
          <>
            <ModalHeader className="flex flex-col items-center gap-2 pt-6 pb-2">
              <div
                className={`flex items-center justify-center w-14 h-14 rounded-full ${
                  badge.achieved
                    ? "bg-warning/20 text-warning"
                    : "bg-default-200 text-default-400"
                }`}
              >
                {(() => {
                  const Icon = badge.achieved ? iconForKey(badge.icon_key) : LuLock;
                  return <Icon className="w-7 h-7" />;
                })()}
              </div>
              <span className="text-base font-black">{badge.name}</span>
            </ModalHeader>
            <ModalBody className="pb-6 pt-0 text-center gap-1">
              <p className="text-sm text-default-600">{badge.description}</p>
              {badge.achieved
                ? badge.achieved_at && (
                    <p className="text-xs text-default-400 mt-1">
                      {formatAchievedAt(badge.achieved_at)}
                    </p>
                  )
                : badge.category !== "onboarding" && (
                    <p className="text-xs text-default-400 mt-1 tabular-nums">
                      現在 {badge.current_value}/{badge.criteria_value}
                    </p>
                  )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
