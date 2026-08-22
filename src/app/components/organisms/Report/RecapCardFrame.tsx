"use client";

import type { ReactNode } from "react";

import {
  periodKindLabel,
  periodShortLabel,
  type RecapPeriod,
} from "@app/utils/recapPeriod";

/*
 * 月次ふりかえりカードの共通枠。
 *
 * 実寸は 1080×1350(4:5)で固定する。captureThemedPng に
 * { targetWidth: CARD_WIDTH, bare: true, desiredPixelRatio: 2 } を渡すことで、
 * 余白もサービスフッターも付けずに、このカードの見た目をそのまま書き出す
 * (KizunaHeaderCard と同じ考え方。サービス表記はカード自身が内包する)。
 *
 * 4:5 なのは X のタイムラインで縦に大きく表示される比率のため。
 * 9:16 にすると X 側で上下が切れる。
 *
 * 配色は面ごとの単色ベタで、グラデーションは使わない。
 * (utils/ogImage.tsx と同じ理由。グラデにすると PNG が圧縮できず数倍に肥大する)
 */

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export type RecapTone = "primary" | "secondary" | "dark" | "amber" | "light";

type ToneStyle = {
  bg: string;
  fg: string;
  // ラベルや補足に使う、地に沈めた文字色
  sub: string;
  // 主役の数字に使う色
  accent: string;
  // 区切り線
  rule: string;
};

export const TONE: Record<RecapTone, ToneStyle> = {
  // ブランドの primary(#006FEE) / secondary(#7828c8) は @heroui/theme の既定値
  primary: {
    bg: "#006FEE",
    fg: "#ffffff",
    sub: "rgba(255, 255, 255, 0.6)",
    accent: "#fbbf24",
    rule: "rgba(255, 255, 255, 0.25)",
  },
  secondary: {
    bg: "#7828c8",
    fg: "#ffffff",
    sub: "rgba(255, 255, 255, 0.6)",
    accent: "#fbbf24",
    rule: "rgba(255, 255, 255, 0.25)",
  },
  // OGP画像(utils/ogImage.tsx)と同じ地色・罫線色
  dark: {
    bg: "#0f172a",
    fg: "#ffffff",
    sub: "rgba(255, 255, 255, 0.45)",
    accent: "#fbbf24",
    rule: "rgba(148, 163, 184, 0.25)",
  },
  // ストリークは画面側でも warning(#f5a524) を当てているため、その色を面にする。
  // 明るい面なので文字は暗色に反転させる。
  amber: {
    bg: "#f5a524",
    fg: "#0f172a",
    sub: "rgba(15, 23, 42, 0.55)",
    accent: "#0f172a",
    rule: "rgba(15, 23, 42, 0.2)",
  },
  // 最後の1枚だけアプリの地色(globals.css の app-dot-bg と同じ #fafcff)に戻す
  light: {
    bg: "#fafcff",
    fg: "#0f172a",
    sub: "rgba(15, 23, 42, 0.4)",
    accent: "#006FEE",
    rule: "rgba(15, 23, 42, 0.12)",
  },
};

type Props = {
  tone: RecapTone;
  period: RecapPeriod;
  // カードの主役。上下の見出し・フッターとの間に分散して置かれる
  children: ReactNode;
  // フッターのすぐ上に置く要素（数値の列や締めの一文）。フッターとは詰めて配置する
  bottom?: ReactNode;
  // 既定のサービス表記を差し替える(最後の1枚だけ大きく見せる)
  footer?: ReactNode;
};

export default function RecapCardFrame({
  tone,
  period,
  children,
  bottom,
  footer,
}: Props) {
  const t = TONE[tone];

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        padding: 88,
        backgroundColor: t.bg,
        color: t.fg,
      }}
      className="box-border flex flex-col justify-between overflow-hidden"
    >
      <div className="flex items-baseline justify-between">
        <span
          style={{ fontSize: 28, letterSpacing: "0.2em", color: t.sub }}
          className="font-bold"
        >
          {periodKindLabel(period)}
        </span>
        <span
          style={{ fontSize: 28, letterSpacing: "0.1em", color: t.fg, opacity: 0.85 }}
          className="font-bold tabular-nums"
        >
          {periodShortLabel(period)}
        </span>
      </div>

      {children}

      <div className="flex flex-col" style={{ gap: 44 }}>
        {bottom}
        {footer ?? <RecapServiceMark tone={tone} />}
      </div>
    </div>
  );
}

/*
 * カード内に置くサービス表記。
 *
 * bare 書き出しでは captureImage 側のフッターが付かないため、カードが自前で持つ。
 * アイコンは素の <img>(next/image でも HeroUI の <Image> でもない)にする。
 * 書き出しはDOMを複製して描画するため、読み込み完了まで透明になる実装だと
 * 複製時点で写らないことがある(PokemonSprite の raw と同じ理由)。
 */
export function RecapServiceMark({ tone }: { tone: RecapTone }) {
  const t = TONE[tone];

  return (
    <div className="flex items-center" style={{ gap: 22 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-512x512.png"
        alt=""
        width={56}
        height={56}
        style={{ borderRadius: 13 }}
      />
      <span style={{ fontSize: 26, color: t.sub }} className="font-bold">
        vsrecorder.mobi
      </span>
    </div>
  );
}
