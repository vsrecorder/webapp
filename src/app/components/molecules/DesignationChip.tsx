"use client";

import { designationForTier } from "@app/utils/designationTier";
import { NO_RANK_IMAGE, rankForTier } from "@app/utils/designationRank";

type Props = {
  // 称号ティア(0=称号なし)
  tier: number;
  size?: "sm" | "md";
  className?: string;
};

/*
 * ランクのボール画像 ＋ 称号の絵文字と名前を1つのチップにまとめる。
 * みんなの公開デッキの投稿者・いいねした人に添える。称号が無い(ティア0)場合は出さない。
 */
export default function DesignationChip({ tier, size = "sm", className = "" }: Props) {
  const designation = designationForTier(tier);
  if (!designation) return null;

  const rank = rankForTier(tier);
  const image = rank?.image ?? NO_RANK_IMAGE;
  const sizeClass = size === "md" ? "text-xs px-2 py-0.5 gap-1.5" : "text-[0.625rem] px-1.5 py-px gap-1";
  const iconSize = size === "md" ? 16 : 13;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-default-100 font-bold leading-tight text-default-700 shrink-0 ${sizeClass} ${className}`}
      title={rank ? `${rank.name} · ${designation.name}` : designation.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={rank?.name ?? "ランクなし"} width={iconSize} height={iconSize} />
      <span aria-hidden="true">{designation.emoji}</span>
      <span>{designation.name}</span>
    </span>
  );
}
