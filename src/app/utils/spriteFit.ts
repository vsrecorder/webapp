import type { CSSProperties } from "react";

import { SPRITE_BOUNDS } from "@app/utils/spriteBounds";

// スプライトを正方形の枠(frame px)内で「キャラの実範囲(アルファ境界)」基準に
// 最適サイズ・位置へ正規化して表示するための img 用インラインスタイルを返す。
//
// - スプライト画像ごとにキャラの大きさ・キャンバス内の位置が異なるため、
//   一律 scale では小型ポケモンが小さく・下寄りに見えてしまう。
// - そこで各画像のアルファ境界(bx,by,bw,bh)を用い、キャラの最大辺を frame の
//   一定割合に合わせ(scale)、水平中央・下端接地になるよう translate する。
// - 枠側は position:relative + overflow-hidden、img は position:absolute + 本スタイル。
//
// bounds が無い id(画像欠損など)や未知IDは unknown 相当のフォールバックを返す。

// キャラ最大辺を frame のこの割合に合わせる
const TARGET_RATIO = 0.86;
// unknown(未登録プレースホルダのモンスターボール)は実ポケモンと同じ大きさだと
// 目立ちすぎるため、控えめな割合で表示する
const UNKNOWN_TARGET_RATIO = 0.5;
// 枠下端からの余白(frame 比)
const BOTTOM_PAD_RATIO = 0.04;
// 極端な拡大/縮小を避けるクランプ
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.9;

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
  const targetRatio = isUnknown ? UNKNOWN_TARGET_RATIO : TARGET_RATIO;
  const target = frame * targetRatio;
  const pad = frame * BOTTOM_PAD_RATIO;

  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, target / Math.max(bw, bh)),
  );

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
  const targetRatio = isUnknown ? UNKNOWN_TARGET_RATIO : TARGET_RATIO;
  const target = boxSize * targetRatio;
  const pad = boxSize * BOTTOM_PAD_RATIO;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, target / Math.max(bw, bh)));
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = boxX + (boxSize - dw) / 2;
  // 実ポケモンは下端接地。unknown は中央配置(下寄りだと見にくいため)。
  const dy = isUnknown ? boxY + (boxSize - dh) / 2 : boxY + boxSize - pad - dh;
  return { sx: bx, sy: by, sw: bw, sh: bh, dx, dy, dw, dh };
}
