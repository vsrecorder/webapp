"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, Tabs, Tab } from "@heroui/react";

import UserStatPanelSkeleton from "@app/components/organisms/UserStat/Skeleton/UserStatPanelSkeleton";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { UserStatType } from "@app/types/user_stat";

type FilterMode = "month" | "environment" | "season" | "regulation";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  userCreatedAt?: string;
};

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

function generateYearMonthOptions(createdAt?: Date) {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const start = createdAt
    ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return options;
}

function WinRateDisplay({ winRate, isLoading }: { winRate: number; isLoading: boolean }) {
  const pct = (winRate * 100).toFixed(1);
  const color =
    winRate === 0
      ? "text-default-500"
      : winRate >= 0.55
        ? "text-success"
        : winRate >= 0.45
          ? "text-default-500"
          : winRate >= 0.4
            ? "text-warning"
            : "text-danger";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold text-default-400 uppercase tracking-wider">
        勝率
      </span>
      <span
        className={`text-4xl font-black tabular-nums transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"} ${color}`}
      >
        {pct}
        <span className="text-xl font-bold">%</span>
      </span>
    </div>
  );
}

function StatCell({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-3 rounded-xl bg-default-100">
      <span className="text-[10px] font-bold text-default-400 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xl font-black tabular-nums transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"}`}
      >
        {value.toLocaleString("ja-JP")}
      </span>
    </div>
  );
}

export default function UserStatPanel({
  userId,
  environments,
  currentEnvironmentId,
  standardRegulations,
  userCreatedAt,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("environment");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environmentId, setEnvironmentId] = useState<string>(
    currentEnvironmentId ?? environments[0]?.id ?? "",
  );
  const [season, setSeason] = useState<string>(getCurrentSeason);
  const [regulationId, setRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);
  const seasonOptions = generateSeasonOptions(createdAtDate);

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && regulationId) {
          params.set("regulation_id", regulationId);
        }

        const res = await fetch(`/api/users/${userId}/stat?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: UserStatType = await res.json();
        if (!cancelled) setStat(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStat();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId]);

  const filterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === regulationId)?.marks ?? ""}』`;

  if (isLoading && !stat) {
    return <UserStatPanelSkeleton />;
  }

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* フィルタータブ */}
        <Tabs
          fullWidth
          size="sm"
          selectedKey={filterMode}
          onSelectionChange={(key) => setFilterMode(key as FilterMode)}
          classNames={{
            tab: "h-7",
            tabContent: "font-bold text-xs",
          }}
        >
          <Tab key="month" title="月別" />
          <Tab key="environment" title="環境別" />
          <Tab key="season" title="シーズン別" />
          <Tab key="regulation" title="レギュレーション別" />
        </Tabs>

        {/* セレクタ */}
        <div className="relative">
          <select
            value={
              filterMode === "month"
                ? yearMonth
                : filterMode === "environment"
                  ? environmentId
                  : filterMode === "season"
                    ? season
                    : regulationId
            }
            onChange={(e) => {
              if (filterMode === "month") {
                setYearMonth(e.target.value);
              } else if (filterMode === "environment") {
                setEnvironmentId(e.target.value);
              } else if (filterMode === "season") {
                setSeason(e.target.value);
              } else {
                setRegulationId(e.target.value);
              }
            }}
            className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {filterMode === "month"
              ? yearMonthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : filterMode === "environment"
                ? environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      『{env.title}』
                    </option>
                  ))
                : filterMode === "season"
                  ? seasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  : standardRegulations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        『{reg.marks}』
                      </option>
                    ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
            ▼
          </span>
        </div>

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-2">{filterLabel} の戦績</p>

        {/* 統計グリッド */}
        <StatCell
          label="対戦記録"
          value={stat?.total_records ?? 0}
          isLoading={isLoading}
        />
        <div className="grid grid-cols-3 gap-2">
          <StatCell
            label="公式イベント"
            value={stat?.official_event_count ?? 0}
            isLoading={isLoading}
          />
          <StatCell
            label="Tonamel"
            value={stat?.tonamel_event_count ?? 0}
            isLoading={isLoading}
          />
          <StatCell
            label="記入形式"
            value={stat?.unofficial_event_count ?? 0}
            isLoading={isLoading}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCell
            label="試合数"
            value={stat?.total_matches ?? 0}
            isLoading={isLoading}
          />
          <StatCell label="勝利" value={stat?.wins ?? 0} isLoading={isLoading} />
          <StatCell label="敗北" value={stat?.losses ?? 0} isLoading={isLoading} />
        </div>

        {/* 勝率 */}
        <WinRateDisplay winRate={stat?.win_rate ?? 0} isLoading={isLoading} />
      </CardBody>
    </Card>
  );
}
