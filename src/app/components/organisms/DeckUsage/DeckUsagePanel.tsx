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
import { Card, CardBody, Chip, Image, Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { spriteScaleClass } from "@app/utils/sprite";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";

ChartJS.register(ArcElement, ChartTooltip);

type FilterMode = "month" | "environment" | "season" | "regulation";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  userCreatedAt?: string;
};

// 円グラフの各スライスに割り当てる配色
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
  // 9月(month=8)以降なら翌年がシーズン開始年、それ以前なら当年
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return String(year);
}

// 勝率に応じた色分け（OpponentDeckUsagePanelの勝率表示と同じ閾値に合わせる）
function winRateChipColor(rate: number): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
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

type TooltipState = {
  deck: DeckUsageItemType;
  color: string;
  /** コンテナ div 基準の座標 */
  x: number;
  y: number;
  /** true = 吹き出しをアンカーより上に表示 */
  above: boolean;
};

function DeckSprites({ deck }: { deck: DeckUsageItemType }) {
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
            className={`w-8 h-8 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
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
          className={`w-8 h-8 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
        />
      ))}
    </div>
  );
}

export default function DeckUsagePanel({
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
  const [stat, setStat] = useState<DeckUsageStatType | null>(null);
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
        } else if (filterMode === "regulation" && regulationId) {
          params.set("regulation_id", regulationId);
        }

        const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: DeckUsageStatType = await res.json();
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

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

  // スライスごとの色（凡例とグラフで一致させる）
  const deckColors = useMemo(
    () =>
      decks.map((_, idx) =>
        idx < SLICE_COLORS.length ? SLICE_COLORS[idx] : OTHER_COLOR,
      ),
    [decks],
  );

  // データが切り替わったら選択状態をリセット
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
      // 同じ項目を再タップ → 吹き出しを消す
      setSelectedIdx(null);
      setTooltip(null);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update();
      return;
    }

    setSelectedIdx(idx);

    // arc のスライス外縁中点をキャンバス座標で取得
    const arcEl = chart.getDatasetMeta(0).data[idx] as ArcElement;
    const midAngle = (arcEl.startAngle + arcEl.endAngle) / 2;
    // 外縁より少し外側をアンカーにする
    const r = arcEl.outerRadius + 10;
    const canvasTipX = arcEl.x + Math.cos(midAngle) * r;
    const canvasTipY = arcEl.y + Math.sin(midAngle) * r;

    // キャンバス座標 → コンテナ div 基準座標に変換
    const canvasRect = chart.canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = canvasRect.left - containerRect.left + canvasTipX;
    const y = canvasRect.top - containerRect.top + canvasTipY;

    // スライスが上半分にある場合は吹き出しを下へ、下半分は上へ
    const above = Math.sin(midAngle) > 0;

    setTooltip({ deck: decks[idx], color: deckColors[idx], x, y, above });

    // アーク要素をアクティブにしてホバーエフェクトを適用
    chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
    chart.update();
  }

  const filterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === regulationId)?.marks ?? ""}』`;

  const chartData = {
    labels: decks.map((d) => d.name),
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
      // ビルトイン tooltip を無効化してカスタム HTML tooltip を使う
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
        <p className="text-center text-xs text-default-400 -mt-2">
          {filterLabel} のデッキ使用率
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
                    {tooltip.deck.name}
                  </p>
                  {/* 使用率・件数（主役として大きく表示） */}
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-[10px] font-bold text-default-400">使用率</span>
                    <span
                      className="text-lg font-black tabular-nums leading-none"
                      style={{ color: tooltip.color }}
                    >
                      {(tooltip.deck.usage_rate * 100).toFixed(1)}
                      <span className="text-xs font-bold">%</span>
                    </span>
                    <span className="text-[10px] text-default-400">
                      ({tooltip.deck.count}件)
                    </span>
                  </div>
                  {/* 勝率（補足情報として控えめに表示） */}
                  <div className="flex items-center justify-center gap-1 mt-1.5 pt-1.5 border-t border-default-200">
                    <span className="text-[10px] font-bold text-default-400">勝率</span>
                    <span
                      className={`text-xs font-black tabular-nums ${winRateTextColor(tooltip.deck.win_rate)}`}
                    >
                      {(tooltip.deck.win_rate * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-default-400">
                      ({tooltip.deck.wins}勝{tooltip.deck.losses}敗)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 凡例リスト（スプライト画像 + デッキ名 + 使用率） */}
            <div className="flex flex-col gap-1.5">
              {decks.map((deck, idx) => (
                <div
                  key={deck.deck_id || `unknown-${idx}`}
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
                    {deck.name}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2 border-l border-default-200">
                    <span className="font-black text-xs text-default-700 tabular-nums">
                      {(deck.usage_rate * 100).toFixed(1)}%({deck.count}件)
                    </span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-4 px-0.5",
                        content: "text-[9px] font-black tabular-nums px-1",
                      }}
                    >
                      勝率 {(deck.win_rate * 100).toFixed(1)}%
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
