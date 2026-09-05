"use client";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import {
  BADGE_GAP,
  BADGE_PERCENT_FONT_SIZE,
  BADGE_PERCENT_GAP,
  BADGE_SPRITE_SIZE,
  badgeHeight,
  badgeWidth,
  fitBadgeSpriteSize,
  resolveBadgeCollisions,
  type BadgeAngleItem,
} from "@app/utils/pieBadgeLayout";

/*
 * シェア画像用の円グラフ（SVG + DOM）。
 *
 * 画面の円グラフは chart.js の <canvas> で描いているが、書き出し(captureThemedPng)は
 * cloneNode で DOM の静的スナップショットを取るため、<canvas> を複製しても描画内容
 * （ビットマップ）は複製されず真っ白になる。さらにこの canvas には外部CDNのスプライトを
 * 描き込んでいるため、toDataURL でビットマップを吸い出すこともできない（汚染されるため）。
 *
 * そこでシェア画像では、同じ見た目を SVG（スライス）と DOM（外周のスプライトバッジ）で
 * 描き直す。SVG・DOM はそのものが複製されるので、書き出し画像で欠けない。
 * （canvas を使わない理由は KizunaRadarChart のコメントも参照）
 *
 * 寸法・配色・バッジの配置ルールは画面の円グラフ（pieSlicesSpritePlugin）に合わせてあり、
 * 画面で見ているパネルとほぼ同じ見た目の画像になる。
 */

export type SharePieSlice = {
  // スライスの大きさを決める値（件数）
  value: number;
  // 凡例の色ドット・バッジの縁に使う濃色
  color: string;
  // 円の塗りに使う薄色
  softColor: string;
  // 外周バッジに並べるスプライト（最大2体。空配列ならバッジを描かない）
  spriteIds: (string | undefined)[];
  // バッジ内、スプライトの下に表示する割合（例: "23%"）。null なら表示しない
  percentText: string | null;
};

type Props = {
  slices: SharePieSlice[];
  // 円グラフを収めるコンテナの幅(px)。この幅に外周バッジまで収まるよう円の大きさを決める
  width: number;
};

// 以下の定数は画面の円グラフ（DeckUsagePanel / OpponentDeckDistributionChart と
// pieSlicesSpritePlugin）と同じ値。ずらすとシェア画像だけ見た目が変わってしまう。
// バッジ自体の寸法は画面と共通の pieBadgeLayout から取る。
const CHART_SIZE = 192;
// 円が小さくなりすぎると凡例のスプライトより小さく見えるため下限を設ける
const MIN_CHART_SIZE = 120;
// スライス同士の境界線（画面の borderColor: "#ffffff" / borderWidth: 2 と同じ）
const SLICE_BORDER_COLOR = "#ffffff";
const SLICE_BORDER_WIDTH = 2;
/*
 * SVG の描画領域に持たせる余白。
 *
 * SVG の線はパスの線上を中心に引かれるため、円の外周では線の半分が円の外側へはみ出す。
 * viewBox を円の直径ぴったりにすると、このはみ出しがビューポートの外になって切り取られ、
 * 円が枠に接する4点（12時・3時・6時・9時）だけ輪郭が欠けて、上下左右が潰れて見える。
 * 線の半分ぶん余白を確保して、外周の境界線を最後まで描き切る。
 */
const SVG_PADDING = SLICE_BORDER_WIDTH / 2;

type BadgeItem = BadgeAngleItem & {
  key: number;
  spriteIds: (string | undefined)[];
  percentText: string | null;
  color: string;
  width: number;
};

// 座標は小数第2位までに丸める。
// Math.sin/cos の結果は環境によって最下位の桁が食い違うことがあり、丸めずに出すと
// サーバとブラウザで属性値が一致せずハイドレーションの警告になる（見た目には影響しない桁）。
function round(value: number): string {
  return value.toFixed(2);
}

