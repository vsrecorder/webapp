"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, Card, CardBody, useDisclosure } from "@heroui/react";
import { LuSwords, LuTrophy, LuShield, LuCalendar, LuPencil } from "react-icons/lu";

import UpdateNameModal from "@app/components/organisms/User/Modal/UpdateNameModal";

import { UserType } from "@app/types/user";
import { UserStatType } from "@app/types/user_stat";

type Props = {
  user: UserType;
};

// JST で現在の年月を返す
function getCurrentYearMonth(): { yearMonth: string; label: string } {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return {
    yearMonth: `${year}-${String(month).padStart(2, "0")}`,
    label: `${year}年${month}月`,
  };
}

// target が変わったとき from → target へアニメーション
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (target === from) return;

    const startTime = performance.now();
    let raf: number;

    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function formatJoinDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月からバトレコを利用`;
}

function winRateColor(rate: number): string {
  if (rate >= 0.55) return "text-emerald-300";
  if (rate >= 0.45) return "text-white";
  if (rate >= 0.4) return "text-amber-300";
  return "text-rose-300";
}

type WinRateBadgeProps = {
  winRate: number;
  isLoading: boolean;
  monthLabel: string;
};

function WinRateBadge({ winRate, isLoading, monthLabel }: WinRateBadgeProps) {
  // winRate は 0〜1 なので ×1000 して小数1桁精度でカウントアップ
  const animated = useCountUp(isLoading ? 0 : winRate * 1000, 900);
  const pct = (animated / 10).toFixed(1);
  const color = isLoading ? "text-white/30" : winRateColor(winRate);

  return (
    <div className="flex flex-col justify-center  items-end gap-0.5">
      <span className="text-white/90 text-[12px] font-semibold">{monthLabel}</span>
      <span className="text-white/70 text-[9px] font-bold uppercase tracking-widest pb-1">
        WIN RATE
      </span>
      {isLoading ? (
        <span className="pb-0.5 text-3xl font-black text-white/30 animate-pulse leading-none">
          —
        </span>
      ) : (
        <span className={`text-3xl font-black leading-none tabular-nums ${color}`}>
          {pct}
          <span className="text-base font-bold">%</span>
        </span>
      )}
    </div>
  );
}

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
  colorClass?: string;
};

function StatChip({
  icon,
  label,
  value,
  isLoading,
  colorClass = "text-default-700",
}: StatChipProps) {
  const animated = useCountUp(isLoading ? 0 : value);

  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-default-100">
      <div className={`text-sm ${isLoading ? "text-default-300" : colorClass}`}>
        {icon}
      </div>
      {isLoading ? (
        <span className="text-lg font-black text-default-300 animate-pulse leading-none">
          —
        </span>
      ) : (
        <span className={`text-lg font-black tabular-nums leading-none ${colorClass}`}>
          {Math.round(animated).toLocaleString()}
        </span>
      )}
      <span className="text-[9px] font-bold text-default-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default function UserProfileCard({ user }: Props) {
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState({ name: user.name, imageUrl: user.image_url });
  const { yearMonth, label: monthLabel } = getCurrentYearMonth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${user.id}/stat?year_month=${yearMonth}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setStat(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [user.id, yearMonth]);

  return (
    <>
      <UpdateNameModal
        userId={user.id}
        currentName={profile.name}
        imageUrl={profile.imageUrl}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onUpdated={setProfile}
      />
      <Card className="overflow-hidden shadow-md">
      {/* グラデーションヘッダー */}
      <div className="bg-linear-to-br from-primary via-primary to-secondary px-4 pt-4 pb-5 flex items-center gap-3.5">
        <button onClick={onOpen} className="shrink-0" aria-label="プロフィールを編集">
          <Avatar
            src={profile.imageUrl}
            size="lg"
            isBordered
            color="default"
            classNames={{ base: "ring-2 ring-white/40" }}
          />
        </button>
        <button
          onClick={onOpen}
          className="min-w-0 overflow-hidden text-white/60 hover:text-white/90 transition-colors"
          aria-label="プロフィールを編集"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-black text-base leading-tight truncate min-w-0">
                {profile.name}
              </span>
              <LuPencil className="w-3.5 h-3.5 shrink-0" />
            </div>
            <span className="flex items-center gap-1 text-white/80 text-[10px] font-medium">
              <LuCalendar className="w-3 h-3 shrink-0" />
              {formatJoinDate(String(user.created_at))}
            </span>
          </div>
        </button>
        <div className="ml-auto shrink-0">
          <WinRateBadge
            winRate={stat?.win_rate ?? 0}
            isLoading={isLoading}
            monthLabel={monthLabel}
          />
        </div>
      </div>

      {/* 統計グリッド */}
      <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
        <div className="grid grid-cols-3 gap-5">
          <StatChip
            icon={<LuSwords className="w-3.5 h-3.5" />}
            label="試合数"
            value={stat?.total_matches ?? 0}
            isLoading={isLoading}
          />
          <StatChip
            icon={<LuTrophy className="w-3.5 h-3.5" />}
            label="勝利"
            value={stat?.wins ?? 0}
            isLoading={isLoading}
            colorClass="text-success"
          />
          <StatChip
            icon={<LuShield className="w-3.5 h-3.5" />}
            label="敗北"
            value={stat?.losses ?? 0}
            isLoading={isLoading}
            colorClass="text-danger"
          />
        </div>
      </CardBody>
    </Card>
    </>
  );
}
