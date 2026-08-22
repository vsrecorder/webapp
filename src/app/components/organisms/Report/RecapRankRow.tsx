"use client";

import RecapSprites from "@app/components/organisms/Report/RecapSprites";
import { TONE, type RecapTone } from "@app/components/organisms/Report/RecapCardFrame";

type SpriteWithPosition = { id: string; position?: number };

type Props = {
  tone: RecapTone;
  // 2位以降に付ける順位
  rank: number;
  sprites: SpriteWithPosition[] | undefined | null;
  name: string;
  // 右端に添える内訳（12戦 ・ 勝率 58.3% など）
  detail: string;
};

// 名前は自由入力なので、長さに応じて字を詰める。
// 順位・スプライト・内訳を除いた残り幅（およそ400px）に収まる範囲で落とす。
function nameFontSize(name: string): number {
  const length = [...name].length;
  if (length <= 8) return 40;
  if (length <= 11) return 34;
  if (length <= 14) return 28;
  return 24;
}

/*
 * 1位の下に添える2位・3位の行。
 *
 * 主役は1位なので、こちらはスプライトも字も小さくして、順位が続きであることだけを示す。
 */
export default function RecapRankRow({ tone, rank, sprites, name, detail }: Props) {
  const t = TONE[tone];

  return (
    <div className="flex items-center" style={{ gap: 20 }}>
      <span
        style={{ fontSize: 34, color: t.sub, width: 30 }}
        className="shrink-0 font-black tabular-nums"
      >
        {rank}
      </span>

      <RecapSprites sprites={sprites} size={80} />

      <span
        style={{ fontSize: nameFontSize(name), lineHeight: 1.2 }}
        className="min-w-0 flex-1 truncate font-bold"
      >
        {name}
      </span>

      <span
        style={{ fontSize: 28, color: t.sub }}
        className="shrink-0 font-bold tabular-nums"
      >
        {detail}
      </span>
    </div>
  );
}
