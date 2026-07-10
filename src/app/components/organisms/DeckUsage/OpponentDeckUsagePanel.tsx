"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";
import {
  getCurrentYearMonth,
  generateYearMonthOptions,
} from "@app/utils/yearMonthOptions";
import OpponentDeckDistributionChart from "@app/components/organisms/DeckUsage/OpponentDeckDistributionChart";

type FilterMode = "month" | "environment" | "season" | "regulation";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  championshipSeries: ChampionshipSeriesType[];
  userCreatedAt?: string;
};

export default function OpponentDeckUsagePanel({
  userId,
  environments,
  currentEnvironmentId,
  standardRegulations,
  championshipSeries,
  userCreatedAt,
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
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownDeckId, setOwnDeckId] = useState<string>("");
  const [ownDecks, setOwnDecks] = useState<DeckUsageItemType[]>([]);
  const [oldestEventDate, setOldestEventDate] = useState<string | null>(null);

  // 「月次」の選択肢は、実際に記録されている最も古い対戦のevent_dateを起点にする。
  // 取得前・取得失敗時はユーザー登録日、それも無ければ直近12ヶ月にフォールバックする。
  const createdAtDate =
    oldestEventDate != null
      ? new Date(oldestEventDate)
      : userCreatedAt != null
        ? new Date(userCreatedAt)
        : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);
  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  useEffect(() => {
    let cancelled = false;

    async function fetchOldestEventDate() {
      try {
        const res = await fetch(`/api/users/${userId}/oldest-record-event-date`, {
          cache: "no-store",
        });
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
  }, [userId]);

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
        if (ownDeckId) params.set("deck_id", ownDeckId);

        const res = await fetch(
          `/api/users/${userId}/opponent-deck-usage?${params.toString()}`,
          {
            cache: "no-store",
          },
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
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId, ownDeckId]);

  // 期間フィルタが変わるたびに、その期間で実際に使用したデッキ一覧を取得し
  // 「自分のデッキ」セレクタの選択肢にする（未使用デッキを候補に出さないため）
  useEffect(() => {
    let cancelled = false;

    async function fetchOwnDecks() {
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

        const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: DeckUsageStatType = await res.json();
        // deck_id は ULID のため文字列降順に並べると新しいデッキが先頭にくる
        const sortedDecks = [...(data.decks ?? [])].sort((a, b) =>
          a.deck_id < b.deck_id ? 1 : a.deck_id > b.deck_id ? -1 : 0,
        );
        if (!cancelled) setOwnDecks(sortedDecks);
      } catch (e) {
        console.error(e);
      }
    }

    setOwnDeckId("");
    fetchOwnDecks();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId]);

  const decks = stat?.decks ?? [];

  const filterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === regulationId)?.marks ?? ""}』`;

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* フィルタータブ */}
        {/* 親のダッシュボード側がlg:columns-2のCSS多段組みレイアウトを使っており、
            position: stickyは多段組みコンテナ内で正しく機能しない(見た目の位置と
            クリック判定がズレてタップに反応しなくなる)ため、ここではstickyにしない */}
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

        {/* 自分のデッキセレクタ（対面相性の勝率は使用デッキによって変わるため） */}
        <div className="relative">
          <select
            value={ownDeckId}
            onChange={(e) => setOwnDeckId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">使用したすべてのデッキで集計</option>
            {ownDecks.map((deck) => (
              <option key={deck.deck_id} value={deck.deck_id}>
                {deck.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
            ▼
          </span>
        </div>

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-2">
          {filterLabel}
          {ownDeckId
            ? `『${ownDecks.find((d) => d.deck_id === ownDeckId)?.name ?? ""}』使用時の`
            : ""}
          対戦相手のデッキ分布・勝率
        </p>

        {/* グラフ + 凡例 */}
        <OpponentDeckDistributionChart
          decks={decks}
          isLoading={isLoading}
          hasData={stat !== null}
          emptyMessage={
            "この期間の対戦記録がまだありません。\n記録を作成すると対戦相手のデッキ分布が表示されます。"
          }
        />
      </CardBody>
    </Card>
  );
}