// 中心(cx, cy)・半径 r の扇形パス。角度はラジアン（-PI/2 が真上、時計回り）。
function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  // 1件しかない場合は全円になる。扇形のパスでは閉じられないため2つの弧で描く
  if (end - start >= Math.PI * 2 - 1e-6) {
    return [
      `M ${cx - r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`,
      "Z",
    ].join(" ");
  }

  const x1 = round(cx + Math.cos(start) * r);
  const y1 = round(cy + Math.sin(start) * r);
  const x2 = round(cx + Math.cos(end) * r);
  const y2 = round(cy + Math.sin(end) * r);
  const largeArc = end - start > Math.PI ? 1 : 0;

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function SharePieChart({ slices, width }: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;

  /*
   * 円の大きさは「外周バッジまで含めて幅に収まる」ことを条件に決める。
   *
   * 画面の円グラフは固定の余白(左右64px)を確保するだけで、カードが狭いときは
   * バッジが左右にはみ出す（canvas の縁で切れる）。画面では横に広いカードで見ることが
   * 多いため許容されているが、シェア画像は端末の画面幅そのままで書き出すので、
   * 切れたバッジがそのまま画像に残ってしまう。そこで最も外側に出るバッジ
   * （真横を向いたときの横幅）を基準に、切れない最大の円にする。
   */
  const badgeSpriteCounts = slices
    .filter((slice) => slice.spriteIds.length > 0)
    .map((slice) => slice.spriteIds.length);
  const maxSpriteCount = badgeSpriteCounts.length
    ? Math.max(...badgeSpriteCounts)
    : 0;
  const hasPercent = slices.some((slice) => slice.percentText !== null);

  // バッジが真横を向いたとき、中心から badgeWidth/2 だけさらに外へ張り出す
  const radiusFor = (spriteSize: number): number => {
    const badgeReach =
      maxSpriteCount > 0
        ? BADGE_GAP +
          badgeHeight(spriteSize, hasPercent) / 2 +
          badgeWidth(spriteSize, maxSpriteCount) / 2
        : 0;
    return Math.max(
      MIN_CHART_SIZE / 2,
      Math.min(CHART_SIZE / 2, Math.round(width) / 2 - badgeReach),
    );
  };

  /*
   * 円の大きさとバッジの大きさは互いに依存する（バッジが大きいほど円は小さくなる）。
   * まず標準サイズのバッジで半径を求め、その外周にバッジが並びきらない件数であれば
   * スプライトを縮めてから半径を求め直す。バッジが小さくなった分だけ円は大きくできるので、
   * 求め直した半径では外周にさらに余裕ができる（並びきらなくなることはない）。
   */
  const spriteSize = fitBadgeSpriteSize({
    count: badgeSpriteCounts.length,
    outerRadius: radiusFor(BADGE_SPRITE_SIZE),
    maxSpriteCount,
    hasPercent,
  });
  const radius = radiusFor(spriteSize);
  const badgeH = badgeHeight(spriteSize, hasPercent);
  const diameter = radius * 2;
  // SVG は円より境界線の半分ぶん大きく取り、その中心に円を置く
  const svgSize = diameter + SVG_PADDING * 2;
  const svgCenter = SVG_PADDING + radius;
  // 上下はバッジの高さ分だけ確保する（バッジは円の外周から badgeH だけ張り出す）
  const containerHeight =
    maxSpriteCount > 0 ? (radius + BADGE_GAP + badgeH) * 2 : svgSize;

  // 円の描画。chart.js の pie と同じく真上から時計回りに並べる
  const paths: { key: number; d: string; fill: string }[] = [];
  const badges: BadgeItem[] = [];
  let angle = -Math.PI / 2;

  slices.forEach((slice, index) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    paths.push({
      key: index,
      d: arcPath(svgCenter, svgCenter, radius, start, end),
      fill: slice.softColor,
    });

    // スプライトを持たないデッキ（「その他」など）はバッジを描かない
    if (slice.spriteIds.length === 0) return;

    // 高さは全バッジで揃える（円の大きさもこの高さを前提に決めている）。
    // 横幅はスプライトの数で変わる。
    const badgeW = badgeWidth(spriteSize, slice.spriteIds.length);
    const midAngle = (start + end) / 2;

    badges.push({
      key: index,
      spriteIds: slice.spriteIds,
      percentText: slice.percentText,
      color: slice.color,
      angle: midAngle,
      originalAngle: midAngle,
      radius: radius + BADGE_GAP + badgeH / 2,
      width: badgeW,
      height: badgeH,
      boundRadius: badgeW / 2,
    });
  });

  resolveBadgeCollisions(badges);

  return (
    <div className="relative w-full" style={{ height: containerHeight }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        role="img"
        aria-label="デッキ分布の円グラフ"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            fill={path.fill}
            stroke={SLICE_BORDER_COLOR}
            strokeWidth={SLICE_BORDER_WIDTH}
          />
        ))}
      </svg>

      {/* 外周のスプライトバッジ。円の中心を基準に絶対配置する */}
      {badges.map((badge) => {
        const dx = Math.cos(badge.angle) * badge.radius;
        const dy = Math.sin(badge.angle) * badge.radius;

        return (
          <div
            key={badge.key}
            className="flex flex-col items-center justify-center bg-content1"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: badge.width,
              height: badge.height,
              borderRadius: badge.height / 2,
              border: `2.5px solid ${badge.color}`,
              transform: `translate(calc(-50% + ${round(dx)}px), calc(-50% + ${round(dy)}px))`,
            }}
          >
            <div className="flex items-center">
              {badge.spriteIds.map((id, i) => (
                <PokemonSprite key={i} id={id} size={spriteSize} />
              ))}
            </div>
            {badge.percentText && (
              <span
                className="font-bold tabular-nums text-default-600"
                style={{
                  fontSize: BADGE_PERCENT_FONT_SIZE,
                  lineHeight: `${BADGE_PERCENT_FONT_SIZE}px`,
                  marginTop: BADGE_PERCENT_GAP,
                }}
              >
                {badge.percentText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
