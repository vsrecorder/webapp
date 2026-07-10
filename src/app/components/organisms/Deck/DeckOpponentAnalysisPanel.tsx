"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";
import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";
import {
  getCurrentYearMonth,
  generateYearMonthOptions,
} from "@app/utils/yearMonthOptions";
import OpponentDeckDistributionChart from "@app/components/organisms/DeckUsage/OpponentDeckDistributionChart";

type PeriodMode = "all" | "month" | "environment";

type Props = {
  deckId: string;
};

// 「登録デッキの詳細」から、そのデッキで対戦した相手のデッキ分布・勝率を確認するための分析パネル。
// ユーザー単位の詳細な分析（シーズン別/レギュレーション別）は既存のダッシュボードに譲り、
// ここではデッキに紐づく対戦相手分布をワンタップで見られることを優先し、
// 期間の絞り込みは「全期間」「月別」「環境別」に絞ってシンプルに保つ。
export default function DeckOpponentAnalysisPanel({ deckId }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [periodMode, setPeriodMode] = useState<PeriodMode>("all");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environments, setEnvironments] = useState<EnvironmentType[]>([]);
  const [environmentId, setEnvironmentId] = useState<string>("");
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oldestEventDate, setOldestEventDate] = useState<string | null>(null);

  // 「月別」の選択肢は、このデッキで実際に記録されている最も古い対戦のevent_dateを起点にする。
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
  // 併せて「今日時点の環境」も取得し、環境別フィルタの初期選択に使う。
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

  useEffect(() => {
    if (!userId || !deckId) return;
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("deck_id", deckId);
        if (periodMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (periodMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
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
  }, [userId, deckId, periodMode, yearMonth, environmentId]);

  const decks = stat?.decks ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* 期間フィルタ。スクロールしても常に見えるよう、モーダル本文の先頭に固定する */}
      <div className="sticky top-0 z-10 bg-content1 pb-1">
        <Tabs
          fullWidth
          size="sm"
          selectedKey={periodMode}
          onSelectionChange={(key) => setPeriodMode(key as PeriodMode)}
          classNames={{
            tab: "h-7",
            tabContent: "font-bold text-xs",
          }}
        >
          <Tab key="all" title="全期間" />
          <Tab key="month" title="月別" />
          <Tab key="environment" title="環境別" />
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

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-1">
          {periodMode === "month"
            ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
            : periodMode === "environment"
              ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
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
        />
      </div>
    </div>
  );
}
