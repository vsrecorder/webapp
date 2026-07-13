import type { RecordType } from "@app/types/record";
import type { DeckCodeType } from "@app/types/deck_code";
import type { DeckUsageItemType } from "@app/types/deck_usage_stat";

export type KizunaTier = {
  min: number;
  name: string;
  message: string;
  /*
   * 結果カードでポケモンの背後にともる焚き火の灯。段階が上がるほど、
   * 大きく・濃く・暖かくなる。「出会ったばかり」だけは暖色にならず、
   * 冷たい微光にとどまる（灯は積み上げた先にともる、という設計）。
   *
   * Tailwind は静的な文字列しか拾えないため、クラス名は完全な形で持つこと。
   * 動的に組み立てる（`bg-amber-500/${n}`）とビルドから消える。
   */
  glow: string;
};

// 段階名はポケモン本編の「なつき度」の表現に寄せている。
export const KIZUNA_TIERS: KizunaTier[] = [
  {
    min: 255,
    name: "相棒",
    message: "もう、言葉はいらないようです。",
    glow: "h-32 w-48 bg-amber-200/85 blur-2xl",
  },
  {
    min: 200,
    name: "かけがえのない",
    message: "このポケモンは、あなたの一部になっています。",
    glow: "h-28 w-44 bg-amber-300/70 blur-2xl",
  },
  {
    min: 150,
    name: "深く信頼している",
    message: "苦しいときに、まず手が伸びる一組です。",
    glow: "h-28 w-40 bg-amber-400/55 blur-2xl",
  },
  {
    min: 100,
    name: "心を許している",
    message: "勝ち負けの外側で、もう繋がっています。",
    glow: "h-24 w-36 bg-amber-500/45 blur-2xl",
  },
  {
    min: 50,
    name: "打ち解けてきた",
    message: "少しずつ、手に馴染んできたところ。",
    glow: "h-24 w-32 bg-amber-500/30 blur-2xl",
  },
  {
    min: 0,
    name: "出会ったばかり",
    message: "きずなレベルは、ここから積み上がっていきます。",
    glow: "h-20 w-28 bg-slate-300/20 blur-2xl",
  },
];

export function kizunaTierOf(score: number): KizunaTier {
  return (
    KIZUNA_TIERS.find((t) => score >= t.min) ?? KIZUNA_TIERS[KIZUNA_TIERS.length - 1]
  );
}

// ── 実データからのきずなレベル算出 ────────────────────────────────
//
// KIZUNA_PLAN.md の16指標のうち、既存APIだけで算出できる6指標を使う。
// バックエンドを変更せず「入力を一切求めずに」試算するための簡易版であり、
// 本実装（バッチ集計）では残りの指標も加わる。
//
// 重みは企画書の配分をそのまま使い、算出できる6指標の合計（82%）で正規化する。
// 勝率は加点しない。逆境ロイヤルティに至っては、勝率が低いほど値が上がる。

const WEIGHTS = {
  loyalty: 20, // 逆境ロイヤルティ
  devotion: 15, // 一途度
  care: 15, // 手入れ度
  days: 12, // 同行日数
  trust: 10, // 託し度
  narrative: 10, // 語り度
} as const;

type MetricKey = keyof typeof WEIGHTS;

export type KizunaMetric = {
  key: MetricKey;
  label: string;
  weight: number;
  // 0〜1 に正規化した値
  value: number;
  // 何を根拠にその値になったかを一言で示す（算出の透明性のため画面に出す）
  detail: string;
};

