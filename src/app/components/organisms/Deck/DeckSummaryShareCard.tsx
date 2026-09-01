"use client";

import { Card, CardBody } from "@heroui/react";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckGoStatsGrid from "@app/components/molecules/DeckGoStatsGrid";

import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";

// 末尾".0"を落として小数第1位までのパーセント表記にする（"50.0"→"50"）
function trimTrailingZeroDecimal(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

function formatPercent(rate: number): string {
  return `${trimTrailingZeroDecimal((rate * 100).toFixed(1))}%`;
}

// 勝率に応じた色分け（UserStatPanel などの勝率表示と同じ閾値）
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

type Props = {
  deckName: string;
  // ヘッダーに並べるスプライト（常に2枠。無い枠は unknown で表示される）
  sprites: DeckPokemonSpriteType[];
  stat: DeckUsageItemType | null;
};

/*
 * デッキ詳細の「シェアする」用カード。
 *
 * 画面の「対戦成績」から操作UIを外し、デッキの識別（スプライト＋名前）と
 * 勝率・戦績・先攻/後攻の内訳だけを載せた静止した見た目にする。
 * 記録のシェア(ShareRecordModal)・分析パネルのシェア(PanelShareModal)と同じく、
 * 画面外に描画して1枚のPNGに書き出す。数値表示は画面と同じ部品
 * (DeckGoStatsGrid)を使い、画面と画像で食い違わないようにする。
 */
export default function DeckSummaryShareCard({ deckName, sprites, stat }: Props) {
  const hasStats = !!stat && stat.count > 0;
  const winRate = stat?.win_rate ?? 0;

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* 見出し：スプライト＋デッキ名 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-0">
            <PokemonSprite id={sprites[0]?.id} size={52} />
            <PokemonSprite id={sprites[1]?.id} size={52} />
          </div>
          <h2 className="w-full text-center text-base font-bold">{deckName}</h2>
          <p className="text-xs text-default-400">デッキ成績</p>
        </div>

        {hasStats ? (
          <>
            {/* 勝率＋戦績 */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-default-400">
                勝率
              </span>
              <span
                className={`text-4xl font-black tabular-nums ${winRateTextColor(winRate)}`}
              >
                {formatPercent(winRate)}
              </span>
              <span className="text-tiny tabular-nums text-default-500">
                {`${stat!.count}戦 ${stat!.wins}勝 ${stat!.losses}敗`}
              </span>
            </div>

            {/* 先攻/後攻の内訳（試行があるときのみ） */}
            {stat!.game_count > 0 && (
              <DeckGoStatsGrid
                winRate={stat!.win_rate}
                goFirstCount={stat!.go_first_count}
                goFirstRate={stat!.go_first_rate}
                goFirstWinRate={stat!.go_first_win_rate}
                goSecondCount={stat!.go_second_count}
                goSecondWinRate={stat!.go_second_win_rate}
              />
            )}
          </>
        ) : (
          <div className="rounded-xl bg-default-100 px-3 py-4 text-center">
            <div className="text-tiny font-bold text-default-600">
              まだ対戦記録がありません
            </div>
            <div className="text-[0.625rem] text-default-400">
              対戦を記録すると勝率や先攻・後攻の成績が載ります
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
