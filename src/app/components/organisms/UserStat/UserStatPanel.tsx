"use client";

import { useEffect, useState } from "react";

import { Button, Card, CardBody, Tabs, Tab } from "@heroui/react";
import { LuShare2 } from "react-icons/lu";

import UserStatPanelSkeleton from "@app/components/organisms/UserStat/Skeleton/UserStatPanelSkeleton";
import UserStatSummary from "@app/components/molecules/UserStat/UserStatSummary";
import UserStatShareCard from "@app/components/organisms/UserStat/UserStatShareCard";
import PanelShareModal from "@app/components/organisms/Share/PanelShareModal";
import { buildUserStatPostText } from "@app/utils/panelPostText";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { UserStatType } from "@app/types/user_stat";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";

type FilterMode = "month" | "environment" | "season" | "regulation";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  championshipSeries: ChampionshipSeriesType[];
  userCreatedAt?: string;
  // セクション見出し。パネル自身が見出し行を描画し、その右端にシェアボタンを置く。
  sectionTitle: string;
};

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

export default function UserStatPanel({
  userId,
  environments,
  currentEnvironmentId,
  standardRegulations,
  championshipSeries,
  userCreatedAt,
  sectionTitle,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("environment");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environmentId, setEnvironmentId] = useState<string>(
    currentEnvironmentId ?? environments[0]?.id ?? "",
  );
  const [season, setSeason] = useState<string>(() =>
    currentSeasonValue(championshipSeries),
  );
  const [regulationId, setRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // シェアモーダルの開閉
  const [shareOpen, setShareOpen] = useState(false);

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);
  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

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

  // セクション見出し行。タイトルを左、シェアボタンを右端に置く（ダッシュボードの
  // 「対戦環境データ」の見出し行と同じ配置ルール）。ローディング中・集計が無い間は
  // 画像に載せる中身が無いためシェアを押させない。
  const header = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-default-700">{sectionTitle}</h2>
      <Button
        size="sm"
        variant="flat"
        radius="full"
        className="h-7 shrink-0 px-3 text-xs font-bold"
        startContent={<LuShare2 className="h-3.5 w-3.5" />}
        isDisabled={isLoading || stat === null}
        onPress={() => setShareOpen(true)}
      >
        シェア
      </Button>
    </div>
  );

  if (isLoading && !stat) {
    return (
      <>
        {header}
        <UserStatPanelSkeleton />
      </>
    );
  }

  return (
    <>
      {header}
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
            <Tab key="month" title="月次" />
            <Tab key="environment" title="環境" />
            <Tab key="season" title="シーズン" />
            <Tab key="regulation" title="レギュレーション" />
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

          {/* 統計グリッドと勝率 */}
          <UserStatSummary stat={stat} isLoading={isLoading} />
        </CardBody>
      </Card>

      <PanelShareModal
        isOpen={shareOpen}
        onOpenChange={() => setShareOpen((open) => !open)}
        onClose={() => setShareOpen(false)}
        description="戦績分析を画像にして、ポスト文と一緒にシェアできます。"
        postText={buildUserStatPostText(filterLabel, stat)}
        filenamePrefix="user_stat"
      >
        {() => <UserStatShareCard filterLabel={filterLabel} stat={stat} />}
      </PanelShareModal>
    </>
  );
}
