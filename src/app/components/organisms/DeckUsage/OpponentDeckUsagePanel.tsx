"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArcElement,
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  type ActiveElement,
  type ChartEvent,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import { Card, CardBody, Image, Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import {
  OpponentDeckUsageItemType,
  OpponentDeckUsageStatType,
} from "@app/types/opponent_deck_usage_stat";

ChartJS.register(ArcElement, ChartTooltip);

type FilterMode = "month" | "environment" | "season";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  userCreatedAt?: string;
};

const SLICE_COLORS = [
  "#006FEE",
  "#17C964",
  "#F5A524",
  "#F31260",
  "#7828C8",
  "#06B6D4",
  "#9353D3",
  "#FF7B00",
  "#0EA5E9",
  "#D946EF",
];
const OTHER_COLOR = "#A1A1AA";

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

function spriteUrl(id: string): string {
  return `${SPRITE_BASE_URL}/${id.replace(/^0+(?!$)/, "")}.png`;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  return String(year);
}

function generateSeasonOptions(createdAt?: Date): { value: string; label: string }[] {
  const now = new Date();
  const currentSeason = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  const firstSeason = createdAt
    ? createdAt.getMonth() >= 9
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

type TooltipState = {
  deck: OpponentDeckUsageItemType;
  color: string;
  x: number;
  y: number;
  above: boolean;
};

function DeckSprites({ deck }: { deck: OpponentDeckUsageItemType }) {
  const sprites = deck.pokemon_sprites ?? [];

  if (sprites.length === 0) {
    return (
      <div className="flex items-center gap-0 shrink-0">
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      </div>
    );
  } else if (sprites.length === 1) {
    return (
      <div className="flex items-center gap-0 shrink-0">
        {sprites.slice(0, 1).map((sprite, idx) => (
          <Image
            key={`${sprite.id}-${idx}`}
            alt={sprite.id}
            src={spriteUrl(sprite.id)}
            className="w-8 h-8 object-contain scale-150 origin-bottom"
          />
        ))}
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 shrink-0">
      {sprites.slice(0, 2).map((sprite, idx) => (
        <Image
          key={`${sprite.id}-${idx}`}
          alt={sprite.id}
          src={spriteUrl(sprite.id)}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      ))}
    </div>
  );
}

export default function OpponentDeckUsagePanel({
  userId,
  environments,
  currentEnvironmentId,
  userCreatedAt,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("environment");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environmentId, setEnvironmentId] = useState<string>(
    currentEnvironmentId ?? environments[0]?.id ?? "",
  );
  const [season, setSeason] = useState<string>(getCurrentSeason);
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const chartRef = useRef<ChartJS<"pie">>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        }

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
  }, [userId, filterMode, yearMonth, environmentId, season]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

  const deckColors = useMemo(
    () =>
      decks.map((_, idx) =>
        idx < SLICE_COLORS.length ? SLICE_COLORS[idx] : OTHER_COLOR,
      ),
    [decks],
  );

  useEffect(() => {
    setSelectedIdx(null);
    setTooltip(null);
    const chart = chartRef.current;
    if (!chart?.tooltip) return;
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update();
  }, [stat]);

  function handleLegendClick(idx: number) {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart?.tooltip || !container) return;

    if (selectedIdx === idx) {
      setSelectedIdx(null);
      setTooltip(null);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update();
      return;
    }

    setSelectedIdx(idx);

    const arcEl = chart.getDatasetMeta(0).data[idx] as ArcElement;
    const midAngle = (arcEl.startAngle + arcEl.endAngle) / 2;
    const r = arcEl.outerRadius + 10;
    const canvasTipX = arcEl.x + Math.cos(midAngle) * r;
    const canvasTipY = arcEl.y + Math.sin(midAngle) * r;

    const canvasRect = chart.canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = canvasRect.left - containerRect.left + canvasTipX;
    const y = canvasRect.top - containerRect.top + canvasTipY;

    const above = Math.sin(midAngle) > 0;

    setTooltip({ deck: decks[idx], color: deckColors[idx], x, y, above });

    chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
    chart.update();
  }

  const filterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
        : (seasonOptions.find((o) => o.value === season)?.label ?? season);

  const chartData = {
    labels: decks.map((d) => d.deck_info),
    datasets: [
      {
        data: decks.map((d) => d.count),
        backgroundColor: deckColors,
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length === 0) return;
      handleLegendClick(elements[0].index);
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

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
        </Tabs>

        {/* セレクタ */}
        <div className="relative">
          <select
            value={
              filterMode === "month"
                ? yearMonth
                : filterMode === "environment"
                  ? environmentId
                  : season
            }
            onChange={(e) => {
              if (filterMode === "month") {
                setYearMonth(e.target.value);
              } else if (filterMode === "environment") {
                setEnvironmentId(e.target.value);
              } else {
                setSeason(e.target.value);
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
                : seasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
            ▼
          </span>
        </div>

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-2">
          {filterLabel} 対戦相手のデッキ分布
        </p>

        {/* グラフ + 凡例 */}
        {isLoading && !stat ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-xs text-default-400">読み込み中...</span>
          </div>
        ) : decks.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-xs text-default-400">データがありません</span>
          </div>
        ) : (
          <>
            {/* グラフ領域（カスタム吹き出しの基準位置） */}
            <div
              ref={containerRef}
              className={`h-48 relative transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"}`}
            >
              <Pie ref={chartRef} data={chartData} options={chartOptions} />

              {/* カスタム吹き出し（スプライト画像付き） */}
              {tooltip && (
                <div
                  className="absolute z-40 pointer-events-none bg-content1 border border-default-200 rounded-xl px-3 py-2 shadow-lg whitespace-nowrap"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: tooltip.above
                      ? "translate(-50%, calc(-100% - 8px))"
                      : "translate(-50%, 8px)",
                  }}
                >
                  {/* スプライト画像 */}
                  <div className="flex justify-center mb-1.5">
                    <DeckSprites deck={tooltip.deck} />
                  </div>
                  {/* デッキ名 */}
                  <p className="text-xs font-bold text-default-700 text-center max-w-30 truncate">
                    {tooltip.deck.deck_info}
                  </p>
                  {/* 出現率・件数 */}
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="font-black text-sm" style={{ color: tooltip.color }}>
                      {(tooltip.deck.usage_rate * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-default-400">
                      ({tooltip.deck.count}件)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 凡例リスト（スプライト画像 + デッキ名 + 出現率） */}
            <div className="flex flex-col gap-1.5">
              {decks.map((deck, idx) => (
                <div
                  key={`${deck.deck_info}-${idx}`}
                  onClick={() => handleLegendClick(idx)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 cursor-pointer transition-colors duration-150 ${
                    selectedIdx === idx
                      ? "bg-default-200 ring-1 ring-default-400"
                      : "bg-default-100 hover:bg-default-200"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: deckColors[idx] }}
                  />
                  <div className="w-16 flex justify-center shrink-0">
                    <DeckSprites deck={deck} />
                  </div>
                  <span className="font-bold text-xs text-default-700 truncate flex-1 min-w-0">
                    {deck.deck_info}
                  </span>
                  <span className="text-xs text-default-400 shrink-0 tabular-nums">
                    {deck.count}件
                  </span>
                  <span className="font-black text-sm text-default-700 shrink-0 tabular-nums w-14 text-right">
                    {(deck.usage_rate * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
