"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, Card, CardBody, useDisclosure } from "@heroui/react";
import {
  LuSwords,
  LuTrophy,
  LuShield,
  LuPencil,
  LuEye,
  LuEyeOff,
  LuIdCard,
  LuCircleCheck,
} from "react-icons/lu";

import UpdateNameModal from "@app/components/organisms/User/Modal/UpdateNameModal";
import FetchError from "@app/components/molecules/FetchError";

import { UserType } from "@app/types/user";
import { UserStatType } from "@app/types/user_stat";
import { UserPlayerType } from "@app/types/user_player";
import { formatDateJa } from "@app/utils/calendar";

const CHAMPION_SHIP_POINT_ICON_URL =
  "https://xx8nnpgt.user.webaccel.jp/images/icons/csp_icon.png";

type Props = {
  user: UserType;
  isDevEnv?: boolean;
  userCreatedAt?: string;
};

// JST で現在の年月("YYYY-MM")を返す
function getCurrentYearMonthValue(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function yearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

// 登録月(なければ直近12ヶ月)〜当月までの年月選択肢を新しい順で生成する
function generateYearMonthOptions(createdAt?: Date) {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const start = createdAt
    ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: yearMonthLabel(value) });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return options;
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

function winRateColor(rate: number): string {
  if (rate >= 0.55) return "text-emerald-300";
  if (rate >= 0.45) return "text-white";
  if (rate >= 0.4) return "text-amber-300";
  return "text-rose-300";
}

type WinRateBadgeProps = {
  winRate: number;
  isLoading: boolean;
  // 戦績の取得に失敗したか。0.0%と表示すると「勝率0%」と読めてしまうため、値は伏せる
  hasError: boolean;
  yearMonth: string;
  yearMonthOptions: { value: string; label: string }[];
  onYearMonthChange: (value: string) => void;
  hidden: boolean;
  onToggle: () => void;
};

function WinRateBadge({
  winRate,
  isLoading,
  hasError,
  yearMonth,
  yearMonthOptions,
  onYearMonthChange,
  hidden,
  onToggle,
}: WinRateBadgeProps) {
  // winRate は 0〜1 なので ×1000 して小数1桁精度でカウントアップ
  const animated = useCountUp(isLoading ? 0 : winRate * 1000, 900);
  const pct = (animated / 10).toFixed(1);
  const color = isLoading ? "text-white/30" : winRateColor(winRate);

  return (
    <div className="flex flex-col justify-center items-end gap-0.5">
      <div className="relative flex items-center">
        <select
          value={yearMonth}
          onChange={(e) => onYearMonthChange(e.target.value)}
          aria-label="表示する年月を選択"
          className="appearance-none bg-transparent text-white/90 text-[12px] font-semibold text-right pr-3.5 focus:outline-none [&>option]:text-default-700"
        >
          {yearMonthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-0 text-white/70 text-[8px]">
          ▼
        </span>
      </div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-white/70 hover:text-white/90 transition-colors pb-1"
        aria-label={hidden ? "戦績を表示する" : "戦績を非表示にする"}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest">WIN RATE</span>
        {hidden ? (
          <LuEyeOff className="w-3 h-3 shrink-0" />
        ) : (
          <LuEye className="w-3 h-3 shrink-0" />
        )}
      </button>
      <button
        onClick={onToggle}
        className="pb-0.5"
        aria-label={hidden ? "戦績を表示する" : "戦績を非表示にする"}
      >
        {hidden ? (
          <span className="text-3xl font-black text-white/30 leading-none">——</span>
        ) : hasError ? (
          <span className="text-3xl font-black text-white/30 leading-none">—</span>
        ) : isLoading ? (
          <span className="text-3xl font-black text-white/30 animate-pulse leading-none">
            —
          </span>
        ) : (
          <span className={`text-3xl font-black leading-none tabular-nums ${color}`}>
            {pct}
            <span className="text-base font-bold">%</span>
          </span>
        )}
      </button>
    </div>
  );
}

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
  hidden: boolean;
  colorClass?: string;
};

