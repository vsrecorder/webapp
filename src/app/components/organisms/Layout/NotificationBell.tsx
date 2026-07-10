"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Image from "next/image";
import {
  Badge,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";
import {
  LuBell,
  LuAward,
  LuFlame,
  LuCrown,
  LuTrendingUp,
  LuCalendarDays,
  LuMegaphone,
} from "react-icons/lu";

import { NotificationType, NotificationCategory } from "@app/types/notification";
import { UserEnvironmentBadgeType } from "@app/types/environment_badge";
import { onNotificationsRefreshRequested } from "@app/utils/notificationEvents";
import { rankInfoForName } from "@app/utils/designationRank";
import { environmentBadgeImageUrl } from "@app/utils/badgeImage";

const NOTIFICATIONS_LIMIT = 30;
const POLL_INTERVAL_MS = 30 * 1000;

const CATEGORY_ICON: Record<
  NotificationCategory,
  React.ComponentType<{ className?: string }>
> = {
  badge: LuAward,
  streak: LuFlame,
  designation: LuCrown,
  rank: LuTrendingUp,
  official_event: LuCalendarDays,
  announcement: LuMegaphone,
};

// 通知本文の「モンスターボール級」のような「」内のランク名を抜き出す
function extractRankName(body: string): string | null {
  return body.match(/「(.+?)」/)?.[1] ?? null;
}

// 通知本文の「『スタン環境』環境で対戦をしました！」のような『』内の対戦環境名を抜き出す
// (environmentBadgeNotificationContent の本文フォーマットに対応)
function extractEnvironmentBadgeTitle(body: string): string | null {
  return body.match(/『(.+?)』環境で対戦をしました/)?.[1] ?? null;
}

// 通知本文の「🏆 竜王」のような「」内の"絵文字 称号名"から絵文字部分だけを抜き出す
function extractDesignationEmoji(body: string): string | null {
  return body.match(/「(\S+)\s/)?.[1] ?? null;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });

  if (diffMin < 60) return rtf.format(-diffMin, "minute");

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, "hour");

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return rtf.format(-diffDay, "day");

  // 7日以上前は相対表示ではなく日付そのものを表示する
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

type Props = {
  userId: string;
};

