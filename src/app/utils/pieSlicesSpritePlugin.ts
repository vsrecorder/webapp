"use client";

import type { ArcElement, Chart, Plugin } from "chart.js";
import { getRelativePosition } from "chart.js/helpers";

import { spriteDrawRect } from "@app/utils/spriteFit";
import {
  BADGE_GAP,
  BADGE_PERCENT_FONT_SIZE,
  BADGE_PERCENT_GAP,
  badgeHeight,
  badgeWidth,
  fitBadgeSpriteSize,
  resolveBadgeCollisions,
  type BadgeAngleItem,
} from "@app/utils/pieBadgeLayout";

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

// バッジの配置に使う、1スライス分の幾何情報
type SliceGeometry = {
  x: number;
  y: number;
  outerRadius: number;
  // バッジを置く基準になる中心角。入場アニメの途中経過ではなく最終角度を使う
  midAngle: number;
  // 入場アニメでこのスライスがどこまで描かれたか(0=まだ無い, 1=描き切った)
  revealRatio: number;
};

/*
 * バッジ配置用の幾何情報を取り出す。
 *
 * 角度だけはアニメーションの最終値(getPropsの第2引数=true)を読む。chart.jsの入場アニメは
 * 全スライスを角度0(12時方向)から扇状に開いていくため、途中経過の角度をそのまま使うと
 * 全バッジが12時付近に集まった状態から始まり、衝突解消で外周へ押し出されながら
 * 各スライスの最終位置まで円周上を大きく滑って動いてしまう（スプライトがずれながら現れる）。
 * 最終角度で置けばバッジは最初から最後まで動かず、その場で現れるだけになる。
 *
 * 一方で中心(x,y)と半径は現在値のままにする。これらは入場アニメでは変化せず、
 * 詳細カードの開閉などで円の大きさ・位置が変わるときだけ動くため、現在値を使った方が
 * 円の変化にバッジが追従する。
 */
function getSliceGeometry(el: ArcElement): SliceGeometry {
  const final = el.getProps(["startAngle", "endAngle", "circumference"], true);
  const finalCircumference = final.circumference ?? 0;
  const drawnCircumference = el.circumference ?? 0;

  return {
    x: el.x,
    y: el.y,
    outerRadius: el.outerRadius,
    midAngle: (final.startAngle + final.endAngle) / 2,
    revealRatio:
      finalCircumference > 0
        ? Math.min(1, Math.max(0, drawnCircumference / finalCircumference))
        : 1,
  };
}

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

// next-themesが<html>に付与する"dark"クラスを見て、現在ダークモードかどうかを判定する
// (globals.cssの `@custom-variant dark (&:is(.dark *):not(.light *))` と同じ考え方)
function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return root.classList.contains("dark") && !root.classList.contains("light");
}

// 「不明」スプライト（デッキ未登録時のプレースホルダー）かどうかをURLから判定する
function isUnknownSprite(img: HTMLImageElement): boolean {
  return img.src.endsWith("/unknown.png");
}

