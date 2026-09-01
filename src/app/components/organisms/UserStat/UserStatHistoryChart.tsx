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
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { seasonOptionsFromChampionshipSeries, currentSeasonValue } from "@app/utils/season";
import { todayJSTDateString } from "@app/utils/date";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import { DEFAULT_REGULATION_ID } from "@app/types/regulation";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Filler,
);

type PeriodMode = "3months" | "6months" | "current_season" | "select_season";

// デッキセレクタに添えるスプライトの枠(px)。ADR pokemon-sprite-size-and-gap の
// 「デッキ選択(選択済み)」に合わせる。
const OWN_DECK_SPRITE_SIZE = 28;

type Props = {
  userId: string;
  championshipSeries: ChampionshipSeriesType[];
};

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

// 当月を含む直近 count ヶ月の年月("YYYY-MM")を古い順に返す。
// バックエンドの user_stat_history が period=3months/6months で見る範囲
// (当月の1日〜翌月1日を上限とした直近Nヶ月)と同じ月に揃えている。
// 月の境目はJST基準で判断する(端末のタイムゾーンで1ヶ月ずれるのを避ける)。
function recentYearMonths(count: number): string[] {
  const [year, month] = todayJSTDateString().split("-").map(Number);

  return Array.from({ length: count }, (_, i) => {
    // 月の繰り下がり(0→前年12月)は Date に任せる。JSTの暦日を数値で渡すだけなので
    // 実時刻は関係なく、UTCゲッターで読み戻せばタイムゾーンの影響も受けない。
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export default function UserStatHistoryChart({ userId, championshipSeries }: Props) {
  // 今シーズンの season 識別子。「今シーズン」表示のときに、グラフ(period=season で
  // バックエンドが現在シーズンを解決する)とデッキ一覧の期間を揃えるために使う。
  const currentSeason = currentSeasonValue(championshipSeries);

  const [periodMode, setPeriodMode] = useState<PeriodMode>("3months");
  const [seasonYear, setSeasonYear] = useState<string>(currentSeason);
  const [deckId, setDeckId] = useState<string>("");

  // レギュレーション区分(スタンダード/エクストラ/殿堂/その他)。既定はスタンダード。
  const [regulationId, setRegulationId] = useState<number>(DEFAULT_REGULATION_ID);
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

  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

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
        params.set("regulation_id", String(regulationId));

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
  }, [userId, periodMode, seasonYear, deckId, regulationId]);

  // グラフに出している期間・レギュレーションで実際に使用したデッキ一覧を取得し、
  // デッキセレクタの選択肢にする（対戦相手のデッキ分布パネルと同様、
  // 「使用したすべてのデッキで集計」をデフォルトにした単一パネル構成）。
  //
  // 期間セレクタと無関係に season（＝現在シーズン）で引いてはならない。
  // シーズンはチャンピオンシップシリーズ基準で9月に切り替わるため、
  // 例えば9月上旬は「新シーズンの記録はまだ0件」＝選択肢が1つも出ない一方で、
  // グラフ側の既定（直近3ヶ月）には前シーズンの記録が並ぶ、という食い違いが起きる。
  useEffect(() => {
    let cancelled = false;

    // 期間の指定は deck-usage API の受け口に合わせる。単月(year_month)かシーズン(season)
    // しか無く「直近Nヶ月」は渡せないため、そのモードでは月ごとに引いて束ねる。
    async function fetchDeckUsage(periodParams: Record<string, string>) {
      const params = new URLSearchParams(periodParams);
      params.set("regulation_id", String(regulationId));

      const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
        cache: "no-store",
      });

      // 取得できなかった月を空扱いにすると選択肢がごっそり消えるため、
      // 呼び出し側の catch まで投げて「前回の一覧を残す」に倒す。
      if (!res.ok) throw new Error(`failed to fetch deck usage: ${res.status}`);

      const data: DeckUsageStatType = await res.json();

      return data.decks ?? [];
    }

    async function fetchOwnDecks() {
      try {
        const decks =
          periodMode === "3months" || periodMode === "6months"
            ? (
                await Promise.all(
                  recentYearMonths(periodMode === "3months" ? 3 : 6).map((yearMonth) =>
                    fetchDeckUsage({ year_month: yearMonth }),
                  ),
                )
              ).flat()
            : await fetchDeckUsage({
                season: periodMode === "current_season" ? currentSeason : seasonYear,
              });

        // 月ごとに引くと複数月で使ったデッキが重複するため deck_id で1件に畳む
        const byDeckId = new Map<string, DeckUsageItemType>();
        for (const deck of decks) {
          if (!byDeckId.has(deck.deck_id)) byDeckId.set(deck.deck_id, deck);
        }

        // deck_id は ULID のため文字列降順に並べると新しいデッキが先頭にくる
        const sortedDecks = [...byDeckId.values()].sort((a, b) =>
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
  }, [userId, periodMode, seasonYear, currentSeason, regulationId]);

  // デッキセレクタにはアーカイブされていないデッキのみを表示する
  // （「使用したすべてのデッキで集計」を選んだ場合の勝率計算はアーカイブ済みデッキも含めるため、
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

  // 選択中のデッキが選択肢から消えた場合は「使用したすべてのデッキで集計」に戻す。
  // デッキがアーカイブされた場合と、期間を変えてその期間には使っていなかった場合の両方。
  // 放置すると select の表示だけが空になり、グラフは前の絞り込みのまま残ってしまう。
  useEffect(() => {
    if (!deckId) return;

    const isArchived = activeDeckIds != null && !activeDeckIds.has(deckId);
    const isUnusedInPeriod = !ownDecks.some((deck) => deck.deck_id === deckId);

    if (isArchived || isUnusedInPeriod) setDeckId("");
  }, [deckId, activeDeckIds, ownDecks]);

  const selectableDecks = activeDeckIds
    ? ownDecks.filter((deck) => activeDeckIds.has(deck.deck_id))
    : ownDecks;

  // デッキを絞り込んでいるときは、どのデッキを選んでいるかスプライトでも示す。
  // 1体でも登録があれば position でスロットを固定して2枠表示し、1体も無いデッキでは
  // 何も出さない(モンスターボール2つはデッキの手掛かりにならないため)。
  const selectedDeck = deckId
    ? selectableDecks.find((deck) => deck.deck_id === deckId)
    : undefined;
  const deckSprite1 = getDeckSpriteBySlot(selectedDeck?.pokemon_sprites, 1);
  const deckSprite2 = getDeckSpriteBySlot(selectedDeck?.pokemon_sprites, 2);
  const hasDeckSprite = Boolean(deckSprite1 || deckSprite2);

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
        {/* レギュレーション区分の絞り込み */}
        <RegulationSegmentedControl
          regulationId={regulationId}
          onChange={setRegulationId}
        />

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-default-700"></span>
          <div className="flex items-center gap-2">
            {periodMode === "select_season" && (
              <div className="relative">
                <select
                  name="user-stat-history-season"
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
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[0.625rem]">
                  ▼
                </span>
              </div>
            )}
            <div className="relative">
              <select
                name="user-stat-history-period"
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                className="appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="3months">直近3ヶ月</option>
                <option value="6months">直近6ヶ月</option>
                <option value="current_season">今シーズン</option>
                <option value="select_season">シーズン選択</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[0.625rem]">
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* デッキセレクタ（対戦相手のデッキ分布パネルと同様、「使用したすべてのデッキで集計」がデフォルト）。
            ネイティブの <select> には画像を入れられないため、選択中デッキのスプライトは
            セレクタの左に並べて示す（未選択＝全デッキ集計のときは表示しない） */}
        <div className="flex items-center gap-2">
          {hasDeckSprite && (
            <div className="flex items-center gap-0 shrink-0">
              <PokemonSprite id={deckSprite1?.id} size={OWN_DECK_SPRITE_SIZE} />
              <PokemonSprite id={deckSprite2?.id} size={OWN_DECK_SPRITE_SIZE} />
            </div>
          )}
          <div className="relative flex-1 min-w-0">
            <select
              name="user-stat-history-deck"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">使用したすべてのデッキで集計</option>
              {selectableDecks.map((deck) => (
                <option key={deck.deck_id} value={deck.deck_id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-[0.625rem]">
              ▼
            </span>
          </div>
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
