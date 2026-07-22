"use client";

import { Button } from "@heroui/react";
import { LuMinus, LuPlus } from "react-icons/lu";

// サイドは0〜6枚
const MIN_PRIZE_CARDS = 0;
const MAX_PRIZE_CARDS = 6;

type Props = {
  yourPrizeCards: number;
  opponentsPrizeCards: number;
  onYourChange: (value: number) => void;
  onOpponentsChange: (value: number) => void;
  isDisabled?: boolean;
};

// サイド枚数をスコアボード風のステッパーで入力する。
// 「1枚ずつ取る」という実際の対戦の感覚と操作が一致し、1行に収まるため縦スペースも小さい。
// 対戦結果の作成モーダルと更新モーダルで共用する。
export default function PrizeCardsStepper({
  yourPrizeCards,
  opponentsPrizeCards,
  onYourChange,
  onOpponentsChange,
  isDisabled = false,
}: Props) {
  const clamp = (value: number) =>
    Math.min(MAX_PRIZE_CARDS, Math.max(MIN_PRIZE_CARDS, value));

  const renderSide = (
    label: string,
    value: number,
    onChange: (value: number) => void,
  ) => (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-tiny font-bold text-default-600">{label}</span>
      <div className="flex items-center gap-2 rounded-full border border-default-200 bg-default-50 px-1.5 py-1">
        <Button
          isIconOnly
          size="sm"
          radius="full"
          variant="bordered"
          className="min-w-7 w-7 h-7 bg-content1"
          isDisabled={isDisabled || value <= MIN_PRIZE_CARDS}
          aria-label={`${label}のサイドを1枚減らす`}
          onPress={() => onChange(clamp(value - 1))}
        >
          <LuMinus className="w-4 h-4" />
        </Button>

        <span className="min-w-7 text-center text-xl font-bold tabular-nums">
          {value}
        </span>

        <Button
          isIconOnly
          size="sm"
          radius="full"
          variant="bordered"
          className="min-w-7 w-7 h-7 bg-content1"
          isDisabled={isDisabled || value >= MAX_PRIZE_CARDS}
          aria-label={`${label}のサイドを1枚増やす`}
          onPress={() => onChange(clamp(value + 1))}
        >
          <LuPlus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-3">
      {renderSide("自分", yourPrizeCards, onYourChange)}
      {/* ラベル行のぶん下げて数字と高さを揃える */}
      <span className="pt-5 text-xl font-bold text-default-400">-</span>
      {renderSide("相手", opponentsPrizeCards, onOpponentsChange)}
    </div>
  );
}
