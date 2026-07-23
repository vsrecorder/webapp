import type { RecordType } from "@app/types/record";
import type { DeckCodeType } from "@app/types/deck_code";
import type { DeckUsageItemType } from "@app/types/deck_usage_stat";

export type KizunaTier = {
  min: number;
  name: string;
  message: string;
  /*
   * ポケモンの背後にともる焚き火の灯。段階が上がるほど、大きく・濃く・暖かくなる。
   * 「出会ったばかり」だけは灯がともらない（空文字）。まだ火は熾っていない、
   * 灯は積み上げた先にともる、という設計。
   *
   * この glow は灯の「大きさとぼかし」だけを持つ（結果カード用のサイズ）。色は
   * glowGradient が持つ。Tailwind は静的な文字列しか拾えないため、クラス名は完全な形で
   * 持つこと。動的に組み立てる（`h-${n}`）とビルドから消える。
   */
  glow: string;
  /*
   * 灯のグラデーション（CSS の background 値）。段階が上がるほど、中心が白く熱くなり、
   * 外側へ薔薇色に広がる（機能の rose→amber の配色に合わせる）。50未満は灯らないので空文字。
   *
   * 単色ではなくグラデーションなのは、きずなLv.が上がったことを「明るさ」だけでなく
   * 「炎の色の変化」で伝えるため。Tailwind ではなくインラインの background で与える
   * （多段の rgba を持つ放射グラデーションはユーティリティクラスにできないため）。
   */
  glowGradient: string;
  /*
   * ポケモンのスプライトが上下にゆれる動き（globals.css の .kizuna-bob-*）。
   * 灯と同じく段階が上がるほど大きく・速くなる。「出会ったばかり」は動かない
   * （空文字）。まだ息が通っていない、という絵にするため。
   */
  bob: string;
};

// 段階名はポケモン本編の「なつき度」の表現に寄せている。
export const KIZUNA_TIERS: KizunaTier[] = [
  {
    min: 255,
    name: "最高の相棒",
    message: "もう、言葉はいらないようです。",
    glow: "h-32 w-48 blur-2xl",
    // 白熱の芯 → 金 → 薔薇色。いちばん熱い炎
    glowGradient:
      "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(253,224,71,0.66) 30%, rgba(251,113,133,0.34) 60%, transparent 82%)",
    bob: "kizuna-bob kizuna-bob-5",
  },
  {
    min: 200,
    name: "かけがえのない",
    message: "このデッキは、あなたの一部になっています。",
    glow: "h-28 w-44 blur-2xl",
    // 明るい金の芯 → 橙 → 薔薇色（はっきり）
    glowGradient:
      "radial-gradient(circle, rgba(254,240,138,0.74) 0%, rgba(251,146,60,0.44) 38%, rgba(244,63,94,0.24) 64%, transparent 80%)",
    bob: "kizuna-bob kizuna-bob-4",
  },
  {
    min: 150,
    name: "深く信頼している",
    message: "苦しいときに、まず手が伸びる一組です。",
    glow: "h-28 w-40 blur-2xl",
    // 金の芯 → 橙、薔薇色が入り始める
    glowGradient:
      "radial-gradient(circle, rgba(253,224,71,0.64) 0%, rgba(249,115,22,0.32) 42%, rgba(244,63,94,0.16) 66%, transparent 78%)",
    bob: "kizuna-bob kizuna-bob-3",
  },
  {
    min: 100,
    name: "心を許している",
    message: "勝ち負けの外側で、もう繋がっています。",
    glow: "h-24 w-36 blur-2xl",
    // 琥珀の芯 → 橙。まだ薔薇色は入らない
    glowGradient:
      "radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(249,115,22,0.26) 46%, transparent 74%)",
    bob: "kizuna-bob kizuna-bob-2",
  },
  {
    min: 50,
    name: "打ち解けてきた",
    message: "少しずつ、手に馴染んできたところ。",
    glow: "h-24 w-32 blur-2xl",
    // 灯り始めの琥珀。まだ淡く、橙の気配だけ
    glowGradient:
      "radial-gradient(circle, rgba(245,158,11,0.46) 0%, rgba(234,88,12,0.14) 50%, transparent 72%)",
    bob: "kizuna-bob kizuna-bob-1",
  },
  {
    min: 0,
    name: "出会ったばかり",
    message: "きずなLv.は、ここから積み上がっていきます。",
    glow: "",
    glowGradient: "",
    bob: "",
  },
];

export function kizunaTierOf(score: number): KizunaTier {
  return (
    KIZUNA_TIERS.find((t) => score >= t.min) ?? KIZUNA_TIERS[KIZUNA_TIERS.length - 1]
  );
}

