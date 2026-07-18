"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import { LuX } from "react-icons/lu";

const DECK_IMAGE_BASE = "https://xx8nnpgt.user.webaccel.jp/images/decks";

type Props = {
  // デッキコード（画像URLの生成に使う）
  code: string;
  // タップでの全画面表示を無効化する場合に true。
  // リスト表示のアコーディオン内などでは、画像タップで拡大させたくない。
  disableZoom?: boolean;
};

// デッキ画像（2:1の横長）を表示し、タップで縦画面いっぱいの横向き全画面表示にする
// 共通コンポーネント。デッキモーダル(DeckCodeCard)とバージョン一覧(DisplayDeckCodes)で
// 同一の拡大挙動を共有する。
export default function ZoomableDeckImage({ code, disableZoom = false }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  // デッキ画像タップで開く全画面（横向き）表示のオープン状態
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const imageSrc = `${DECK_IMAGE_BASE}/${code}.jpg`;

  // 全画面表示中は背面のスクロールを止め、Escで閉じられるようにする
  useEffect(() => {
    if (!isZoomOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomOpen]);

  // 画像の中身（スケルトン＋Image）。ズーム有無で共通に使う。
  const imageContent = (
    <>
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      <Image
        radius="sm"
        shadow="none"
        alt={code}
        src={imageSrc}
        className=""
        onLoad={() => setImageLoaded(true)}
      />
    </>
  );

  // 縦画面の高さいっぱいに横長画像を表示する全画面ビュー。
  // 横長(2:1)の画像を90度回転させ width:100dvh 指定することで、回転前の水平方向が
  // 画面の縦方向へマッピングされ、画面いっぱいの横表示になる。
  // HeroUI Image は max-width が上限で潰れるため、素の img を max-w-none で使う。
  // HeroUI Modal はアニメーション用に transform を持つため、その内側に置いた
  // position:fixed はモーダル基準になり全画面表示にならない。createPortal で
  // body直下へ出してモーダルの外に逃がす。
  const zoomOverlay =
    isZoomOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95"
            onClick={() => setIsZoomOpen(false)}
            role="dialog"
            aria-modal="true"
            // このオーバーレイは HeroUI Modal の外(body直下)に portal している。
            // react-aria の interact-outside 判定は document のキャプチャで動くため
            // 要素側の stopPropagation では止められず、ズームを閉じる操作が背面モーダルの
            // 「外側クリック」とみなされモーダルまで閉じてしまう。
            // top-layer 属性を付けると、この配下の操作は外側クリック判定から除外される。
            data-react-aria-top-layer="true"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomOpen(false);
              }}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white active:opacity-70"
              aria-label="閉じる"
            >
              <LuX className="text-2xl" />
            </button>
            {/* 画像タップでも閉じる（背景と同じく戻す動作にする） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={code}
              className="max-w-none rotate-90 rounded-lg object-contain"
              style={{ width: "100dvh", height: "auto", maxHeight: "100dvw" }}
            />
          </div>,
          document.body,
        )
      : null;

  // disableZoom のときは、タップで全画面表示しない素の画像として描画する
  // （リスト表示のアコーディオン内など）。それ以外はタップで拡大するボタンにする。
  return (
    <>
      {disableZoom ? (
        <div className="relative w-full aspect-2/1 block">{imageContent}</div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomOpen(true);
          }}
          className="relative w-full aspect-2/1 block cursor-zoom-in active:opacity-90 transition-opacity"
          aria-label="デッキ画像を拡大表示する"
        >
          {imageContent}
        </button>
      )}

      {zoomOverlay}
    </>
  );
}
