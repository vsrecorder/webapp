"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardBody } from "@heroui/react";

import { UserStatHistoryType, UserStatMonthlyType } from "@app/types/user_stat_history";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { DeckGetResponseType } from "@app/types/deck";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Filler,
);

type PeriodMode = "3months" | "6months" | "current_season" | "select_season";

type Props = {
  userId: string;
  userCreatedAt?: string;
};

function getCurrentSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
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

function formatXLabel(ym: string, hasMultipleYears: boolean): string {
  const [year, month] = ym.split("-");
  return hasMultipleYears
    ? `${year.slice(2)}/${parseInt(month)}`
    : `${parseInt(month)}月`;
}

function formatTooltipMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${year}年${parseInt(month)}月`;
}

export default function UserStatHistoryChart({ userId, userCreatedAt }: Props) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("3months");
  const [seasonYear, setSeasonYear] = useState<string>(String(getCurrentSeasonYear()));
  const [deckId, setDeckId] = useState<string>("");
  const [ownDecks, setOwnDecks] = useState<DeckUsageItemType[]>([]);
  const [activeDeckIds, setActiveDeckIds] = useState<Set<string> | null>(null);
  const [history, setHistory] = useState<UserStatHistoryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartJS<"line">>(null);
  const chartDataRef = useRef<UserStatMonthlyType[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTitleRef = useRef<HTMLParagraphElement>(null);
  const tooltipRateRef = useRef<HTMLParagraphElement>(null);
  const tooltipInfoRef = useRef<HTMLParagraphElement>(null);

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const seasonOptions = generateSeasonOptions(createdAtDate);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (periodMode === "3months" || periodMode === "6months") {
          params.set("period", periodMode);
        } else if (periodMode === "current_season") {
          params.set("period", "season");
        } else {
          params.set("period", "season");
          params.set("season", seasonYear);
        }
        if (deckId) params.set("deck_id", deckId);

        const res = await fetch(
          `/api/users/${userId}/stat/history?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        if (!res.ok) return;

        const data: UserStatHistoryType = await res.json();
        if (!cancelled) setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [userId, periodMode, seasonYear, deckId]);

  // 選択中シーズンで実際に使用したデッキ一覧を取得し、デッキセレクタの選択肢にする
  // （対戦相手のデッキ分布パネルと同様、「すべてのデッキ」をデフォルトにした単一パネル構成）
  useEffect(() => {
    let cancelled = false;

    async function fetchOwnDecks() {
      try {
        const params = new URLSearchParams();
        params.set("season", seasonYear);

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

    fetchOwnDecks();
    return () => {
      cancelled = true;
    };
  }, [userId, seasonYear]);

  // デッキセレクタにはアーカイブされていないデッキのみを表示する
  // （「すべてのデッキ」を選んだ場合の勝率計算はアーカイブ済みデッキも含めるため、
  // ここでの絞り込みは表示上の選択肢のみに影響する）
  useEffect(() => {
    let cancelled = false;

    async function fetchActiveDeckIds() {
      try {
        const ids = new Set<string>();
        let cursor = "";

        for (;;) {
          const res = await fetch(`/api/decks?archived=false&cursor=${cursor}`, {
            cache: "no-store",
          });
          if (!res.ok) break;

          const data: DeckGetResponseType = await res.json();
          if (data.decks.length === 0) break;

          for (const deck of data.decks) ids.add(deck.data.id);

          const lastItem = data.decks[data.decks.length - 1];
          if (!lastItem.cursor || lastItem.cursor === cursor) break;
          cursor = lastItem.cursor;
        }

        if (!cancelled) setActiveDeckIds(ids);
      } catch (e) {
        console.error(e);
      }
    }

    fetchActiveDeckIds();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 選択中のデッキがアーカイブされた場合は「すべてのデッキ」に戻す
  useEffect(() => {
    if (deckId && activeDeckIds != null && !activeDeckIds.has(deckId)) {
      setDeckId("");
    }
  }, [deckId, activeDeckIds]);

  const selectableDecks = activeDeckIds
    ? ownDecks.filter((deck) => activeDeckIds.has(deck.deck_id))
    : ownDecks;

  const chartData: UserStatMonthlyType[] = history?.history ?? [];
  chartDataRef.current = chartData;

  const hasMultipleYears =
    new Set(chartData.map((d) => d.year_month.split("-")[0])).size > 1;

  // clientX からツールチップを表示する（X 軸ラベル上のタップにも対応）
  function showTooltip(clientX: number) {
    const chart = chartRef.current;
    const el = tooltipRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!chart || !el || !containerRect) return;

    const canvasRect = chart.canvas.getBoundingClientRect();
    const xOnCanvas = clientX - canvasRect.left;
    const xScale = chart.scales.x;
    if (!xScale) return;

    const rawIdx = xScale.getValueForPixel(xOnCanvas);
    if (rawIdx == null) return;

    const idx = Math.max(
      0,
      Math.min(chartDataRef.current.length - 1, Math.round(rawIdx)),
    );
    const d = chartDataRef.current[idx];
    if (!d) return;

    if (tooltipTitleRef.current)
      tooltipTitleRef.current.textContent = formatTooltipMonth(d.year_month);
    if (tooltipRateRef.current)
      tooltipRateRef.current.textContent = `${(d.win_rate * 100).toFixed(1)}%`;
    if (tooltipInfoRef.current)
      tooltipInfoRef.current.textContent = `${d.total_matches}戦 ${d.wins}勝 ${d.losses}敗`;

    const pointX = xScale.getPixelForValue(idx);
    const pointY = chart.scales.y.getPixelForValue(d.win_rate * 100);

    el.style.visibility = "hidden";
    el.style.display = "block";
    const tooltipWidth = el.offsetWidth;
    const containerWidth = containerRect.width;

    const rawX = canvasRect.left - containerRect.left + pointX;
    const clampedX = Math.max(
      tooltipWidth / 2,
      Math.min(containerWidth - tooltipWidth / 2, rawX),
    );

    el.style.left = `${clampedX}px`;
    el.style.top = `${canvasRect.top - containerRect.top + pointY}px`;
    el.style.visibility = "visible";
  }

  function hideTooltip() {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }

  const labels = chartData.map((d) => formatXLabel(d.year_month, hasMultipleYears));
  const winRates = chartData.map((d) => Math.round(d.win_rate * 1000) / 10);

  const data = {
    labels,
    datasets: [
      {
        data: winRates,
        borderColor: "#006FEE",
        backgroundColor: "rgba(0, 111, 238, 0.08)",
        borderWidth: 2,
        pointBackgroundColor: "#006FEE",
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHitRadius: 24,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#71717a", font: { size: 10 } },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: "#71717a",
          font: { size: 10 },
          callback: (v: number | string) => `${v}%`,
          stepSize: 25,
        },
        grid: { color: "#e4e4e7" },
        border: { display: false, dash: [3, 3] },
      },
    },
  };

  return (
    <Card>
      <CardBody className="gap-3 p-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-default-700"></span>
          <div className="flex items-center gap-2">
            {periodMode === "select_season" && (
              <div className="relative">
                <select
                  value={seasonYear}
                  onChange={(e) => setSeasonYear(e.target.value)}
                  className="appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {seasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
                  ▼
                </span>
              </div>
            )}
            <div className="relative">
              <select
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                className="appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="3months">直近3ヶ月</option>
                <option value="6months">直近6ヶ月</option>
                <option value="current_season">今シーズン</option>
                <option value="select_season">シーズン選択</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* デッキセレクタ（対戦相手のデッキ分布パネルと同様、「すべてのデッキ」がデフォルト） */}
        <div className="relative">
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">すべてのデッキ</option>
            {selectableDecks.map((deck) => (
              <option key={deck.deck_id} value={deck.deck_id}>
                {deck.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
            ▼
          </span>
        </div>

        {/* グラフ */}
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <span className="text-xs text-default-400">読み込み中...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <span className="text-xs text-default-400">データがありません</span>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-40 relative"
            onTouchStart={(e) => showTooltip(e.touches[0].clientX)}
            onTouchMove={(e) => {
              if (e.touches[0]) showTooltip(e.touches[0].clientX);
            }}
            onTouchEnd={hideTooltip}
            onMouseMove={(e) => showTooltip(e.clientX)}
            onMouseLeave={hideTooltip}
          >
            <Line ref={chartRef} data={data} options={options} />

            {/* カスタムツールチップ（DOM 直接操作） */}
            <div
              ref={tooltipRef}
              className="absolute z-40 pointer-events-none bg-content1 border border-default-200 rounded-xl p-3 shadow-lg text-xs whitespace-nowrap"
              style={{ display: "none", transform: "translate(-50%, calc(-100% - 8px))" }}
            >
              <p ref={tooltipTitleRef} className="font-bold text-default-700 mb-1.5" />
              <p ref={tooltipRateRef} className="text-primary font-bold text-sm" />
              <p ref={tooltipInfoRef} className="text-default-500 mt-0.5" />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