// その段階で灯がともるか。「出会ったばかり」だけは灯らない（glow が空文字）。
// 灯を描くすべての箇所で、この判定を共通の入口にする。
export function kizunaHasGlow(score: number): boolean {
  return kizunaTierOf(score).glow !== "";
}

// ── 実データからのきずなLv.算出 ────────────────────────────────
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

/*
 * 指標の表示名。
 *
 * バックエンド（core-apiserver）はキー（"loyalty" 等）だけを返す。
 * 表示名は画面の文言なので webapp が持つ、という分担にしている。
 * この対応表が、その文言の正となる。
 */
export const KIZUNA_METRIC_LABELS: Record<MetricKey, string> = {
  loyalty: "逆境ロイヤルティ",
  devotion: "一途度",
  care: "手入れ度",
  days: "同行日数",
  trust: "託し度",
  narrative: "語り度",
};

// バックエンドが返すキーは文字列なので、既知の指標かどうかを確かめてから表示する
export function kizunaMetricLabel(key: string): string {
  return KIZUNA_METRIC_LABELS[key as MetricKey] ?? key;
}

export type KizunaMetric = {
  key: MetricKey;
  label: string;
  // 全体に占める重み（%）。レーダーや説明用で、画面に数字としては出さない。
  weight: number;
  // 0〜1 に正規化した値（レーダーチャートの軸に使う）
  value: number;
  /*
   * この指標で獲得した点と、その満点。6指標の points の合計が、そのままきずなLv.になる。
   *
   * 内訳カードに「95 / 20%」（達成度95% と 重み20%）と並べていたが、意味の違う％が
   * 2つ並んで読めなかった。「59 / 62」（この指標で59点、満点62点）なら、足し算で
   * きずなLv.になることが読み手に伝わる。
   */
  points: number;
  maxPoints: number;
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

// 「出会ったばかり」を抜け出すのに必要な最低対戦数。これ未満のデッキは、
// 対戦数に依らない指標（同行日数・手入れ度など）だけで高く出ても出会ったばかりに留める。
const KIZUNA_MIN_MATCHES_TO_ESCAPE = 9;
// 「出会ったばかり」の上限（KIZUNA_TIERS の 50 から次段に対応）。
const KIZUNA_MEETING_LEVEL_MAX = 49;

/*
 * 各指標の points を、合計が target になるよう按分し直す（最大剰余法）。
 * floor で配ったうえで余りを小数部の大きい順（同点はキー昇順）に1点ずつ配る。
 * 合計はちょうど target になり、Go 実装（entity/kizuna.go の apportionKizunaPoints）と
 * ビット単位で一致する。value も points/maxPoints に合わせ、内訳のバーと数値をずらさない。
 */
function apportionKizunaPoints(metrics: KizunaMetric[], target: number): number {
  const total = metrics.reduce((sum, m) => sum + m.points, 0);
  if (total <= target) return total;

  const fracs = metrics.map((m, idx) => {
    const exact = (m.points * target) / total;
    const floor = Math.floor(exact);
    m.points = floor;
    return { idx, frac: exact - floor };
  });

  const assigned = metrics.reduce((sum, m) => sum + m.points, 0);
  fracs.sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : a.idx - b.idx));
  for (let k = 0; k < target - assigned; k++) {
    metrics[fracs[k].idx].points++;
  }

  for (const m of metrics) {
    if (m.maxPoints > 0) m.value = m.points / m.maxPoints;
  }

  return target;
}

// 大会に向けた調整とみなす時間帯：開催日の3日前から、当日の昼まで
const EVE_WINDOW_MS = 72 * 60 * 60 * 1000;
const EVENT_DAY_WINDOW_MS = 12 * 60 * 60 * 1000;

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

// 託し度の積み上げは、この段（ジムバトル）を超えた分だけを数える。
const TRUST_BASELINE_STAGE = OFFICIAL_STAGES[4].score;
// 超えた分の合計がこれに達すると、積み上げの項は満点になる（シティリーグ7回ぶん相当）。
const TRUST_SERIOUS_SATURATION = 4;

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
  // 自分の全デッキの戦績（一途度と、逆境ロイヤルティの基準になる「他デッキの勝率」に使う）
  allUsages: DeckUsageItemType[];
};

