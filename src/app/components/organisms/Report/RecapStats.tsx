"use client";

import type { ReactNode } from "react";

import { TONE, type RecapTone } from "@app/components/organisms/Report/RecapCardFrame";

export type RecapStatItem = {
  label: string;
  // 数値そのもの（"12" や "66.7"）。単位は unit に分けて渡す。
  // 「13勝8敗」のような複合表記は、漢字を RecapStatUnit で小さくして組んだ
  // ノードを渡す（そのままの大きさだと3列に収まらない）
  value: ReactNode;
  // "%" など、数値より小さく添える単位
  unit?: string;
  // 単位よりさらに小さく添える補足（引き分けの内訳など）
  note?: string;
};

type Props = {
  tone: RecapTone;
  // 3項目までを想定（1080px幅で数値を88pxで組んでも収まる範囲）
  items: RecapStatItem[];
};

// 数値に添える単位・助数詞。数字の半分の大きさにして列幅に収める。
// 数字側を小さくしたときは size を合わせて渡す
export function RecapStatUnit({
  children,
  size = 44,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <span style={{ fontSize: size }} className="font-bold">
      {children}
    </span>
  );
}

/*
 * レポート下部に並べる数値の列。
 *
 * 値は「数字＋単位」に分けて渡す。単位や助数詞は数字より小さく組まないと
 * 1080px 幅の3列に収まらない（→ RecapStatUnit）。
 */
export default function RecapStats({ tone, items }: Props) {
  const t = TONE[tone];

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item, idx) => (
        <div
          key={item.label}
          className="flex flex-col"
          style={
            idx === 0
              ? { gap: 10 }
              : { gap: 10, paddingLeft: 40, borderLeft: `2px solid ${t.rule}` }
          }
        >
          <span style={{ fontSize: 26, color: t.sub }}>{item.label}</span>
          <span
            style={{ fontSize: 88, lineHeight: 1, letterSpacing: "-0.03em" }}
            className="font-black tabular-nums"
          >
            {item.value}
            {item.unit && (
              <span style={{ fontSize: 44 }} className="font-bold">
                {item.unit}
              </span>
            )}
            {item.note && (
              <span style={{ fontSize: 26, color: t.sub }} className="font-bold">
                {item.note}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
