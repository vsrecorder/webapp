"use client";

import { Card, CardBody, Chip } from "@heroui/react";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import SharePieChart, {
  type SharePieSlice,
} from "@app/components/molecules/Share/SharePieChart";
import { roundToSignificantDigits } from "@app/utils/number";

// シェア画像用に正規化したデッキ1件分の表示データ。
// 「デッキ使用率分析」(自分のデッキ)と「対戦相手のデッキ分布」で元の型が違うため、
// パネル側でこの形に揃えてから渡す。
export type ShareDeckRow = {
  key: string;
  name: string;
  // 凡例に並べるスプライト（常に2枠。無い枠は unknown で表示される）
  spriteIds: [string | undefined, string | undefined];
  // スプライトが1体でも登録されているか。円グラフ外周のバッジはこのときだけ描く
  // （「その他」のようにデッキの手掛かりが無い項目にモンスターボールを並べても意味がないため）
  hasSprite: boolean;
  count: number;
  usageRate: number;
  winRate: number;
};

type Props = {
  // カードの見出し（例: 「デッキ使用率分析」）
  title: string;
  // 集計期間などの補足（例: 「『メガリザードンex』環境 のデッキ使用率」）
  subtitle: string;
  // 円グラフ・凡例に出す項目（パネル側で「その他」に集約済みのもの）
  rows: ShareDeckRow[];
  // 各項目の色（凡例の色ドット・バッジの縁）と円の塗り色。パネルの配色をそのまま受け取る
  colors: string[];
  softColors: string[];
  // 割合の呼び方。使用デッキは「使用率」、対戦相手は「対面率」
  usageLabel: string;
  // シェア画像の幅(px)。円グラフの大きさを決めるのに使う
  width: number;
};

// 勝率に応じた色分け（UserStatPanel・各パネルの勝率表示と同じ閾値）
function winRateChipColor(rate: number): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

// カードの左右パディング(p-4 = 16px)。円グラフだけはこのパディングを打ち消して
// カード幅いっぱいに使い、外周のスプライトバッジが切れないようにする。
const CARD_PADDING_X = 16;

/*
 * デッキ分布（円グラフ＋凡例）パネルのシェア画像用カード。
 * 「デッキ使用率分析」と「対戦相手のデッキ分布」の両方から使う。
 *
 * 画面のパネルからフィルタ操作用のUI(タブ・セレクタ)とタップ操作を外し、
 * 円グラフ・凡例だけを載せた静止した見た目にする。
 * 円グラフは <canvas> ではなく SVG で描く（理由は SharePieChart のコメントを参照）。
 */
export default function DeckDistributionShareCard({
  title,
  subtitle,
  rows,
  colors,
  softColors,
  usageLabel,
  width,
}: Props) {
  const slices: SharePieSlice[] = rows.map((row, idx) => ({
    value: row.count,
    color: colors[idx],
    softColor: softColors[idx],
    spriteIds: row.hasSprite ? row.spriteIds : [],
    // 画面の外周バッジと同じ丸め方（有効数字3桁）で割合を出す
    percentText: `${roundToSignificantDigits(row.usageRate * 100, 3)}%`,
  }));

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-sm font-bold text-default-700">{title}</h2>
          <p className="whitespace-pre-line text-center text-xs text-default-400">
            {subtitle}
          </p>
        </div>

        {/* 円グラフはカードのパディングを打ち消して幅いっぱいに描く */}
        <div style={{ marginLeft: -CARD_PADDING_X, marginRight: -CARD_PADDING_X }}>
          <SharePieChart slices={slices} width={width} />
        </div>

        {/* 凡例リスト（色ドット + スプライト + デッキ名 + 割合・勝率） */}
        <div className="flex flex-col gap-1.5">
          {rows.map((row, idx) => (
            <div
              key={row.key}
              className="flex items-center gap-2 rounded-xl bg-default-100 px-3 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[idx] }}
              />
              <div className="flex w-16 shrink-0 justify-center">
                {/* 書き出し専用のカードなので、確実に写る素の <img>(raw) で描く */}
                <PokemonSprite id={row.spriteIds[0]} size={32} raw />
                <PokemonSprite id={row.spriteIds[1]} size={32} raw />
              </div>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-default-700">
                {row.name}
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1 border-l border-default-200 pl-2">
                <span className="text-[0.625rem] tabular-nums text-default-400">
                  {usageLabel} {(row.usageRate * 100).toFixed(1)}% ({row.count}件)
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color={winRateChipColor(row.winRate)}
                  classNames={{
                    base: "h-5 px-0.5",
                    content: "text-[0.6875rem] font-black tabular-nums px-1.5",
                  }}
                >
                  勝率 {(row.winRate * 100).toFixed(1)}%
                </Chip>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
