"use client";

import type { Chart, Plugin } from "chart.js";

// スライスごとの角度・半径情報を取り出すための最小限の型
// (chart.jsのArcElementインスタンスは実行時にこれらのプロパティを直接持つ)
type ArcGeometry = {
  x: number;
  y: number;
  startAngle: number;
  endAngle: number;
  outerRadius: number;
  innerRadius: number;
};

// 画像はスライス間・呼び出し間で使い回すためモジュールスコープでキャッシュする
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string, onLoad: () => void): HTMLImageElement | null {
  const cached = imageCache.get(url);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;

  const img = new Image();
  img.onload = onLoad;
  img.src = url;
  imageCache.set(url, img);
  return null;
}

// 画像本来の縦横比を保ったまま、box(boxSize四方)の中央に収めて描画する
// (widthとheightを両方sizeに指定すると画像が歪んで引き伸ばされてしまうため)
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxSize: number,
) {
  const scale = Math.min(boxSize / img.naturalWidth, boxSize / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, boxX + (boxSize - w) / 2, boxY + (boxSize - h) / 2, w, h);
}

// 中心(cx, cy)を基準に、常に左→右の順で画像を並べて描画する（複数体は少し重ねる）。
// スライスの向きによって並び軸を変えると、デッキの並び順が左右反転して見えてしまうため、
// 表示軸は画面上で常に水平固定にする。
function drawSprites(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  cx: number,
  cy: number,
  size: number,
) {
  if (images.length === 1) {
    drawContain(ctx, images[0], cx - size / 2, cy - size / 2, size);
    return;
  }

  const overlap = size * OVERLAP_RATIO;
  const totalWidth = size * images.length - overlap * (images.length - 1);
  let x = cx - totalWidth / 2;
  images.forEach((img) => {
    drawContain(ctx, img, x, cy - size / 2, size);
    x += size - overlap;
  });
}

const OVERLAP_RATIO = 0.28;
const EXTERNAL_GAP = 6;
// 外側表示同士の最低間隔（隣り合うスプライトが接触しすぎないための余白）
const OUTSIDE_MARGIN = 6;

type OutsideCandidate = {
  images: HTMLImageElement[];
  edgeX: number;
  edgeY: number;
  arcX: number;
  arcY: number;
  angle: number;
  radius: number;
  size: number;
  // 衝突判定に使う、このスプライト（組み合わせ含む）のおおよその半径
  boundRadius: number;
};

// 外側表示になったスプライト同士が重ならないよう、角度が近いものを引き離す。
// 角度順に並べ、前の項目との間隔（半径上の弧長換算）が互いのboundRadius+余白より
// 狭い場合は後ろ側の項目を角度方向に押し出す（前から順に1回なめるだけで済む）。
function resolveOutsideCollisions(candidates: OutsideCandidate[]) {
  if (candidates.length < 2) return;

  candidates.sort((a, b) => a.angle - b.angle);

  for (let i = 1; i < candidates.length; i++) {
    const prev = candidates[i - 1];
    const cur = candidates[i];
    const gap = cur.angle - prev.angle;
    const avgRadius = (prev.radius + cur.radius) / 2;
    // 弧長 = 角度 × 半径 なので、必要な弧長を角度に変換する
    const minGap = (prev.boundRadius + cur.boundRadius + OUTSIDE_MARGIN) / avgRadius;
    if (gap < minGap) {
      cur.angle = prev.angle + minGap;
    }
  }
}

