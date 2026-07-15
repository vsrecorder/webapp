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
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardBody } from "@heroui/react";

import { RecentMatchItemType, RecentMatchStatType } from "@app/types/user_stat_recent";
import { spriteImageUrl } from "@app/utils/sprite";
import { spriteFitStyle } from "@app/utils/spriteFit";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Filler,
);

type CountMode = "20" | "30" | "40" | "50" | "100";

type Props = {
  userId: string;
};

function formatTooltipDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

// 勝率に応じた色分け（UserStatPanel/OpponentDeckUsagePanelの勝率表示と同じ閾値に合わせる）
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

// ツールチップ内のスプライト画像を直接DOM操作で描画する（頻繁なmousemoveでのReact再レンダリングを避けるため）
function renderTooltipSprites(container: HTMLDivElement, sprites: { id: string }[]) {
  container.innerHTML = "";
  const slots =
    sprites.length >= 2
      ? sprites.slice(0, 2).map((s) => s.id)
      : sprites.length === 1
        ? [sprites[0].id, ""]
        : ["", ""];

  slots.forEach((id) => {
    // 枠(28px)内に bbox 基準で最適配置。PokemonSprite と同じ算出を DOM 直操作で再現。
    const frame = document.createElement("div");
    Object.assign(frame.style, {
      position: "relative",
      overflow: "hidden",
      flexShrink: "0",
      width: "28px",
      height: "28px",
    });
    const img = document.createElement("img");
    img.src = spriteImageUrl(id || null);
    img.alt = id || "unknown";
    const s = spriteFitStyle(id || null, 28);
    Object.assign(img.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${s.width}px`,
      height: `${s.height}px`,
      maxWidth: "none",
      transformOrigin: "0 0",
      transform: String(s.transform),
    });
    frame.appendChild(img);
    container.appendChild(frame);
  });
}

export default function RecentMatchWinRateChart({ userId }: Props) {
  const [countMode, setCountMode] = useState<CountMode>("20");
  const [stat, setStat] = useState<RecentMatchStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartJS<"line">>(null);
  const chartDataRef = useRef<RecentMatchItemType[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipSpriteContainerRef = useRef<HTMLDivElement>(null);
  const tooltipTitleRef = useRef<HTMLParagraphElement>(null);
  const tooltipResultRef = useRef<HTMLSpanElement>(null);
  const tooltipOpponentRef = useRef<HTMLSpanElement>(null);
  const tooltipRateRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecent() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("count", countMode);

        const res = await fetch(`/api/users/${userId}/stat/recent?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data: RecentMatchStatType = await res.json();
        if (!cancelled) setStat(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRecent();
    return () => {
      cancelled = true;
    };
  }, [userId, countMode]);

  const chartData: RecentMatchItemType[] = stat?.matches ?? [];
  chartDataRef.current = chartData;

  // ローリング勝率の信頼性を確保するため、選択した戦数分のデータが貯まるまでは機能をロックする
  const requiredCount = Number(countMode);
  const totalMatches = stat?.total_matches ?? 0;
  const isInsufficientData = !isLoading && stat != null && totalMatches < requiredCount;
  const progressPercent = Math.min(100, (totalMatches / requiredCount) * 100);

  // 環境（レギュレーション）が切り替わった直後の試合インデックスを検出する
  const environmentBoundaries = chartData.reduce<{ index: number; title: string }[]>(
    (acc, d, idx) => {
      if (idx === 0) return acc;
      const prev = chartData[idx - 1];
      if (d.environment_id && d.environment_id !== prev.environment_id) {
        acc.push({ index: idx, title: d.environment_title || "新環境" });
      }
      return acc;
    },
    [],
  );

  // シーズン・環境をまたいだ場合に、切り替わり地点へ点線と環境名を描画するプラグイン
  const environmentBoundaryPlugin: Plugin<"line"> = {
    id: "environmentBoundary",
    afterDraw(chart) {
      if (environmentBoundaries.length === 0) return;

      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      if (!xScale || !chartArea) return;

      ctx.save();
      environmentBoundaries.forEach(({ index, title }) => {
        const x = xScale.getPixelForValue(index - 0.5);
        if (x < chartArea.left || x > chartArea.right) return;

        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const nearRightEdge = chartArea.right - x < 60;
        ctx.fillStyle = "#71717a";
        ctx.font = "9px sans-serif";
        ctx.textAlign = nearRightEdge ? "right" : "left";
        ctx.textBaseline = "top";
        ctx.fillText(
          `ここから『${title}』`,
          x + (nearRightEdge ? -4 : 4),
          chartArea.top + 2,
        );
      });
      ctx.restore();
    },
  };

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

    if (tooltipSpriteContainerRef.current)
      renderTooltipSprites(tooltipSpriteContainerRef.current, d.pokemon_sprites ?? []);

    if (tooltipTitleRef.current)
      tooltipTitleRef.current.textContent = `第${d.sequence}戦 ${formatTooltipDate(d.event_date)}`;

    if (tooltipRateRef.current) {
      tooltipRateRef.current.textContent = `${(d.rolling_win_rate * 100).toFixed(1)}%`;
      tooltipRateRef.current.className = `font-black text-sm ${winRateTextColor(d.rolling_win_rate)}`;
    }

    if (tooltipResultRef.current) {
      tooltipResultRef.current.textContent = d.victory ? "勝ち" : "負け";
      tooltipResultRef.current.className = `font-black text-[11px] ${d.victory ? "text-success" : "text-danger"}`;
    }
    if (tooltipOpponentRef.current)
      tooltipOpponentRef.current.textContent = `対${d.opponents_deck_info || "不明"}`;

    const pointX = xScale.getPixelForValue(idx);
    const pointY = chart.scales.y.getPixelForValue(d.rolling_win_rate * 100);

    el.style.visibility = "hidden";
    el.style.display = "block";
    const tooltipWidth = el.offsetWidth;
    const tooltipHeight = el.offsetHeight;
    const containerWidth = containerRect.width;

    const rawX = canvasRect.left - containerRect.left + pointX;
    const clampedX = Math.max(
      tooltipWidth / 2,
      Math.min(containerWidth - tooltipWidth / 2, rawX),
    );

    // 吹き出しの上端座標を直接計算し、コンテナの範囲内に収まるようクランプする
    // （はみ出させてから向きを切り替えるのではなく、そもそもはみ出させない）
    const rawY = canvasRect.top - containerRect.top + pointY;
    const desiredTop = rawY - tooltipHeight - 8;
    const clampedTop = Math.max(
      0,
      Math.min(containerRect.height - tooltipHeight, desiredTop),
    );

    el.style.transform = "translateX(-50%)";
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedTop}px`;
    el.style.visibility = "visible";
  }

  function hideTooltip() {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }

  const labels = chartData.map((d) => `${d.sequence}`);
  const winRates = chartData.map((d) => Math.round(d.rolling_win_rate * 1000) / 10);

  // 折れ線の変化が見やすいよう、データの範囲に応じて縦軸のスケールを自動調整する
  const dataMin = winRates.length > 0 ? Math.min(...winRates) : 0;
  const dataMax = winRates.length > 0 ? Math.max(...winRates) : 100;
  const padding = Math.max((dataMax - dataMin) * 0.2, 5);
  let yMin = Math.max(0, Math.floor((dataMin - padding) / 5) * 5);
  let yMax = Math.min(100, Math.ceil((dataMax + padding) / 5) * 5);
  if (yMax - yMin < 20) {
    const center = (yMax + yMin) / 2;
    yMin = Math.max(0, Math.floor((center - 10) / 5) * 5);
    yMax = Math.min(100, Math.ceil((center + 10) / 5) * 5);
  }

  const data = {
    labels,
    datasets: [
      {
        data: winRates,
        borderColor: "#F5A524",
        backgroundColor: "rgba(245, 165, 36, 0.08)",
        borderWidth: 2,
        pointBackgroundColor: (ctx: { dataIndex: number }) =>
          chartDataRef.current[ctx.dataIndex]?.victory ? "#17C964" : "#F31260",
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
        title: { display: true, text: "試合数", color: "#71717a", font: { size: 10 } },
      },
      y: {
        min: yMin,
        max: yMax,
        ticks: {
          color: "#71717a",
          font: { size: 10 },
          callback: (v: number | string) => `${v}%`,
          maxTicksLimit: 5,
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
          <span className="text-xs font-bold text-default-700">直近N戦の勝率推移</span>
          <div className="relative">
            <select
              value={countMode}
              onChange={(e) => setCountMode(e.target.value as CountMode)}
              className="appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="20">直近20戦</option>
              <option value="30">直近30戦</option>
              <option value="40">直近40戦</option>
              <option value="50">直近50戦</option>
              <option value="100">直近100戦</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        {/* グラフ */}
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <span className="text-xs text-default-400">読み込み中...</span>
          </div>
        ) : isInsufficientData ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span className="text-xs font-bold text-default-600">
              直近{countMode}戦の勝率推移は、あと
              {Math.max(0, requiredCount - totalMatches)}対戦後に閲覧できます
            </span>
            <div className="w-full max-w-40 h-1.5 bg-default-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-default-400 tabular-nums">
              {totalMatches} / {requiredCount} 戦
            </span>
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
            <Line
              ref={chartRef}
              data={data}
              options={options}
              plugins={[environmentBoundaryPlugin]}
            />

            {/* カスタムツールチップ（DOM 直接操作） */}
            <div
              ref={tooltipRef}
              className="absolute z-40 pointer-events-none bg-content1 border border-default-200 rounded-xl px-3 py-2 shadow-lg text-xs whitespace-nowrap"
              style={{ display: "none", transform: "translateX(-50%)" }}
            >
              <p
                ref={tooltipTitleRef}
                className="font-bold text-default-700 text-center mb-1"
              />
              {/* 対戦相手デッキのスプライト画像 */}
              <div
                ref={tooltipSpriteContainerRef}
                className="flex justify-center gap-0 mb-1"
              />
              <div className="flex items-center justify-center gap-1 mb-1">
                <span ref={tooltipResultRef} />
                <span ref={tooltipOpponentRef} className="text-default-500" />
              </div>
              <p ref={tooltipRateRef} className="text-center" />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
