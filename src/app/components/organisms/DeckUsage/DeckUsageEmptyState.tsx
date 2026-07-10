"use client";

import { useMemo } from "react";

import Link from "next/link";
import { Button } from "@heroui/react";
import { ArcElement, Chart as ChartJS, Tooltip as ChartTooltip } from "chart.js";
import { Pie } from "react-chartjs-2";

import { createPieSlicesSpritePlugin } from "@app/utils/pieSlicesSpritePlugin";

ChartJS.register(ArcElement, ChartTooltip);

// 実データのグラフと寸法を揃えるための定数（DeckUsagePanel/OpponentDeckUsagePanelと同じ値）
const CHART_SIZE = 192;
const EXTERNAL_SPRITE_PADDING = 64;

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";
// デッキ未登録デッキの表示にも使われている「不明」スプライトを、ダミー表示にも流用する
const UNKNOWN_SPRITE_URL = `${SPRITE_BASE_URL}/unknown.png`;

// データがない場合に「グラフの見た目」を伝えるためのダミー円グラフの配色
const DUMMY_SLICE_COLORS = ["#D4D4D8", "#A1A1AA", "#D4D4D8", "#A1A1AA"];

const DUMMY_CHART_DATA = {
  labels: ["", "", "", ""],
  datasets: [
    {
      data: [35, 25, 25, 15],
      backgroundColor: DUMMY_SLICE_COLORS,
      borderColor: "#ffffff",
      borderWidth: 2,
    },
  ],
};

const DUMMY_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: EXTERNAL_SPRITE_PADDING },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
};

type Props = {
  message: string;
};

export default function DeckUsageEmptyState({ message }: Props) {
  // 各スライスに「不明」スプライトのバッジを表示し、実データ表示時と見た目を揃える
  const spritePlugin = useMemo(
    () =>
      createPieSlicesSpritePlugin(
        () => [UNKNOWN_SPRITE_URL, UNKNOWN_SPRITE_URL],
        (idx) => DUMMY_SLICE_COLORS[idx] ?? DUMMY_SLICE_COLORS[0],
      ),
    [],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full opacity-40"
        style={{ height: CHART_SIZE + EXTERNAL_SPRITE_PADDING * 2 }}
      >
        <Pie
          data={DUMMY_CHART_DATA}
          options={DUMMY_CHART_OPTIONS}
          plugins={[spritePlugin]}
        />
      </div>
      <p className="text-center text-xs text-default-400 pt-3 pb-3 px-4 whitespace-pre-line">
        {message}
      </p>
      <Button
        as={Link}
        href="/records/create"
        size="sm"
        color="primary"
        radius="full"
        className="text-xs font-bold h-8 px-4"
      >
        対戦記録を作成する
      </Button>
    </div>
  );
}