function StatChip({
  icon,
  label,
  value,
  isLoading,
  hidden,
  colorClass = "text-default-700",
}: StatChipProps) {
  const animated = useCountUp(isLoading ? 0 : value);

  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-default-100">
      <div className={`text-sm ${isLoading ? "text-default-300" : colorClass}`}>
        {icon}
      </div>
      {hidden ? (
        <span className="text-lg font-black text-default-300 leading-none">——</span>
      ) : isLoading ? (
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

type PlayersClubBadgeProps = {
  isLoading: boolean;
  userPlayer: UserPlayerType | null;
};

function PlayersClubBadge({ isLoading, userPlayer }: PlayersClubBadgeProps) {
  const animatedPoint = useCountUp(
    isLoading || userPlayer?.champion_ship_point == null
      ? 0
      : userPlayer.champion_ship_point,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="w-28 h-3 rounded-full bg-white/20 animate-pulse" />
        <span className="ml-2 w-44 h-8 rounded-full bg-white/20 animate-pulse" />
      </div>
    );
  }

  if (userPlayer) {
    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-white/80 text-[10px] font-medium">
          <LuCircleCheck className="w-3 h-3 shrink-0" />
          プレイヤーズクラブ連携済み
        </span>
        <div className="inline-flex items-center w-fit ml-2 gap-1.5 rounded-full bg-white/15 pl-1.5 pr-3 py-1">
          <Image
            src={CHAMPION_SHIP_POINT_ICON_URL}
            alt=""
            width={22}
            height={22}
            unoptimized
            className="shrink-0"
          />
          <span className="text-white text-xl font-black leading-none tabular-nums">
            {Math.round(animatedPoint).toLocaleString()}
            <span className="text-xs font-bold ml-0.5">pt</span>
          </span>
          {userPlayer.ranking_date !== null && (
            <span className="text-white/60 text-[9px] font-medium ml-1.5">
              {formatDateJa(userPlayer.ranking_date)}現在
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/users?link_player=1"
      className="flex items-center gap-1 text-white/80 hover:text-white text-[10px] font-medium underline underline-offset-2"
    >
      <LuIdCard className="w-3 h-3 shrink-0" />
      プレイヤーズクラブと連携する
    </Link>
  );
}

const STATS_VISIBLE_KEY = "profile_stats_visible";

export default function UserProfileCard({
  user,
  isDevEnv = false,
  userCreatedAt,
}: Props) {
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statError, setStatError] = useState(false);
  const [userPlayer, setUserPlayer] = useState<UserPlayerType | null>(null);
  const [isUserPlayerLoading, setIsUserPlayerLoading] = useState(true);
  const [isPlayersClubFeatureDisabled, setIsPlayersClubFeatureDisabled] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, imageUrl: user.image_url });
  const [statsVisible, setStatsVisible] = useState(true);
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonthValue);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);

  useEffect(() => {
    const stored = localStorage.getItem(STATS_VISIBLE_KEY);
    if (stored !== null) setStatsVisible(stored !== "false");
  }, []);

  function toggleStatsVisible() {
    setStatsVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STATS_VISIBLE_KEY, String(next));
      return next;
    });
  }

  // 取得に失敗したことを「勝率0.0% / 0戦0勝0敗」の表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、戦績の部分だけで取り直せるようにする。
  const loadStat = useCallback(async () => {
    setStatError(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/stat?year_month=${yearMonth}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data: UserStatType = await res.json();

      setStat(data);
    } catch (err) {
      console.log(err);
      setStatError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, yearMonth]);

  useEffect(() => {
    loadStat();
  }, [loadStat]);

  useEffect(() => {
    setIsUserPlayerLoading(true);
    fetch("/api/usersplayers", { cache: "no-store" })
      .then((r) => {
        if (r.status === 503) {
          setIsPlayersClubFeatureDisabled(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        setUserPlayer(data);
        setIsUserPlayerLoading(false);
      })
      .catch(() => setIsUserPlayerLoading(false));
  }, []);

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
        {/* グラデーションヘッダー（dev環境は本番と一目で区別できるようオレンジ系にする） */}
        <div
          className={`px-3 pt-4 pb-5 flex items-center gap-3.5 ${
            isDevEnv
              ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
              : "bg-linear-to-br from-primary via-primary to-secondary"
          }`}
        >
          <button onClick={onOpen} className="shrink-0" aria-label="プロフィールを編集">
            <Avatar
              src={profile.imageUrl}
              size="lg"
              isBordered
              color="default"
              classNames={{ base: "ring-2 ring-white/40" }}
            />
          </button>
          <div className="min-w-0 overflow-hidden flex flex-col gap-1">
            <button
              onClick={onOpen}
              className="min-w-0 overflow-hidden text-white/60 hover:text-white/90 transition-colors"
              aria-label="プロフィールを編集"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white font-black text-base leading-tight truncate min-w-0">
                  {profile.name}
                </span>
                <LuPencil className="w-3.5 h-3.5 shrink-0" />
              </div>
            </button>
            {!isPlayersClubFeatureDisabled && (
              <PlayersClubBadge isLoading={isUserPlayerLoading} userPlayer={userPlayer} />
            )}
          </div>
          <div className="ml-auto shrink-0">
            <WinRateBadge
              winRate={stat?.win_rate ?? 0}
              isLoading={isLoading}
              hasError={statError}
              yearMonth={yearMonth}
              yearMonthOptions={yearMonthOptions}
              onYearMonthChange={setYearMonth}
              hidden={!statsVisible}
              onToggle={toggleStatsVisible}
            />
          </div>
        </div>

        {/* 統計グリッド。取得に失敗したときは0件の戦績を装わず、ここだけをエラー表示に置き換える
            （プロフィール部分は表示したままにする） */}
        <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
          {statError ? (
            <FetchError message="戦績の取得に失敗しました" onRetry={loadStat} compact />
          ) : (
            <div className="grid grid-cols-3 gap-5">
              <StatChip
                icon={<LuSwords className="w-3.5 h-3.5" />}
                label="試合数"
                value={stat?.total_matches ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
              />
              <StatChip
                icon={<LuTrophy className="w-3.5 h-3.5" />}
                label="勝利"
                value={stat?.wins ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
                colorClass="text-success"
              />
              <StatChip
                icon={<LuShield className="w-3.5 h-3.5" />}
                label="敗北"
                value={stat?.losses ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
                colorClass="text-danger"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
