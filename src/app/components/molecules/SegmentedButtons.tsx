"use client";

import { ReactNode } from "react";

export type SegmentedOption<K extends string> = {
  key: K;
  label: ReactNode;
  title?: string;
};

type Props<K extends string> = {
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (value: K) => void;
  ariaLabel: string;
  // radiogroup は「状態の切り替え」(利用中/アーカイブ済み)、group は「表示の切り替え」(リスト/ギャラリー)
  role?: "radiogroup" | "group";
  // 溝(トラック)と選択中のつまみの色。既定は default-100 の溝に background のつまみ
  trackClassName?: string;
  selectedClassName?: string;
  className?: string;
};

/*
 * 左右(または複数)に等分したピル型の切り替え。デッキ一覧のヘッダ行で
 * 「利用中／アーカイブ済み」と「リスト／ギャラリー」が同じ大きさ・同じ見た目で並ぶように、
 * 文字の大きさ(0.6875rem)・余白・折り返し禁止をここで1か所に持つ
 * (狭い端末(360px幅)でも「ギャラリー」「アーカイブ済み」が折り返さない値)。
 *
 * 行の高さ(leading-4)も明示する。素の line-height 1.5 だと 16.5px になって全体が 32.5px になり、
 * 読み込み中の骨格(h-8=32px)と 0.5px ずれて、実体に切り替わった瞬間に一覧が 1px 下がる。
 */
export default function SegmentedButtons<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  role = "group",
  trackClassName = "bg-default-100",
  selectedClassName = "bg-background text-foreground shadow-sm",
  className = "",
}: Props<K>) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={`flex w-full items-center gap-0.5 rounded-lg p-0.5 ${trackClassName} ${className}`}
    >
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role={role === "radiogroup" ? "radio" : undefined}
            aria-checked={role === "radiogroup" ? selected : undefined}
            aria-pressed={role === "group" ? selected : undefined}
            title={option.title}
            onClick={() => onChange(option.key)}
            className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1.5 text-[0.6875rem] leading-4 font-bold transition-colors ${
              selected ? selectedClassName : "text-default-500"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