// 各スプライトのアルファ境界(bbox)を基準に、キャラを box(boxSize四方)内で最適サイズ・
// 位置(水平中央・下端接地)に正規化して描画する。DOM の PokemonSprite と同じ考え方を
// canvas の drawImage(ソース矩形=キャラ範囲)で再現する。
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxSize: number,
) {
  const { sx, sy, sw, sh, dx, dy, dw, dh } = spriteDrawRect(
    img.src,
    boxX,
    boxY,
    boxSize,
  );

  if (isUnknownSprite(img) && isDarkMode()) {
    // 「不明」スプライトは黒系のアイコンのため、ダークモードのバッジ(濃色背景)の上では
    // ほぼ見えなくなってしまう。色を反転させて明るいアイコンにすることで視認性を保つ。
    ctx.save();
    ctx.filter = "invert(1)";
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
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

// DOM 側(リスト・詳細カードの PokemonSprite)は2体を隣接ボックスで重なりなく並べるため、
// canvas 側も重なりを 0 にして表示方法を揃える。各キャラは bbox 正規化でボックス内に
// 収まる(左右に余白)ため、隣接でも軽い隙間ができ、DOM と同じ見た目になる。
const OVERLAP_RATIO = 0;
// スプライトの下に出すパーセンテージ表示が占める高さ（間隔 + 文字サイズ）
const PERCENT_BLOCK_HEIGHT = BADGE_PERCENT_GAP + BADGE_PERCENT_FONT_SIZE;
// パーセンテージ文字の色（ライト/ダークモードそれぞれで視認性を確保する）
const PERCENT_COLOR_LIGHT = "#3f3f46";
const PERCENT_COLOR_DARK = "#e4e4e7";

// ダークモード時のバッジの塗り・枠線色。白のままだと暗い画面の中で浮いて見えるため、
// アプリのダーク配色（globals.cssのドット背景などで使っている#27272a系）に合わせた
// 濃色の塗りに、境界が分かるよう薄い枠を追加する。
const BADGE_FILL_LIGHT = "#ffffff";
const BADGE_FILL_DARK = "#27272a";
const BADGE_OUTLINE_DARK = "rgba(255, 255, 255, 0.25)";

// 描画対象として拾ったバッジ。スプライトの表示サイズはバッジの総数から決めるため、
// 寸法・配置を確定させる前の段階ではこの形で保持する。
type PendingBadge = {
  index: number;
  // レイアウトに使うスプライトの枠数。画像の読み込み状況に依存させない
  spriteCount: number;
  // 画像が全て読み込めていれば描画対象。1枚でも未読み込みなら null（位置だけ確保する）
  images: HTMLImageElement[] | null;
  slice: SliceGeometry;
  percentText: string | null;
};

type BadgeItem = BadgeAngleItem & {
  index: number;
  images: HTMLImageElement[] | null;
  spriteCount: number;
  arcX: number;
  arcY: number;
  width: number;
  color: string;
  // バッジ内・スプライト下に表示する割合文字列（例: "23%"）。nullなら表示しない
  percentText: string | null;
  // 入場アニメの進捗。位置は動かさず、この値を不透明度に使ってその場で現す
  revealRatio: number;
};

// タップ判定用に、直近の描画で確定したバッジの位置・サイズをチャートインスタンスに保持しておく
type BadgeHitArea = { index: number; cx: number; cy: number; w: number; h: number };
const badgeHitAreas = new WeakMap<Chart, BadgeHitArea[]>();

// テーマ(ライト/ダーク)切り替え時に再描画するためのMutationObserverをチャートごとに保持する
const themeObservers = new WeakMap<Chart, MutationObserver>();

// スライス色の縁取り付きバッジ（スタジアム形）を描画する。
// バッジの縁色がスライスの色・凡例の色ドットと一致することで、
// 引き出し線に頼らずどのスライスのスプライトかが分かる。
// ライト/ダークモードで塗り色を切り替え、ダークモードでも埋もれないようにする。
function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
) {
  const dark = isDarkMode();
  const r = h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + r, cy - h / 2);
  ctx.lineTo(cx + w / 2 - r, cy - h / 2);
  ctx.arc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx - w / 2 + r, cy + h / 2);
  ctx.arc(cx - w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fillStyle = dark ? BADGE_FILL_DARK : BADGE_FILL_LIGHT;
  ctx.shadowColor = dark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (dark) {
    // 濃色の塗りだけだと背景との境界が分かりにくいため、薄い縁をもう一段追加する
    ctx.lineWidth = 5;
    ctx.strokeStyle = BADGE_OUTLINE_DARK;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

// バッジ内、スプライトの下にパーセンテージ文字列（例: "23%"）を描画する
function drawBadgePercent(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSize: number,
) {
  ctx.save();
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isDarkMode() ? PERCENT_COLOR_DARK : PERCENT_COLOR_LIGHT;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/**
 * 円グラフの各スライスのスプライト画像（デッキの組み合わせ最大2体）を、
 * 外周に沿った同心円上に統一サイズの色バッジ付きで描画するchart.jsプラグイン。
 *
 * 見やすさのための設計:
 * - 内側/外側の混在をやめ、全アイコンを外周の同じ半径上に配置して規則性を持たせる
 * - スライス色の縁取り付きバッジで「どのスライスのアイコンか」を色で明示する
 *   （凡例の色ドットとも対応し、引き出し線が不要になる）
 * - サイズを統一し円グラフ本体を主役に保つ（件数が多く外周に並びきらない場合のみ、
 *   全バッジを同じ比率で縮める）
 * - 表示順序（左→右）が入れ替わらないよう、並べる軸は常に画面上の水平固定
 * - バッジ同士は角度方向の衝突解消で重なりを防ぐ（自スライスの近くに留めるのを優先し、
 *   それでは潰れ合う密集時だけ、空いている外周まで広げる。resolveBadgeCollisions 参照）
 *
 * バッジの位置はチャートインスタンスに記録され、getSpriteBadgeIndexAtでタップ判定に使える。
 * 呼び出し側では、バッジの分だけchart.jsの`layout.padding`と
 * キャンバスを囲むコンテナの高さの両方に同じ余白分を確保しておくこと。
 */
export function createPieSlicesSpritePlugin(
  getSpriteUrls: (index: number) => (string | null | undefined)[] | null | undefined,
  getSliceColor: (index: number) => string,
  getPercentText?: (index: number) => string | null | undefined,
): Plugin<"pie"> {
  return {
    id: "pieSlicesSprite",
    // ライト/ダークの切り替えはユーザー操作やOS設定変更によっていつでも起こりうるが、
    // chart.js自身はDOMの他の場所のクラス変更を検知できないため、バッジの色が
    // 切り替え前の状態のまま描画され続けてしまう（例: ライトモードなのに前回描画した
    // ダーク用の塗りが残る）。<html>のclass属性をMutationObserverで監視し、
    // 変化したら再描画してバッジの色を最新のテーマに追従させる。
    afterInit(chart: Chart<"pie">) {
      if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => chart.draw());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      themeObservers.set(chart, observer);
    },
    beforeDestroy(chart: Chart<"pie">) {
      themeObservers.get(chart)?.disconnect();
      themeObservers.delete(chart);
    },
    afterDatasetsDraw(chart: Chart<"pie">) {
      const meta = chart.getDatasetMeta(0);
      const { ctx } = chart;

      // まず描画対象のバッジを集める。スプライトの表示サイズはバッジの総数が
      // 決まらないと確定できない（外周に並びきらない件数なら縮める）ため、
      // ここではまだ寸法を求めない。
      const pending: PendingBadge[] = [];
      meta.data.forEach((el, index) => {
        const urls = (getSpriteUrls(index) ?? []).filter((u): u is string => !!u);
        if (urls.length === 0) return;

        // 画像が揃っていないバッジも、枠だけはレイアウトに参加させる。
        // 読み込めた分だけで配置を決めると、画像が1つ届くたびに件数が変わって
        // スプライトの大きさも衝突解消の結果も変わり、既に出ているバッジまで動いてしまう。
        // 描画自体は全画像が揃ってから行う（ちらつき防止。完了時にchart.draw()で再描画される）
        const images = urls.map((url) => loadImage(url, () => chart.draw()));
        const loaded = images.every((img) => !!img);

        pending.push({
          index,
          spriteCount: urls.length,
          images: loaded ? (images as HTMLImageElement[]) : null,
          slice: getSliceGeometry(el as unknown as ArcElement),
          percentText: getPercentText?.(index) ?? null,
        });
      });

      // 表示するデッキが多いときは、外周に並びきるようスプライトを縮める
      const spriteSize = fitBadgeSpriteSize({
        count: pending.length,
        outerRadius: pending[0]?.slice.outerRadius ?? 0,
        maxSpriteCount: pending.reduce((max, p) => Math.max(max, p.spriteCount), 0),
        hasPercent: pending.some((p) => p.percentText != null),
      });

      const items: BadgeItem[] = pending.map(
        ({ index, spriteCount, images, slice, percentText }) => {
          const overlap = spriteSize * OVERLAP_RATIO;
          const badgeW =
            badgeWidth(spriteSize, spriteCount) - overlap * (spriteCount - 1);
          const badgeH = badgeHeight(spriteSize, percentText != null);

          // バッジ中心の半径はbadgeHの半分を基準にする。バッジは画面上で常に横長固定のため、
          // スライスがほぼ真横を向く場合は横幅(badgeW)の方が半径方向に大きく張り出すが、
          // それに合わせて余白を確保するとカード幅の制約で円グラフ自体が縮んでしまうため、
          // ここでは高さ基準に留め、真横向きのごく稀なケースでの多少のはみ出しは許容する。
          return {
            index,
            images,
            spriteCount,
            arcX: slice.x,
            arcY: slice.y,
            angle: slice.midAngle,
            originalAngle: slice.midAngle,
            radius: slice.outerRadius + BADGE_GAP + badgeH / 2,
            width: badgeW,
            height: badgeH,
            boundRadius: badgeW / 2,
            color: getSliceColor(index),
            percentText,
            revealRatio: slice.revealRatio,
          };
        },
      );

      resolveBadgeCollisions(items);

      const hitAreas: BadgeHitArea[] = [];
      items.forEach((item) => {
        // 画像がまだ揃っていないバッジは、位置だけ確保して描画を見送る
        if (!item.images) return;
        // 入場アニメでスライスが姿を現すのに合わせてバッジも現す。位置は最終角度で
        // 固定してあるため、動かずにその場でフェードインするだけになる。
        if (item.revealRatio <= 0) return;

        const cx = item.arcX + Math.cos(item.angle) * item.radius;
        const cy = item.arcY + Math.sin(item.angle) * item.radius;

        ctx.save();
        ctx.globalAlpha = item.revealRatio;
        drawBadge(ctx, cx, cy, item.width, item.height, item.color);
        // パーセンテージ表示分だけスプライトを上にずらし、その下の空きに文字を描画する
        const spriteCy = item.percentText ? cy - PERCENT_BLOCK_HEIGHT / 2 : cy;
        drawSprites(ctx, item.images, cx, spriteCy, spriteSize);
        if (item.percentText) {
          const percentCy =
            spriteCy + spriteSize / 2 + BADGE_PERCENT_GAP + BADGE_PERCENT_FONT_SIZE / 2;
          drawBadgePercent(ctx, item.percentText, cx, percentCy, BADGE_PERCENT_FONT_SIZE);
        }
        ctx.restore();

        hitAreas.push({ index: item.index, cx, cy, w: item.width, h: item.height });
      });
      badgeHitAreas.set(chart, hitAreas);
    },
  };
}

/**
 * 円グラフの外周バッジ（createPieSlicesSpritePluginが描画したもの）を
 * タップした場合に、対応するデータのindexを返す。バッジ上でなければnull。
 * chart.getElementsAtEventForMode ではスライスの外側にあるバッジを検知できないため、
 * こちらを別途呼び出して組み合わせて使う。
 */
export function getSpriteBadgeIndexAt(
  chart: Chart<"pie">,
  nativeEvent: Parameters<typeof getRelativePosition>[0],
): number | null {
  const areas = badgeHitAreas.get(chart);
  if (!areas || areas.length === 0) return null;

  const { x, y } = getRelativePosition(nativeEvent, chart);
  for (const area of areas) {
    if (Math.abs(x - area.cx) <= area.w / 2 && Math.abs(y - area.cy) <= area.h / 2) {
      return area.index;
    }
  }
  return null;
}

// 円の中心に表示するパーセンテージ文字のフォントサイズ・スプライトとの間隔
// (外周バッジより中心の表示領域は大きいため、視認性重視でやや大きめにする)
const CENTER_PERCENT_FONT_SIZE = 16;
const CENTER_PERCENT_GAP = 4;

/**
 * 円グラフの中心にスプライト画像（と任意でパーセンテージ文字列）を描画するchart.jsプラグイン。
 * 詳細カード表示中など、選択中のデッキを円の中心に大きく表示したい場合に使う。
 * getSpriteUrlsがnull/空配列を返す間は何も描画しない。
 */
export function createPieCenterSpritePlugin(
  getSpriteUrls: () => (string | null | undefined)[] | null | undefined,
  getPercentText?: () => string | null | undefined,
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
      const percentText = getPercentText?.() ?? null;
      // パーセンテージ表示分だけスプライトを上にずらし、その下の空きに文字を描画する
      const centerShift = percentText ? (CENTER_PERCENT_GAP + CENTER_PERCENT_FONT_SIZE) / 2 : 0;
      const spriteCy = cy - centerShift;
      // 背景円はスプライト・文字の両方を覆えるよう、縦横それぞれの必要半径のうち大きい方を採用する
      const verticalHalf = size / 2 + centerShift;
      const horizontalHalf = totalWidth / 2;
      const badgeRadius = Math.max(horizontalHalf, verticalHalf) + 10;
      const dark = isDarkMode();

      // 複数色のスライスが集まる中心でも見やすいよう、円形バッジを敷いてから描画する
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = dark ? BADGE_FILL_DARK : BADGE_FILL_LIGHT;
      ctx.shadowColor = dark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 8;
      ctx.fill();
      if (dark) {
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 3;
        ctx.strokeStyle = BADGE_OUTLINE_DARK;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      drawSprites(ctx, loadedImages, cx, spriteCy, size);
      ctx.restore();

      if (percentText) {
        const percentCy = spriteCy + size / 2 + CENTER_PERCENT_GAP + CENTER_PERCENT_FONT_SIZE / 2;
        drawBadgePercent(ctx, percentText, cx, percentCy, CENTER_PERCENT_FONT_SIZE);
      }
    },
  };
}
