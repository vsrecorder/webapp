"use client";

// KizunaMetric（推定ロジック側の詳細情報つきの型）を要求すると、weight/points/detail
// を持たない呼び出し元（デッキ詳細ページのAPI由来データなど）が渡せなくなる。
// この図は key/label/value しか使わないため、必要最小限の型だけを要求する。
type RadarMetric = {
  key: string;
  label: string;
  // 0〜1 に正規化した達成度
  value: number;
};

/*
 * 配色。
 * "onDark"（既定）は、地色が常に暗いカードの中に置く前提（きずな試算の内訳カード＝
 * シェア画像）。端末がライトモードでも色を変えてはいけないため、テーマに追従させない。
 * "adaptive" は画面のテーマに追従する（デッキ詳細ページのきずなパネル）。
 */
type Tone = "onDark" | "adaptive";

// 線と文字は currentColor で塗り、色は text-* クラスで与える（ライト/ダークの
// 出し分けが dark: バリアントだけで済み、書き出し時も computed style で拾われる）。
const TONE_CLASS: Record<Tone, { grid: string; label: string; value: string }> = {
  onDark: {
    grid: "text-white/10",
    label: "text-white/70",
    value: "text-amber-400/90",
  },
  adaptive: {
    grid: "text-black/10 dark:text-white/10",
    label: "text-black/70 dark:text-white/70",
    value: "text-amber-600 dark:text-amber-400/90",
  },
};

type Props = {
  metrics: RadarMetric[];
  tone?: Tone;
};

// ── 図形の定数 ────────────────────────────────────────────────
// viewBox は軸ラベル（最長「逆境ロイヤルティ」）が収まる幅を確保している。
const VIEW_W = 300;
// 下端の軸（同行日数）はラベルの下に数値がもう1行入るため、その分の余白を含む。
const VIEW_H = 210;
const CX = VIEW_W / 2;
const CY = 96;
const RADIUS = 66;
// 目盛りリング（25 / 50 / 75 / 100%）
const RINGS = [0.25, 0.5, 0.75, 1];
// 多角形がつぶれて線に見えないよう、頂点に持たせる最小の半径比。
// これを下回る値は「実質0」として扱う。
const MIN_RATIO = 0.02;
// 軸ラベルのベースラインから、その下に添える数値のベースラインまでの距離。
const LABEL_VALUE_GAP = 11;

// i番目の軸の座標。頂点を真上から時計回りに配置する。
function axisPoint(index: number, total: number, ratio: number) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  return {
    x: CX + Math.cos(angle) * RADIUS * ratio,
    y: CY + Math.sin(angle) * RADIUS * ratio,
  };
}

// 軸ラベルの位置と揃え方。左右の軸は外側へ逃がす。
function labelAnchor(index: number, total: number) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  const x = CX + Math.cos(angle) * (RADIUS + 16);
  const y = CY + Math.sin(angle) * (RADIUS + 16);
  const cos = Math.cos(angle);

  return {
    x,
    // 上下の軸はラベルが図形に被らないよう、縦方向に少しずらす
    y: y + (Math.abs(cos) < 0.1 ? (y < CY ? -4 : 12) : 4),
    anchor: Math.abs(cos) < 0.1 ? "middle" : cos > 0 ? "start" : "end",
  } as const;
}

/*
 * きずなLv.の内訳をあらわす六角形のレーダー。
 *
 * canvas（chart.js）ではなく、素の SVG で描くこと。
 * captureThemedPng は cloneNode で DOM の静的スナップショットを取るため、
 * <canvas> をクローンしても描画内容（ビットマップ）は複製されず、シェア画像では
 * 真っ白になる。SVG はDOMそのものなのでクローンしても欠けない。
 *
 * 単一系列のため凡例は置かない。頂点にドットは打たず、面の「かたち」で読ませる。
 *
 * 軸ラベルの下に出す数値は達成度（％）であり、獲得点ではない。
 * 半径が表しているのは達成度そのもので、獲得点は指標ごとに満点が違う
 * （62/47/47/37/31/31）。獲得点を軸に添えると「31点の軸が外周まで届き、
 * 40点の軸は届かない」という矛盾した読み方になる。点数は一覧側で読ませる。
 */
export default function KizunaRadarChart({ metrics, tone = "onDark" }: Props) {
  const total = metrics.length;
  const color = TONE_CLASS[tone];

  // 全指標が実質0（きずなLv.が0）なら、値の図形そのものを描かない。
  // クランプで中心に残る極小の多角形は、値ではなく描画の都合でしかない。
  const isEmpty = metrics.every((m) => m.value < MIN_RATIO);

  const valuePoints = metrics
    .map((m, i) => {
      const p = axisPoint(i, total, Math.max(MIN_RATIO, m.value));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full"
      role="img"
      aria-label={`きずなLv.の内訳: ${metrics
        .map((m) => `${m.label} ${Math.round(m.value * 100)}%`)
        .join("、")}`}
    >
      <defs>
        <linearGradient id="kizuna-radar-fill" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="kizuna-radar-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* 目盛りリング（控えめに） */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={metrics
            .map((_, i) => {
              const p = axisPoint(i, total, ring);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className={color.grid}
        />
      ))}

      {/* 軸（スポーク） */}
      {metrics.map((m, i) => {
        const p = axisPoint(i, total, 1);
        return (
          <line
            key={m.key}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeWidth="1"
            className={color.grid}
          />
        );
      })}

      {/* 値の多角形。きずなLv.が0のときは目盛りだけの空の図にする */}
      {!isEmpty && (
        <polygon
          points={valuePoints}
          fill="url(#kizuna-radar-fill)"
          stroke="url(#kizuna-radar-stroke)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {/* 軸ラベルと、その下に達成度（％） */}
      {metrics.map((m, i) => {
        const l = labelAnchor(i, total);
        return (
          <g key={m.key}>
            <text
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              fontSize="10"
              fontWeight="700"
              fill="currentColor"
              className={color.label}
            >
              {m.label}
            </text>
            {/* ラベルとの主従が崩れないよう、数値は一段小さく灯の色で添える */}
            <text
              x={l.x}
              y={l.y + LABEL_VALUE_GAP}
              textAnchor={l.anchor}
              fontSize="9"
              fontWeight="700"
              fill="currentColor"
              className={color.value}
            >
              {Math.round(m.value * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
