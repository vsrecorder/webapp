"use client";

import { Button } from "@heroui/react";

// 2択(先攻/後攻・勝ち/負け など)をラジオボタンではなくボタンで選ばせる共通UI。
// 選択中は solid + 指定色、未選択は bordered のアウトライン表示にする。
// タップ領域が大きく状態も一目で分かるため、簡素化フォーム(CTA)と対戦結果モーダルで共有する。

// 「作成」「更新」「保存」などのアクションボタンは primary のため、
// 選択状態の色に primary を使うと押すべきボタンと紛らわしい。
// 先攻/後攻のような中立の2択には secondary を使う。
type ChoiceColor = "primary" | "secondary" | "success" | "warning" | "danger";

export type ChoiceOption<T> = {
  value: T;
  label: string;
  // 選択時の色。未指定は primary。
  color?: ChoiceColor;
};

type Props<T> = {
  // 現在の選択値。どの選択肢とも一致しない場合(null や "-1" など)は未選択として全てアウトライン表示になる。
  value: T | null;
  onChange: (value: T) => void;
  options: ChoiceOption<T>[];
  isDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  // 横並びで使う場合に flex-1 などを渡して幅を制御するためのクラス
  className?: string;
};

export default function ChoiceButtonGroup<T>({
  value,
  onChange,
  options,
  isDisabled = false,
  size = "md",
  className = "",
}: Props<T>) {
  // 中央寄せにしつつ、親(カードやモーダル)の幅を超えないようにする。
  // flex-1 + min-w-0 で幅が足りなければ縮み、max-w で広がりすぎも防ぐ。
  // 固定の min-width を与えると narrow なモーダル内でカードからはみ出すため使わない。
  const maxWidthClass = size === "sm" ? "max-w-24" : "max-w-32";

  return (
    <div className={`flex gap-2 justify-center w-full ${className}`}>
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <Button
            key={index}
            size={size}
            radius="lg"
            isDisabled={isDisabled}
            color={isSelected ? (option.color ?? "primary") : "default"}
            variant={isSelected ? "solid" : "bordered"}
            className={`font-bold flex-1 min-w-0 ${maxWidthClass}`}
            onPress={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
