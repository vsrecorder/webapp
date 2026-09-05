// 称号のティア → 絵文字・名前。core-apiserver の db/schema.sql(designations)と同じ並び。
//
// みんなの公開デッキの投稿者・いいねした人は称号のティアだけを持って返るため、
// 表示用の絵文字と名前をここで引く。ティア 9・10 は「準備中」で通常は返らない。
export type DesignationTierInfo = {
  tier: number;
  emoji: string;
  name: string;
};

export const DESIGNATION_TIERS: readonly DesignationTierInfo[] = [
  { tier: 1, emoji: "🌱", name: "駆け出し" },
  { tier: 2, emoji: "🔰", name: "見習い" },
  { tier: 3, emoji: "👍", name: "一人前" },
  { tier: 4, emoji: "🎫", name: "レギュラー" },
  { tier: 5, emoji: "💪", name: "ベテラン" },
  { tier: 6, emoji: "🎖️", name: "熟練" },
  { tier: 7, emoji: "🏆", name: "達人" },
  { tier: 8, emoji: "👑", name: "名人" },
  { tier: 9, emoji: "💎", name: "レジェンド" },
  { tier: 10, emoji: "🏛️", name: "殿堂入り" },
];

// ティアに対応する称号。0(称号なし)や未知の値は null。
export function designationForTier(tier: number): DesignationTierInfo | null {
  return DESIGNATION_TIERS.find((d) => d.tier === tier) ?? null;
}
