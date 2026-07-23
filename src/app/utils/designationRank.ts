export type RankInfo = {
  name: string;
  image: string;
};

// 称号のティアをまとめた「ランク」。称号とは別の永続データを持たず、
// 現在の称号ティアから都度導出する(ランク単体で判定条件を増やす予定はないため)。
// 配列の並び順=昇格順(モンスターボール級が最下位、マスターボール級が最上位)。
export const RANKS: { minTier: number; maxTier: number; info: RankInfo }[] = [
  {
    minTier: 1,
    maxTier: 2,
    info: { name: "モンスターボール級", image: "https://xx8nnpgt.user.webaccel.jp/images/icons/poke-ball.png" },
  },
  {
    minTier: 3,
    maxTier: 4,
    info: { name: "スーパーボール級", image: "https://xx8nnpgt.user.webaccel.jp/images/icons/great-ball.png" },
  },
  {
    minTier: 5,
    maxTier: 6,
    info: { name: "ハイパーボール級", image: "https://xx8nnpgt.user.webaccel.jp/images/icons/ultra-ball.png" },
  },
  {
    minTier: 7,
    maxTier: 8,
    info: { name: "マスターボール級", image: "https://xx8nnpgt.user.webaccel.jp/images/icons/master-ball.png" },
  },
  {
    minTier: 9,
    maxTier: 10,
    info: { name: "ウルトラボール級", image: "https://xx8nnpgt.user.webaccel.jp/images/icons/beast-ball.png" },
  },
];

export function rankForTier(tier: number): RankInfo | null {
  return RANKS.find((r) => tier >= r.minTier && tier <= r.maxTier)?.info ?? null;
}

// ランク名(例: "モンスターボール級")から対応するランク情報を引く。
// 通知本文に埋め込まれたランク名から画像を逆引きする用途などで使う。
export function rankInfoForName(name: string): RankInfo | null {
  return RANKS.find((r) => r.info.name === name)?.info ?? null;
}

// 称号未到達の場合に表示する画像
export const NO_RANK_IMAGE = "https://xx8nnpgt.user.webaccel.jp/images/icons/premier-ball.png";
