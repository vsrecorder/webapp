import type { CSSProperties } from "react";

import { SPRITE_BOUNDS } from "@app/utils/spriteBounds";
import { SPRITE_HEIGHTS } from "@app/utils/spriteHeights";

// スプライトを正方形の枠(frame px)内で「キャラの実範囲(アルファ境界)」基準に
// 最適サイズ・位置へ正規化して表示するための img 用インラインスタイルを返す。
//
// - スプライト画像ごとにキャラの大きさ・キャンバス内の位置が異なるため、
//   一律 scale では表示が安定しない。まず各画像のアルファ境界(bx,by,bw,bh)で
//   キャラの実範囲を掴み、水平中央・下端接地になるよう translate する。
// - キャラを枠内でどれだけの大きさにするか(枠占有率)は、各ポケモンの「公式身長」
//   を対数圧縮して決める(heightTargetRatio)。これで小型ポケモンは小さく、大型は
//   大きく、実際の身長差が枠内に反映される(画像の描画サイズには依存しない)。
// - 枠側は position:relative + overflow-hidden、img は position:absolute + 本スタイル。
//
// bounds が無い id(画像欠損など)や未知IDは unknown 相当のフォールバックを返す。

// unknown(未登録プレースホルダのモンスターボール)は実ポケモンと同じ大きさだと
// 目立ちすぎるため、控えめな割合で表示する
const UNKNOWN_TARGET_RATIO = 0.5;

// --- 身長 → 枠占有率(対数圧縮) -----------------------------------------
// 実身長は 0.1m〜100m級(GMAX等)まで幅が極端に広く、線形写像だと小型ポケモンが
// 枠内で潰れて見えなくなる。そこで身長を対数で圧縮し、competitive でよく使う
// 0.3〜6m 帯に効きを集中させて枠占有率 [MIN_RATIO, MAX_RATIO] に写像する。
// 帯の外側はクランプ(巨大ポケモンは一律最大、極小は一律最小)。
const MIN_H = 0.3; // これ以下の身長は最小比率に張り付く
const MAX_H = 6.0; // これ以上の身長は最大比率に張り付く
const MIN_RATIO = 0.58; // 最小ポケモンの枠占有率
const MAX_RATIO = 0.93; // 最大ポケモンの枠占有率
// 身長データが無い id(未知フォーム等)の既定占有率(1m 相当のおよそ中庸値)。
const FALLBACK_RATIO = 0.72;

const LOG_MIN_H = Math.log(MIN_H);
const LOG_SPAN = Math.log(MAX_H) - LOG_MIN_H;

// 身長[m] を枠占有率に変換する。身長 0/欠損は中庸値にフォールバックする。
function heightTargetRatio(height: number | undefined): number {
  if (!height || height <= 0) return FALLBACK_RATIO;
  const h = Math.min(MAX_H, Math.max(MIN_H, height));
  const t = (Math.log(h) - LOG_MIN_H) / LOG_SPAN;
  return MIN_RATIO + t * (MAX_RATIO - MIN_RATIO);
}
// 枠下端からの余白(frame 比)
const BOTTOM_PAD_RATIO = 0.04;
// 極端な拡大/縮小を避けるクランプ。基準枠(REFERENCE_FRAME)での値。
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.9;
// クランプの基準となる枠の一辺(px)。デッキカードなど大半の箇所がこの大きさ。
const REFERENCE_FRAME = 48;

// キャラの最大辺を frame の targetRatio(身長由来の枠占有率)に合わせるための拡大率。
//
// クランプは「元画像(68px)に対する拡大率」の上下限だが、固定値のままだと枠の
// 大きさによって効き方が変わり、同じポケモンでも箇所ごとに枠内での大きさが
// 変わってしまう(身長比率が枠サイズに食われる)。
//  - 大きい枠: 上限に張り付いてキャラが枠を埋められない。96px 枠(きずな結果カード)
//    では 1367体中1223体が上限1.9に張り付き、枠占有率の中央値が 0.86→0.65 に落ちた。
//  - 小さい枠: 下限に張り付いてキャラが枠からはみ出る。28px 枠(デッキ選択)では
//    1366体中884体が下限0.7に張り付き、大型ポケモンは占有率 1.6 超で見切れていた。
// そこで上下限を枠に比例させる。こうすると scale は frame に完全比例し、実効の
// 枠占有率が frame に依存しなくなる ＝ どの枠サイズでも身長どおりの同じ比率で
// 表示される(拡大率が上がるぶん元画像のドットは甘くなるが、枠ごとに大きさが
// バラつく方が目につくため、見え方の統一を優先する)。
function fitScale(bw: number, bh: number, frame: number, targetRatio: number): number {
  const clampFactor = frame / REFERENCE_FRAME;

  return Math.min(
    MAX_SCALE * clampFactor,
    Math.max(MIN_SCALE * clampFactor, (frame * targetRatio) / Math.max(bw, bh)),
  );
}

