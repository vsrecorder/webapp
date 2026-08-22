"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { DEFAULT_REGULATION_ID } from "@app/types/regulation";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";
import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";
import {
  getCurrentYearMonth,
  generateYearMonthOptions,
} from "@app/utils/yearMonthOptions";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";
import OpponentDeckDistributionChart from "@app/components/organisms/DeckUsage/OpponentDeckDistributionChart";

type PeriodMode = "all" | "month" | "environment" | "season" | "regulation";

type Props = {
  deckId: string;
  // モーダル内で表示する場合のみ true。円グラフの入場アニメを開き切ってから再生し直す。
  // ページ内（デッキ詳細のインライン表示）では不要なので既定 false。
  inModal?: boolean;
};

// 「登録デッキの詳細」から、そのデッキで対戦した相手のデッキ分布・勝率を確認するための分析パネル。
// ダッシュボードの分析(OpponentDeckUsagePanel)と同じ期間フィルタ(月次/環境/シーズン/レギュレーション)に加え、
// デッキ単位ならではの「全期間」も用意する。
export default function DeckOpponentAnalysisPanel({ deckId, inModal = false }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environments, setEnvironments] = useState<EnvironmentType[]>([]);
  const [environmentId, setEnvironmentId] = useState<string>("");
  const [standardRegulations, setStandardRegulations] = useState<
    StandardRegulationType[]
  >([]);
  const [standardRegulationId, setStandardRegulationId] = useState<string>("");

  // レギュレーション区分(スタンダード/エクストラ/殿堂/その他)。期間の絞り込みとは直交する軸で、
  // 既定はスタンダード(レギュレーションが混ざった数字を初期表示しない)。
  const [regulationId, setRegulationId] = useState<number>(DEFAULT_REGULATION_ID);
  const [championshipSeries, setChampionshipSeries] = useState<ChampionshipSeriesType[]>(
    [],
  );
  const [season, setSeason] = useState<string>("");
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oldestEventDate, setOldestEventDate] = useState<string | null>(null);

  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  // 「月次」の選択肢は、このデッキで実際に記録されている最も古い対戦のevent_dateを起点にする。
  // 取得前・取得失敗時は直近12ヶ月にフォールバックする。
  const createdAtDate = oldestEventDate != null ? new Date(oldestEventDate) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);

  useEffect(() => {
    if (!userId || !deckId) return;
    let cancelled = false;

    async function fetchOldestEventDate() {
      try {
        const res = await fetch(
          `/api/users/${userId}/oldest-record-event-date?deck_id=${deckId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;

        const data: OldestRecordEventDateType = await res.json();
        if (!cancelled) setOldestEventDate(data.event_date);
      } catch (e) {
        console.error(e);
      }
    }

    fetchOldestEventDate();
    return () => {
      cancelled = true;
    };
  }, [userId, deckId]);

  // 環境一覧はフィルタの選択肢としてのみ使うため、初回に一度だけ取得する。
  // 併せて「今日時点の環境」も取得し、環境フィルタの初期選択に使う。
  useEffect(() => {
    let cancelled = false;

    async function fetchEnvironments() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [listRes, currentRes] = await Promise.all([
          fetch("/api/environments", { cache: "no-store" }),
          fetch(`/api/environments?date=${today}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const data: EnvironmentType[] = listRes.ok ? await listRes.json() : [];
        const current: EnvironmentType | null = currentRes.ok
          ? await currentRes.json()
          : null;
        if (cancelled) return;

        setEnvironments(data);
        setEnvironmentId((prev) => prev || (current?.id ?? data[0]?.id ?? ""));
      } catch (e) {
        console.error(e);
      }
    }

    fetchEnvironments();
    return () => {
      cancelled = true;
    };
  }, []);

  // レギュレーション一覧・シーズン一覧もフィルタの選択肢としてのみ使うため、初回に一度だけ取得する。
  useEffect(() => {
    let cancelled = false;

    async function fetchRegulationsAndSeries() {
      try {
        const [regulationsRes, seriesRes] = await Promise.all([
          fetch("/api/standard_regulations", { cache: "no-store" }),
          fetch("/api/championship_series", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const regulations: StandardRegulationType[] = regulationsRes.ok
          ? await regulationsRes.json()
          : [];
        const series: ChampionshipSeriesType[] = seriesRes.ok
          ? await seriesRes.json()
          : [];
        if (cancelled) return;

        setStandardRegulations(regulations);
        setStandardRegulationId((prev) => prev || (regulations[0]?.id ?? ""));
        setChampionshipSeries(series);
        setSeason((prev) => prev || currentSeasonValue(series));
      } catch (e) {
        console.error(e);
      }
    }

    fetchRegulationsAndSeries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId || !deckId) return;
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("deck_id", deckId);
        params.set("regulation_id", String(regulationId));
        if (periodMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (periodMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (periodMode === "season" && season) {
          params.set("season", season);
        } else if (periodMode === "regulation" && standardRegulationId) {
          params.set("standard_regulation_id", standardRegulationId);
        }

        const res = await fetch(
          `/api/users/${userId}/opponent-deck-usage?${params.toString()}`,
          { cache: "no-store" },
        );

        if (!res.ok) return;

        const data: OpponentDeckUsageStatType = await res.json();
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
  }, [
    userId,
    deckId,
    periodMode,
    yearMonth,
    environmentId,
    season,
    standardRegulationId,
    regulationId,
  ]);

  // 「環境」と「レギュレーションマーク」はスタンダードのカードプールを前提にした
  // 区切りのため、
  // エクストラ・殿堂では全期間・月次・シーズンだけを出す。
  const isStandardRegulation = regulationId === DEFAULT_REGULATION_ID;

  const periodTabs: { key: PeriodMode; title: string }[] = [
    { key: "all", title: "全期間" },
    { key: "month", title: "月次" },
    ...(isStandardRegulation
      ? [{ key: "environment" as PeriodMode, title: "環境" }]
      : []),
    { key: "season", title: "シーズン" },
    ...(isStandardRegulation
      ? [{ key: "regulation" as PeriodMode, title: "レギュレーションマーク" }]
      : []),
  ];

  // レギュレーションを切り替えると選べる集計タブも変わるため、集計の選択もそれに合わせる。
  // このパネルの既定は全期間なので、消えるタブ(環境・レギュ)を選んでいた場合も
  // スタンダードへ戻した場合も、全期間へ戻す。
  const handleRegulationChange = (nextRegulationId: number) => {
    setRegulationId(nextRegulationId);

    if (
      nextRegulationId === DEFAULT_REGULATION_ID ||
      periodMode === "environment" ||
      periodMode === "regulation"
    ) {
      setPeriodMode("all");
    }
  };

  const decks = stat?.decks ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* 期間フィルタ。スクロールしても常に見えるよう、モーダル本文の先頭に固定する */}
      <div className="sticky top-0 z-10 bg-content1 pb-1">
        {/* レギュレーション区分の絞り込み(期間の絞り込みとは独立に効く) */}
        <div className="pb-1.5">
          <RegulationSegmentedControl
            regulationId={regulationId}
            onChange={handleRegulationChange}
          />
        </div>

        {/* fullWidth で等幅に配分し、タブ内の余白と文字サイズを詰めて画面幅へ収める。
            「レギュレーションマーク」は等幅1枠に収まらないため、このタブだけ
            2行に折り返して高さを揃える（他のタブは whitespace-nowrap で1行のまま）。 */}
        <Tabs
          fullWidth
          size="sm"
          selectedKey={periodMode}
          onSelectionChange={(key) => setPeriodMode(key as PeriodMode)}
          classNames={{
            base: "w-full",
            tabList: "w-full",
            tab: "h-9 px-0.5",
            tabContent: "font-bold text-[11px] leading-tight",
          }}
        >
          {periodTabs.map((tab) => (
            <Tab key={tab.key} title={tab.title} />
          ))}
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 px-1">
        {periodMode === "month" && (
          <div className="relative">
            <select
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {yearMonthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>
        )}

        {periodMode === "environment" && (
          <div className="relative">
            <select
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  『{env.title}』
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>
        )}

        {periodMode === "season" && (
          <div className="relative">
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {seasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>
        )}

        {periodMode === "regulation" && (
          <div className="relative">
            <select
              value={standardRegulationId}
              onChange={(e) => setStandardRegulationId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {standardRegulations.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  『{reg.marks}』
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>
        )}

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-1">
          {periodMode === "month"
            ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
            : periodMode === "environment"
              ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
              : periodMode === "season"
                ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
                : periodMode === "regulation"
                  ? `『${standardRegulations.find((r) => r.id === standardRegulationId)?.marks ?? ""}』`
                  : "全期間"}
          の対戦相手のデッキ分布・勝率
        </p>

        <OpponentDeckDistributionChart
          decks={decks}
          isLoading={isLoading}
          hasData={stat !== null}
          emptyMessage={
            "この期間の対戦記録がまだありません。\n記録を作成すると対戦相手のデッキ分布が表示されます。"
          }
          replayEntryAnimation={inModal}
        />
      </div>
    </div>
  );
}
