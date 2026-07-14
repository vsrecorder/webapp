"use client";

import { useId } from "react";

/*
 * 「きずな」機能のロゴ（むすび火）。
 *
 * 大小2つの炎が、根で1つに重なっている。トレーナーとポケモン——どちらが主かは決めず、
 * 重なった根が1つの火になる、という形。焚き火（プロモ・結果カード・一覧の灯）と同じ
 * 視覚言語で、機能全体が一本につながる。
 *
 * 使い分け：
 *   通常          <KizunaMark size={24} />            グラデーション。バッジ・通知・見出し
 *   単色          <KizunaMark size={20} mono />       currentColor でともる。通知バー・ナビ
 *   レベル表示    <KizunaMark size={28} level={178} /> 輪郭は同じまま、下から満ちる
 *
 * level を渡したときだけ「満ちる」表現になる。0でも輪郭は残るので、
 * 「まだ灯っていない」状態を、消滅ではなく“これから”として見せられる。
 */

// 後ろの炎（小）と前の炎（大）。viewBox 32×32。
const BACK =
  "M 10.6 5.2 C 7.44 14.38, 6.20 18.10, 6.20 21.2 A 6.2 6.2 0 1 0 18.60 21.2 C 18.60 18.10, 17.36 14.38, 10.6 5.2 Z";
const FRONT =
  "M 20.6 6.4 C 13.44 12.68, 12.00 17.00, 12.00 20.6 A 7.2 7.2 0 1 0 26.40 20.6 C 26.40 17.00, 24.96 12.68, 20.6 6.4 Z";

// 炎の下端と上端（クリップの計算に使う）
const FLAME_BOTTOM = 28.2;
const FLAME_HEIGHT = 24.5;

const KIZUNA_MAX = 255;

type Props = {
  size?: number;
  // 0〜255。渡すと、その値まで下から満ちた状態で描く
  level?: number;
  // currentColor の単色で描く（通知バーやナビの単色アイコン用）
  mono?: boolean;
  className?: string;
};

export default function KizunaMark({ size = 24, level, mono, className }: Props) {
  // 同じページに複数置かれるため、グラデーションとクリップのidは実体ごとに分ける
  const uid = useId().replace(/:/g, "");
  const gradientId = `kizuna-grad-${uid}`;
  const clipId = `kizuna-clip-${uid}`;

  const ratio = level === undefined ? 1 : Math.min(1, Math.max(0, level / KIZUNA_MAX));
  const fill = mono ? "currentColor" : `url(#${gradientId})`;

  const flames = (
    <>
      <path d={BACK} fill={fill} opacity={mono ? 0.45 : 0.55} />
      <path d={FRONT} fill={fill} />
    </>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={level === undefined ? "きずな" : `きずなLv. ${level}`}
      className={className}
    >
      {!mono && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      )}

      {level === undefined ? (
        flames
      ) : (
        <>
          {/* 輪郭。まだ灯っていない部分も、消さずに残す */}
          <g fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45">
            <path d={BACK} />
            <path d={FRONT} />
          </g>
          <defs>
            <clipPath id={clipId}>
              <rect
                x="0"
                y={FLAME_BOTTOM - FLAME_HEIGHT * ratio}
                width="32"
                height="32"
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>{flames}</g>
        </>
      )}
    </svg>
  );
}
