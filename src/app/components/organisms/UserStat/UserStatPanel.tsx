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
import { DEFAULT_REGULATION_ID, regulationDisplay } from "@app/types/regulation";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { UserStatType } from "@app/types/user_stat";
import {
  getCurrentYearMonth,
  generateYearMonthOptions,
} from "@app/utils/yearMonthOptions";
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
  const [standardRegulationId, setStandardRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );

  // レギュレーション区分(スタンダード/エクストラ/殿堂/その他)。期間の絞り込みとは直交する軸で、
  // 既定はスタンダード(レギュレーションが混ざった数字を初期表示しない)。
  const [regulationId, setRegulationId] = useState<number>(DEFAULT_REGULATION_ID);
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // シェアモーダルの開閉
  const [shareOpen, setShareOpen] = useState(false);

  const yearMonthOptions = generateYearMonthOptions(userCreatedAt);
  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("regulation_id", String(regulationId));
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && standardRegulationId) {
          params.set("standard_regulation_id", standardRegulationId);
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
  }, [userId, filterMode, yearMonth, environmentId, season, standardRegulationId, regulationId]);


  // 「環境」と「レギュレーションマーク」はスタンダードのカードプールを前提にした区切りのため、
  // エクストラ・殿堂では月次とシーズンだけを出す。
  const isStandardRegulation = regulationId === DEFAULT_REGULATION_ID;

  const filterTabs: { key: FilterMode; title: string }[] = [
    { key: "month", title: "月次" },
    ...(isStandardRegulation
      ? [{ key: "environment" as FilterMode, title: "環境" }]
      : []),
    { key: "season", title: "シーズン" },
    ...(isStandardRegulation
      ? [{ key: "regulation" as FilterMode, title: "レギュレーションマーク" }]
      : []),
  ];

  // レギュレーションを切り替えると選べる集計タブも変わるため、集計の選択もそれに合わせる。
  //  ・スタンダードへ戻したとき: 既定の集計である環境へ戻す。
  //  ・エクストラ・殿堂へ切り替えたとき: 消えるタブ(環境・レギュレーションマーク)を選んだ
  //    ままだと、その条件で集計され続けてしまうためシーズンへ寄せる
  //    (エクストラ・殿堂でも母数を確保しやすい区切り)。
  const handleRegulationChange = (nextRegulationId: number) => {
    setRegulationId(nextRegulationId);

    if (nextRegulationId === DEFAULT_REGULATION_ID) {
      setFilterMode("environment");
      return;
    }

    if (filterMode === "environment" || filterMode === "regulation") {
      setFilterMode("season");
    }
  };

  const periodFilterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === standardRegulationId)?.marks ?? ""}』`;

  // レギュレーションはパネル上のセグメントで選ぶが、シェア画像には写らない。
  // 既定のスタンダード以外を見ているときは、何のレギュレーションの数字か分かるよう添える。
  const filterLabel =
    regulationId === DEFAULT_REGULATION_ID
      ? periodFilterLabel
      : `${periodFilterLabel}(${regulationDisplay(regulationId).name})`;

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
          {/* レギュレーション区分の絞り込み(期間の絞り込みとは独立に効く) */}
          <RegulationSegmentedControl
            regulationId={regulationId}
            onChange={handleRegulationChange}
          />

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
            {filterTabs.map((tab) => (
              <Tab key={tab.key} title={tab.title} />
            ))}
          </Tabs>

          {/* セレクタ */}
          <div className="relative">
            <select
              name="user-stat-period"
              value={
                filterMode === "month"
                  ? yearMonth
                  : filterMode === "environment"
                    ? environmentId
                    : filterMode === "season"
                      ? season
                      : standardRegulationId
              }
              onChange={(e) => {
                if (filterMode === "month") {
                  setYearMonth(e.target.value);
                } else if (filterMode === "environment") {
                  setEnvironmentId(e.target.value);
                } else if (filterMode === "season") {
                  setSeason(e.target.value);
                } else {
                  setStandardRegulationId(e.target.value);
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