export default function NotificationBell({ userId }: Props) {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [environmentBadges, setEnvironmentBadges] = useState<UserEnvironmentBadgeType[]>(
    [],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // 環境バッジ通知(body内の対戦環境名)に対応する画像を引くためのタイトル→environment_idマップ
  const environmentIdByTitle = useMemo(
    () => new Map(environmentBadges.map((b) => [b.title, b.environment_id])),
    [environmentBadges],
  );

  const fetchEnvironmentBadges = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/environment_badges`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data: { badges: UserEnvironmentBadgeType[] } = await res.json();
      setEnvironmentBadges(data.badges ?? []);
    } catch {
      // ポーリング中の一時的な失敗は無視し、次回の再取得に任せる
    }
  }, [userId]);

  useEffect(() => {
    fetchEnvironmentBadges();
  }, [fetchEnvironmentBadges]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=${NOTIFICATIONS_LIMIT}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data: { notifications: NotificationType[] } = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      // ポーリング中の一時的な失敗は無視し、次回のポーリングに任せる
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    // 記録/対戦/デッキ登録の直後はポーリングを待たずその場で再取得する
    // (対戦環境バッジを新規獲得した直後でも画像アイコンが出せるよう、
    // バッジ一覧も通知と合わせて再取得する)
    const unsubscribe = onNotificationsRefreshRequested(() => {
      fetchNotifications();
      fetchEnvironmentBadges();
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [fetchNotifications, fetchEnvironmentBadges]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    fetch("/api/notifications/read_all", { method: "POST" }).catch(() => {});
  };

  const handleSelect = (notification: NotificationType) => {
    if (!notification.is_read) markAsRead(notification.id);
  };

  return (
    <Dropdown
      backdrop="opaque"
      classNames={{
        content:
          "min-w-80 max-w-80 p-1.5 rounded-2xl shadow-xl border border-default-100 dark:border-default-50",
      }}
    >
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          radius="full"
          aria-label="通知"
          className="text-white/70 hover:text-white"
        >
          <Badge
            content={unreadCount}
            color="danger"
            shape="circle"
            size="sm"
            showOutline={false}
            isInvisible={unreadCount === 0}
          >
            <LuBell className="text-xl" />
          </Badge>
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="通知一覧"
        variant="flat"
        disallowEmptySelection={false}
        classNames={{ list: "gap-1.5" }}
      >
        <DropdownSection aria-label="ヘッダー" showDivider={notifications.length > 0}>
          <DropdownItem
            key="notifications-header"
            isReadOnly
            textValue="通知"
            className="cursor-default data-[hover=true]:bg-transparent"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">通知</span>
                <Chip
                  size="sm"
                  color="warning"
                  variant="flat"
                  classNames={{
                    base: "h-5 px-0.5",
                    content: "text-[10px] font-black px-1.5",
                  }}
                >
                  ベータ版
                </Chip>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-tiny text-primary hover:underline"
                >
                  すべて既読にする
                </button>
              )}
            </div>
          </DropdownItem>
        </DropdownSection>

        <DropdownSection
          aria-label="通知リスト"
          classNames={{ group: "max-h-[430px] overflow-y-auto" }}
        >
          {notifications.length === 0 ? (
            <DropdownItem
              key="empty"
              isReadOnly
              textValue="通知はありません"
              className="cursor-default data-[hover=true]:bg-transparent"
            >
              <p className="text-center text-tiny text-default-400 py-4">
                通知はありません
              </p>
            </DropdownItem>
          ) : (
            notifications.map((notification, index) => {
              const Icon = CATEGORY_ICON[notification.category];
              const isLast = index === notifications.length - 1;
              const rankImage =
                notification.category === "rank"
                  ? rankInfoForName(extractRankName(notification.body) ?? "")?.image
                  : null;
              const designationEmoji =
                notification.category === "designation"
                  ? extractDesignationEmoji(notification.body)
                  : null;
              const environmentBadgeTitle =
                notification.category === "badge"
                  ? extractEnvironmentBadgeTitle(notification.body)
                  : null;
              const environmentBadgeId = environmentBadgeTitle
                ? environmentIdByTitle.get(environmentBadgeTitle)
                : undefined;

              return (
                <DropdownItem
                  key={notification.id}
                  textValue={notification.title}
                  startContent={
                    environmentBadgeId ? (
                      // 他のバッジ通知(w-4のアイコン)とテキストの開始位置が揃うよう、
                      // 占有幅はアイコンと同じ w-4 に固定し、画像自体は絶対配置で
                      // はみ出させて大きく見せる。
                      <div className="relative w-4 h-4 shrink-0">
                        <Image
                          src={environmentBadgeImageUrl(environmentBadgeId)}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 object-contain"
                        />
                      </div>
                    ) : rankImage ? (
                      <Image
                        src={rankImage}
                        alt=""
                        width={26}
                        height={26}
                        unoptimized
                        className="w-6.5 h-6.5 shrink-0 object-contain -ml-1"
                      />
                    ) : designationEmoji ? (
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">
                        {designationEmoji}
                      </span>
                    ) : (
                      <Icon className="w-4 h-4 shrink-0 text-default-500" />
                    )
                  }
                  className={[
                    !isLast && "border-b border-default-200 dark:border-default-200",
                    notification.is_read
                      ? ""
                      : "mt-1.5 mb-1.5 bg-primary-50 dark:bg-primary-950/30",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPress={() => handleSelect(notification)}
                >
                  <div className="flex flex-col gap-1 py-1">
                    <div className="flex items-center gap-1.5">
                      {!notification.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {notification.title}
                      </span>
                    </div>
                    <span className="text-tiny text-default-400 line-clamp-2">
                      {notification.body}
                    </span>
                    <span className="text-tiny text-default-300">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                </DropdownItem>
              );
            })
          )}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