export type KizunaEstimate = {
  score: number;
  metrics: KizunaMetric[];
  recordCount: number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// 対数で伸びを鈍らせた 0〜1 の値。saturation に達すると 1 になる。
const logScale = (value: number, saturation: number) =>
  clamp01(Math.log(1 + Math.max(0, value)) / Math.log(1 + saturation));

// 大会前夜の調整とみなす時間差（72時間以内）
const EVE_WINDOW_MS = 72 * 60 * 60 * 1000;

/*
 * 託し度で使う「舞台の格」。
 *
 * 公式イベントかどうかだけを見てはいけない。ジムバトルは毎週どこかの店でやっている
 * 公式イベントであり、それを最上位に置くと「ジムバトルにしか出ない人」が満点になる。
 * 企画書の「ジムバトル100回より、シティリーグの3回のほうが託した」を成立させるため、
 * official_events.type_id で段を分ける。
 *
 * type_id の対応は RecordCreate.tsx のアイコン出し分けと同じ。
 *   1: チャンピオンズリーグ / JCS などの大型大会
 *   2: シティリーグ
 *   3: トレーナーズリーグ
 *   4: ジムバトル（週次のショップイベント）
 *   6: 公認自主イベント
 *   7: ポケモンカード教室などの体験系
 */
type KizunaStage = { name: string; score: number };

const OFFICIAL_STAGES: Record<number, KizunaStage> = {
  1: { name: "大型大会", score: 1.0 },
  2: { name: "シティリーグ", score: 0.85 },
  3: { name: "トレーナーズリーグ", score: 0.55 },
  4: { name: "ジムバトル", score: 0.3 },
  6: { name: "公認自主イベント", score: 0.4 },
  7: { name: "教室・体験会", score: 0.2 },
};

// 種別を引けなかった公式イベントは、最も数の多いジムバトル相当として控えめに見る
const UNKNOWN_OFFICIAL_STAGE: KizunaStage = { name: "公式イベント", score: 0.3 };
const TONAMEL_STAGE: KizunaStage = { name: "Tonamelの大会", score: 0.4 };
const UNOFFICIAL_STAGE: KizunaStage = { name: "自主大会", score: 0.35 };
const FREEFORM_STAGE: KizunaStage = { name: "自由形式の対戦", score: 0.15 };

// 0.15〜1.0 の幅で、公式イベントの中でも段が付く。
// 「公式かどうか」の二値だと、ジムバトルしか出ない人が満点になってしまう。

function stageOf(
  record: RecordType,
  officialEventTypes: Map<number, number>,
): KizunaStage {
  const officialEventId = record.data.official_event_id;

  if (officialEventId) {
    const typeId = officialEventTypes.get(officialEventId);
    return (typeId ? OFFICIAL_STAGES[typeId] : undefined) ?? UNKNOWN_OFFICIAL_STAGE;
  }
  if (record.data.tonamel_event_id) return TONAMEL_STAGE;
  if (record.data.unofficial_event_id) return UNOFFICIAL_STAGE;

  return FREEFORM_STAGE;
}

export type KizunaEstimateInput = {
  records: RecordType[];
  deckCodes: DeckCodeType[];
  // official_event_id → type_id。引けなかったイベントは載せなくてよい（控えめに扱う）。
  officialEventTypes: Map<number, number>;
  // このデッキの全期間の戦績。対戦記録が無いデッキは undefined になる。
  usage: DeckUsageItemType | undefined;
  // 自分の全デッキの戦績（一途度の算出に使う）
  allUsages: DeckUsageItemType[];
  // 自分の全体勝率（逆境ロイヤルティの基準）
  userWinRate: number;
};

export function estimateKizuna({
  records,
  deckCodes,
  officialEventTypes,
  usage,
  allUsages,
  userWinRate,
}: KizunaEstimateInput): KizunaEstimate {
  const recordCount = records.length;

  // ── 同行日数：実際に会場へ連れて行った日数（棚に置いていた期間は数えない）
  const eventDays = new Set(
    records.map((r) => new Date(r.data.event_date).toDateString()),
  );
  const daysValue = logScale(eventDays.size, 30);

  // ── 託し度：どの格の舞台に連れて行ったか
  //
  // 「いちばん大きな舞台に持ち込んだか」（最高到達点）を主に見て、
  // 「普段どの舞台にいるか」（平均）を従に見る。片方だけでは歪む：
  //   最高到達点だけ → シティに1回出ただけで満点になる
  //   平均だけ       → 週次のジムバトルを100回こなした人が、シティ経験者を上回る
  const stages = records.map((r) => stageOf(r, officialEventTypes));
  const topStage = stages.reduce<KizunaStage | null>(
    (top, s) => (top === null || s.score > top.score ? s : top),
    null,
  );
  const stageMean =
    stages.length > 0 ? stages.reduce((a, s) => a + s.score, 0) / stages.length : 0;
  const trustValue = clamp01(0.6 * (topStage?.score ?? 0) + 0.4 * stageMean);

  // ── 語り度：memo を書き残したか（記入率 × 熱量）
  const memos = records.map((r) => r.data.memo?.trim() ?? "").filter((m) => m.length > 0);
  const memoRate = recordCount > 0 ? memos.length / recordCount : 0;
  const memoAvgLength =
    memos.length > 0 ? memos.reduce((a, m) => a + m.length, 0) / memos.length : 0;
  const narrativeValue = memoRate * logScale(memoAvgLength, 120);

  // ── 手入れ度：組み直した回数と、その時刻（大会前夜の調整を重く見る）
  const codeCount = deckCodes.length;
  const eventTimes = records.map((r) => new Date(r.data.event_date).getTime());
  const eveCount = deckCodes.filter((code) => {
    const codeTime = new Date(code.created_at).getTime();
    return eventTimes.some((t) => codeTime <= t && t - codeTime <= EVE_WINDOW_MS);
  }).length;
  const eveRate = codeCount > 0 ? eveCount / codeCount : 0;
  // 組み直しの回数を土台に、大会前夜の調整があれば上乗せする
  const careValue = clamp01(logScale(codeCount, 8) * (0.6 + 0.4 * eveRate));

  // ── 一途度：他に選べたのに、それでも選んだか
  const totalUsed = allUsages.reduce((sum, u) => sum + u.count, 0);
  const share = usage && totalUsed > 0 ? usage.count / totalUsed : 0;
  const altDeckCount = allUsages.filter((u) => u.deck_id !== usage?.deck_id).length;
  const devotionValue = clamp01(share * (1 + Math.log2(1 + altDeckCount)));

  // ── 逆境ロイヤルティ：勝てなくても使い続けたか（この指標だけは勝率が低いほど上がる）
  const deckWinRate = usage?.win_rate ?? 0;
  const persistence = usage ? clamp01(usage.count / 12) : 0;
  // 本人の全体勝率をどれだけ下回っているか（-20pt で最大）
  const deficit = clamp01((userWinRate - deckWinRate) / 0.2);
  const loyaltyValue = persistence * (0.5 + 0.5 * deficit);

  // detail は内訳カードで必ず1行に収める。カードの幅は狭いので、
  // 文章ではなく「数字＋一語」で言い切ること（長いと省略されて読めなくなる）。
  const metrics: KizunaMetric[] = [
    {
      key: "loyalty",
      label: "逆境ロイヤルティ",
      weight: WEIGHTS.loyalty,
      value: loyaltyValue,
      detail: usage
        ? deficit > 0
          ? `負けても${usage.count}回握った`
          : `${usage.count}回使い続けている`
        : "記録なし",
    },
    {
      key: "devotion",
      label: "一途度",
      weight: WEIGHTS.devotion,
      value: devotionValue,
      detail:
        altDeckCount > 0
          ? `他${altDeckCount}個ある中で${Math.round(share * 100)}%`
          : `記録の${Math.round(share * 100)}%`,
    },
    {
      key: "care",
      label: "手入れ度",
      weight: WEIGHTS.care,
      value: careValue,
      detail:
        eveCount > 0
          ? `${codeCount}回組み直し・前夜${eveCount}回`
          : `${codeCount}回組み直した`,
    },
    {
      key: "days",
      label: "同行日数",
      weight: WEIGHTS.days,
      value: daysValue,
      detail: `${eventDays.size}日、会場へ同行`,
    },
    {
      key: "trust",
      label: "託し度",
      weight: WEIGHTS.trust,
      value: trustValue,
      detail: topStage ? `最高の舞台は${topStage.name}` : "記録なし",
    },
    {
      key: "narrative",
      label: "語り度",
      weight: WEIGHTS.narrative,
      value: narrativeValue,
      detail: memos.length > 0 ? `メモ${memos.length}件` : "メモなし",
    },
  ];

  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  const weighted = metrics.reduce((sum, m) => sum + m.weight * m.value, 0);
  const score = Math.round((weighted / totalWeight) * 255);

  return { score, metrics, recordCount };
}