// スライスの境界線(startAngle/endAngle、原点を通る直線)と、原点からの相対y座標がpyの
// 水平線との交点のx座標を求める。表示軸を常に水平固定にしたため、
// 「その半径での弦の長さ」ではなく、この交点から実際の水平方向の余白を計算する。
function xAtHorizontal(theta: number, py: number): number {
  const s = Math.sin(theta);
  if (Math.abs(s) < 1e-6) {
    // 境界線がほぼ水平＝この水平線とは交わらない（その方向には実質制約がない）
    return Math.cos(theta) >= 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return (py * Math.cos(theta)) / s;
}

/**
 * 円グラフの各スライス上にスプライト画像（デッキの組み合わせ最大2体）を重ねて描画するchart.jsプラグイン。
 * 表示順序（左→右）が入れ替わらないよう、並べる軸は常に画面上の水平固定にしている。
 *
 * どんな状況でも大きく表示するため、サイズは「内側にidealSizeでそのまま収まるか」の二択判定にし、
 * 中途半端に縮小することはしない。収まらない場合は円の外側・該当スライス付近に
 * 固定サイズ(outsideSize)で引き出し線付きに表示する。外側表示になったスプライト同士が
 * 隣接して重ならないよう、描画前に角度方向の衝突解消を行う（resolveOutsideCollisions）。
 * 外側表示分だけ円グラフ自体が縮小しないよう、呼び出し側では
 * chart.jsの`layout.padding`とキャンバスを囲むコンテナの高さの両方に、
 * 同じ余白分を確保しておくこと。
 */
export function createPieSlicesSpritePlugin(
  getSpriteUrls: (index: number) => (string | null | undefined)[] | null | undefined,
): Plugin<"pie"> {
  return {
    id: "pieSlicesSprite",
    afterDatasetsDraw(chart: Chart<"pie">) {
      const meta = chart.getDatasetMeta(0);
      const { ctx } = chart;
      const outsideCandidates: OutsideCandidate[] = [];

      meta.data.forEach((el, index) => {
        const urls = (getSpriteUrls(index) ?? []).filter((u): u is string => !!u);
        if (urls.length === 0) return;

        const arc = el as unknown as ArcGeometry;

        // 全画像の読み込みが揃うまでは描画しない（ちらつき防止。読み込み完了時にchart.draw()で再描画される）
        const images = urls.map((url) => loadImage(url, () => chart.draw()));
        if (images.some((img) => !img)) return;
        const loadedImages = images as HTMLImageElement[];
        const n = loadedImages.length;

        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const dirX = Math.cos(midAngle);
        const dirY = Math.sin(midAngle);

        const idealSize = Math.min(80, Math.max(40, arc.outerRadius * 0.86));
        const denom = n - OVERLAP_RATIO * (n - 1);

        // 表示軸を水平固定にしたため、スライスの2辺(startAngle/endAngle)と
        // 配置点を通る水平線との交点から、実際に使える水平方向の余白を計算する
        const insideRadius = arc.outerRadius * 0.62;
        const px = dirX * insideRadius;
        const py = dirY * insideRadius;
        const xStart = xAtHorizontal(arc.startAngle, py);
        const xEnd = xAtHorizontal(arc.endAngle, py);
        const leftBound = Math.min(xStart, xEnd);
        const rightBound = Math.max(xStart, xEnd);
        const availWidthInside = 2 * Math.max(0, Math.min(px - leftBound, rightBound - px));

        // idealSizeがそのまま収まる場合だけ内側に描画する（縮小して収める、はしない）
        if (availWidthInside / denom >= idealSize) {
          const cx = arc.x + px;
          const cy = arc.y + py;
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 4;
          drawSprites(ctx, loadedImages, cx, cy, idealSize);
          ctx.restore();
          return;
        }

        // 収まらない場合は円の外側・スライス付近に固定サイズで表示する候補として記録しておく
        // (この時点では描画せず、他スライスの外側表示と重ならないよう後でまとめて位置調整する)
        const outsideSize = Math.min(60, Math.max(40, arc.outerRadius * 0.62));
        const overlap = outsideSize * OVERLAP_RATIO;
        const totalWidth = n === 1 ? outsideSize : outsideSize * n - overlap * (n - 1);

        outsideCandidates.push({
          images: loadedImages,
          edgeX: arc.x + dirX * arc.outerRadius,
          edgeY: arc.y + dirY * arc.outerRadius,
          arcX: arc.x,
          arcY: arc.y,
          angle: midAngle,
          radius: arc.outerRadius + EXTERNAL_GAP + outsideSize / 2,
          size: outsideSize,
          boundRadius: totalWidth / 2,
        });
      });

      resolveOutsideCollisions(outsideCandidates);

      outsideCandidates.forEach((c) => {
        const cx = c.arcX + Math.cos(c.angle) * c.radius;
        const cy = c.arcY + Math.sin(c.angle) * c.radius;

        // 引き出し線はアイコンの少し手前で止める（衝突解消で角度がずれてもアイコン中心に
        // めり込まないよう、スライス外周からアイコンへ向かう向きを毎回計算し直す）
        const lineDX = cx - c.edgeX;
        const lineDY = cy - c.edgeY;
        const lineLen = Math.hypot(lineDX, lineDY) || 1;
        const stopX = cx - (lineDX / lineLen) * (c.size / 2);
        const stopY = cy - (lineDY / lineLen) * (c.size / 2);

        ctx.save();
        ctx.strokeStyle = "rgba(63, 63, 70, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c.edgeX, c.edgeY);
        ctx.lineTo(stopX, stopY);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 4;
        drawSprites(ctx, c.images, cx, cy, c.size);
        ctx.restore();
      });
    },
  };
}

/**
 * 円グラフの中心にスプライト画像を描画するchart.jsプラグイン。
 * 詳細カード表示中など、選択中のデッキを円の中心に大きく表示したい場合に使う。
 * getSpriteUrlsがnull/空配列を返す間は何も描画しない。
 */
export function createPieCenterSpritePlugin(
  getSpriteUrls: () => (string | null | undefined)[] | null | undefined,
): Plugin<"pie"> {
  return {
    id: "pieCenterSprite",
    afterDatasetsDraw(chart: Chart<"pie">) {
      const urls = (getSpriteUrls() ?? []).filter((u): u is string => !!u);
      if (urls.length === 0) return;

      const meta = chart.getDatasetMeta(0);
      const firstArc = meta.data[0] as unknown as ArcGeometry | undefined;
      if (!firstArc) return;

      const images = urls.map((url) => loadImage(url, () => chart.draw()));
      if (images.some((img) => !img)) return;
      const loadedImages = images as HTMLImageElement[];

      const { ctx } = chart;
      const cx = firstArc.x;
      const cy = firstArc.y;
      const size = Math.min(72, Math.max(36, firstArc.outerRadius * 0.7));
      const overlap = size * OVERLAP_RATIO;
      const totalWidth =
        loadedImages.length === 1
          ? size
          : size * loadedImages.length - overlap * (loadedImages.length - 1);
      const badgeRadius = totalWidth / 2 + 10;

      // 複数色のスライスが集まる中心でも見やすいよう、白い円のバッジを敷いてから描画する
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      ctx.save();
      drawSprites(ctx, loadedImages, cx, cy, size);
      ctx.restore();
    },
  };
}
