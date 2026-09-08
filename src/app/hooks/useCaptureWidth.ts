"use client";

import { subscribeWindowResize, useClientValue } from "@app/hooks/useClientValue";
import { SIDE_PADDING } from "@app/utils/captureImage";

// SSR 時は window を参照できないため、従来どおり 360 で描く
const DEFAULT_CAPTURE_WIDTH = 360;

// 端末の画面幅からキャプチャ対象の幅を決める。極端な幅(狭すぎる端末・PC)を避けてクランプする
function captureWidthFromViewport(): number {
  const target = Math.round(window.innerWidth) - SIDE_PADDING * 2;
  return Math.max(320, Math.min(target, 480));
}

/*
 * シェア画像のキャプチャ対象(戦績カードなど)の幅。
 * 書き出し画像の横幅が端末の画面幅いっぱいになるよう、画面幅から左右余白
 * (SIDE_PADDING * 2)を引いた値にする。
 *   最終画像の横幅 = キャプチャ対象の幅 + SIDE_PADDING * 2 = 端末の画面幅
 *
 * 画面幅の変化(端末の回転)にも追随する。生成用の effect はこの値に依存しているので、
 * 回転後は新しい幅で撮り直される(古い幅の画像を共有しない)。
 */
export function useCaptureWidth(): number {
  return useClientValue(captureWidthFromViewport, DEFAULT_CAPTURE_WIDTH, subscribeWindowResize);
}