export function estimateKizuna({
  records,
  deckCodes,
  officialEventTypes,
  usage,
  allUsages,
}: KizunaEstimateInput): KizunaEstimate {
  const recordCount = records.length;

  // ── 同行日数：実際に会場へ連れて行った日数（棚に置いていた期間は数えない）
  // event_date は JST オフセット付きのISO文字列。Date に通すと端末のタイムゾーンで
  // 日付がずれる（海外在住のユーザーで前日に寄る）ため、日付の文字列のまま数える。
  const eventDays = new Set(records.map((r) => r.data.event_date.slice(0, 10)));
  const daysValue = logScale(eventDays.size, 30);

  // ── 託し度：どの格の舞台に連れて行ったか
  //
  // 「いちばん大きな舞台に持ち込んだか」（最高到達点）を主に、
  // 「大きな舞台に何度立ったか」（積み上げ）を従に見る。
  //
  // 従を「平均」にしてはいけない。平均は記録が増えるほど下がるため、
  //   ・ジムバトルの記録を足すたびに託し度が下がる（シティ1回だけ 85% → ジム20回を足すと 64%）
  //   ・シティ1回だけの人(85%)が、シティ3回＋ジム27回の人(65%)を上回る
  //   ・同じ舞台なら回数が効かない（シティ1回も10回も 85%）
  // という3つの倒錯が起きていた。
  //
  // 積み上げは「ジムバトルを超えた分」だけを数える。日常のジムバトルは託したとは言わない
  // （回数そのものは同行日数・逆境ロイヤルティが見ている）。これで、記録を足して値が
  // 下がることは無くなり、大舞台に通うほど伸びる。
  const stages = records.map((r) => stageOf(r, officialEventTypes));
  const topStage = stages.reduce<KizunaStage | null>(
    (top, s) => (top === null || s.score > top.score ? s : top),
    null,
  );
  const seriousSum = stages.reduce(
    (sum, s) => sum + Math.max(0, s.score - TRUST_BASELINE_STAGE),
    0,
  );
  const trustValue = clamp01(
    0.6 * (topStage?.score ?? 0) + 0.4 * logScale(seriousSum, TRUST_SERIOUS_SATURATION),
  );

  // ── 語り度：memo を書き残したか（記入率 × 熱量）
  const memos = records.map((r) => r.data.memo?.trim() ?? "").filter((m) => m.length > 0);
  const memoRate = recordCount > 0 ? memos.length / recordCount : 0;
  const memoAvgLength =
    memos.length > 0 ? memos.reduce((a, m) => a + m.length, 0) / memos.length : 0;
  const narrativeValue = memoRate * logScale(memoAvgLength, 120);

  // ── 手入れ度：組み直した回数と、その時刻（大会前夜の調整を重く見る）
  //
  // デッキコードは登録時に必ず1件できる。それを「組み直し」に数えると、
  // 一度も触っていないデッキにも点が入る（旧実装は19%が付いていた）。1を引く。
  const codeCount = deckCodes.length;
  const rebuildCount = Math.max(0, codeCount - 1);

  const eventTimes = records.map((r) => new Date(r.data.event_date).getTime());
  const eveCount = deckCodes.filter((code) => {
    const codeTime = new Date(code.created_at).getTime();
    // event_date は日付（その日の0時）なので、前夜だけを見ると当日朝の調整を取り逃がす。
    // 「大会の3日前〜当日の昼まで」を、大会に向けた調整とみなす。
    return eventTimes.some(
      (t) => codeTime >= t - EVE_WINDOW_MS && codeTime <= t + EVENT_DAY_WINDOW_MS,
    );
  }).length;
  const eveRate = codeCount > 0 ? eveCount / codeCount : 0;
  // 組み直しの回数を土台に、大会前の調整があれば上乗せする
  const careValue = clamp01(logScale(rebuildCount, 8) * (0.6 + 0.4 * eveRate));

  // ── 一途度：他に選べたのに、それでも選んだか
  //
  // 旧実装 share × (1 + log2(1 + 他デッキ数)) は二重に壊れていた。
  //   ・デッキが1つしかない人が share=1.0 で満点になる（選べる相手がいないのに「選んだ」ことになる）
  //   ・デッキを8個持つ人は share 25% で満点になる（散らして使うほど倍率が上がり、一途の逆になる）
  //
  // 見るべきは「均等に使ったらこうなるはず」（= 1 / 使ったデッキ数）からの寄せ方。
  // 同じ share でも、選択肢が多いほど価値が上がる（企画書の「1個持ちの100%より、
  // 10個持ちの70%のほうが深い」がそのまま成立する）。
  const usedDecks = allUsages.filter((u) => u.count > 0);
  const usedDeckCount = usedDecks.length;
  const totalUsed = usedDecks.reduce((sum, u) => sum + u.count, 0);
  const share = usage && totalUsed > 0 ? usage.count / totalUsed : 0;
  // 均等に使った場合の取り分
  const evenShare = usedDeckCount > 0 ? 1 / usedDeckCount : 1;

  // デッキが1つだけの人には比較対象がない。0にするのは酷だが、満点にもしない。
  const SOLO_DECK_DEVOTION = 0.5;
  const devotionValue =
    !usage || usage.count === 0
      ? 0
      : usedDeckCount <= 1
        ? SOLO_DECK_DEVOTION
        : clamp01((share - evenShare) / (1 - evenShare));

  // ── 逆境ロイヤルティ：勝てなくても使い続けたか（この指標だけは勝率が低いほど上がる）
  //
  // 継続の飽和点は12戦では早すぎた（週1のジムバトルなら3か月で頭打ち）。40戦まで伸ばす。
  const persistence = usage ? logScale(usage.count, 40) : 0;

  // 逆境の基準は「ほかのデッキでの勝率」。
  // 本人の全体勝率を基準にすると、そのデッキを主に使っている人ほど基準が自分自身に
  // 引きずられ、1デッキしか使っていない人は勝率が何%であろうと deficit が 0 になる
  // （＝いちばん一途な人ほど逆境を検知できない、という本末転倒が起きていた）。
  const deckWinRate = usage?.win_rate ?? 0;
  const otherDecks = allUsages.filter((u) => u.deck_id !== usage?.deck_id && u.count > 0);
  const otherCount = otherDecks.reduce((sum, u) => sum + u.count, 0);
  const otherWinRate =
    otherCount > 0
      ? otherDecks.reduce((sum, u) => sum + u.win_rate * u.count, 0) / otherCount
      : null;

  // ほかに使ったデッキがなければ、五分（50%）を基準にする
  const baselineWinRate = otherWinRate ?? 0.5;
  // 基準をどれだけ下回っているか（-20pt で最大）
  const deficit = clamp01((baselineWinRate - deckWinRate) / 0.2);
  const loyaltyValue = persistence * (0.5 + 0.5 * deficit);

  // detail は内訳カードで必ず1行に収める。カードの幅は狭いので、
  // 文章ではなく「数字＋一語」で言い切ること（長いと省略されて読めなくなる）。
  const draft: Omit<KizunaMetric, "points" | "maxPoints">[] = [
    {
      key: "loyalty",
      label: KIZUNA_METRIC_LABELS.loyalty,
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
      label: KIZUNA_METRIC_LABELS.devotion,
      weight: WEIGHTS.devotion,
      value: devotionValue,
      detail:
        usedDeckCount > 1
          ? `他${usedDeckCount - 1}個ある中で${Math.round(share * 100)}%`
          : "ほかに使ったデッキがない",
    },
    {
      key: "care",
      label: KIZUNA_METRIC_LABELS.care,
      weight: WEIGHTS.care,
      value: careValue,
      detail:
        rebuildCount === 0
          ? "組み直していない"
          : eveCount > 0
            ? `${rebuildCount}回組み直し・大会前${eveCount}回`
            : `${rebuildCount}回組み直した`,
    },
    {
      key: "days",
      label: KIZUNA_METRIC_LABELS.days,
      weight: WEIGHTS.days,
      value: daysValue,
      detail: `${eventDays.size}日、会場へ同行`,
    },
    {
      key: "trust",
      label: KIZUNA_METRIC_LABELS.trust,
      weight: WEIGHTS.trust,
      value: trustValue,
      detail: topStage ? `最高の舞台は${topStage.name}` : "記録なし",
    },
    {
      key: "narrative",
      label: KIZUNA_METRIC_LABELS.narrative,
      weight: WEIGHTS.narrative,
      value: narrativeValue,
      detail: memos.length > 0 ? `メモ${memos.length}件` : "メモなし",
    },
  ];

  /*
   * 重みを255点に配り、指標ごとの満点にする（20:15:15:12:10:10 → 62:47:47:37:31:31、合計255）。
   * 獲得点は満点 × 達成度。きずなLv.は、その合計そのもの。
   * 「重み付き和を最後に255倍する」と結果は同じだが、内訳の足し算が合わなくなる
   * （表示のために丸めるため）。合計＝きずなLv.であることを、式の側で保証する。
   */
  const totalWeight = draft.reduce((sum, m) => sum + m.weight, 0);
  const metrics: KizunaMetric[] = draft.map((m) => {
    const maxPoints = Math.round((m.weight / totalWeight) * 255);
    return { ...m, maxPoints, points: Math.round(m.value * maxPoints) };
  });

  let score = metrics.reduce((sum, m) => sum + m.points, 0);

  // 9戦に満たないデッキは「出会ったばかり」に留める。
  // 内訳の「合計＝きずなLv.」を保つため、各指標の点も 49 に按分し直す。
  const matchCount = usage?.count ?? 0;
  if (matchCount < KIZUNA_MIN_MATCHES_TO_ESCAPE && score > KIZUNA_MEETING_LEVEL_MAX) {
    score = apportionKizunaPoints(metrics, KIZUNA_MEETING_LEVEL_MAX);
  }

  return { score, metrics, recordCount };
}