// bounds が unknown(未登録プレースホルダ)かどうか
function isUnknownBounds(
  b: [number, number, number, number, number, number],
): boolean {
  return b === SPRITE_BOUNDS["unknown"];
}

export function spriteFitStyle(
  id: string | undefined | null,
  frame = 48,
): CSSProperties {
  const b = (id && SPRITE_BOUNDS[id]) || SPRITE_BOUNDS["unknown"];
  const [cw, ch, bx, by, bw, bh] = b;

  const isUnknown = isUnknownBounds(b);
  // 枠占有率は身長(対数圧縮)で決める。unknown は控えめな固定値。
  const targetRatio = isUnknown
    ? UNKNOWN_TARGET_RATIO
    : heightTargetRatio(id ? SPRITE_HEIGHTS[id] : undefined);
  const pad = frame * BOTTOM_PAD_RATIO;

  const scale = fitScale(bw, bh, frame, targetRatio);

  // 水平: キャラ中心を枠中心に
  const tx = frame / 2 - (bx + bw / 2) * scale;
  // 垂直: 実ポケモンは下端接地。unknown(プレースホルダ)は接地だと小さく下寄りで
  // 見にくいため、枠の中央に配置する。
  const ty = isUnknown
    ? frame / 2 - (by + bh / 2) * scale
    : frame - pad - (by + bh) * scale;

  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: cw,
    height: ch,
    maxWidth: "none",
    transformOrigin: "0 0",
    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
  };
}

// スプライトURLのファイル名(先頭ゼロ除去済み)から bbox を引くための逆引き表。
// SPRITE_BOUNDS のキーは padded("0006")なので、URL側の "6" 形に変換して対応付ける。
const BOUNDS_BY_FILE: Record<
  string,
  [number, number, number, number, number, number]
> = (() => {
  const map: Record<string, [number, number, number, number, number, number]> = {};
  for (const [id, b] of Object.entries(SPRITE_BOUNDS)) {
    const file = id === "unknown" ? "unknown" : id.replace(/^0+(?!$)/, "");
    map[file] = b;
  }
  return map;
})();

function boundsFromUrl(url: string) {
  const m = url.match(/\/([^/]+)\.png(?:\?|$)/);
  const file = m ? m[1] : "";
  return BOUNDS_BY_FILE[file] ?? SPRITE_BOUNDS["unknown"];
}

// URL のファイル名("6" / "6_mega_x")から身長[m]を引くための逆引き表。
// SPRITE_HEIGHTS のキーは padded なので BOUNDS_BY_FILE と同じ変換で対応付ける。
const HEIGHT_BY_FILE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const [id, h] of Object.entries(SPRITE_HEIGHTS)) {
    map[id.replace(/^0+(?!$)/, "")] = h;
  }
  return map;
})();

function heightFromUrl(url: string): number | undefined {
  const m = url.match(/\/([^/]+)\.png(?:\?|$)/);
  const file = m ? m[1] : "";
  return HEIGHT_BY_FILE[file];
}

// canvas(chart)描画用: スプライトを box(正方形) 内に bbox 基準で最適配置するための
// drawImage 用パラメータ(ソース矩形=キャラ範囲)を返す。目的矩形は水平中央で、
// 実ポケモンは下端接地・unknown は中央配置。
export function spriteDrawRect(
  url: string,
  boxX: number,
  boxY: number,
  boxSize: number,
): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  const b = boundsFromUrl(url);
  const [, , bx, by, bw, bh] = b;
  const isUnknown = isUnknownBounds(b);
  // 枠占有率は身長(対数圧縮)で決める。unknown は控えめな固定値。
  const targetRatio = isUnknown
    ? UNKNOWN_TARGET_RATIO
    : heightTargetRatio(heightFromUrl(url));
  const pad = boxSize * BOTTOM_PAD_RATIO;
  const scale = fitScale(bw, bh, boxSize, targetRatio);
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = boxX + (boxSize - dw) / 2;
  // 実ポケモンは下端接地。unknown は中央配置(下寄りだと見にくいため)。
  const dy = isUnknown ? boxY + (boxSize - dh) / 2 : boxY + boxSize - pad - dh;
  return { sx: bx, sy: by, sw: bw, sh: bh, dx, dy, dw, dh };
}
