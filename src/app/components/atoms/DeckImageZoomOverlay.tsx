"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { LuX } from "react-icons/lu";

import { CDN_ORIGIN } from "@app/utils/cdn";

// デッキ画像（2:1の横長）の配信元
export const DECK_IMAGE_BASE = `${CDN_ORIGIN}/images/decks`;

export function deckImageUrl(code: string): string {
  return `${DECK_IMAGE_BASE}/${code}.jpg`;
}

type Props = {
  // デッキコード（画像URLの生成に使う）
  code: string;
  isOpen: boolean;
  onClose: () => void;
};

/*
 * デッキ画像を画面いっぱいの横向きで見せる全画面ビュー。
 *
 * 画像の描画方法（アスペクト比の枠に収める・カードのヒーローとして敷き詰める など）は
 * 置き場所ごとに違うので、拡大表示だけをこのコンポーネントに切り出してある。
 * ZoomableDeckImage（デッキ詳細モーダル・バージョン一覧）とデッキ一覧の
 * ギャラリーカードのヒーロー画像が、これを共有して同じ拡大挙動になる。
 */
export default function DeckImageZoomOverlay({ code, isOpen, onClose }: Props) {
  // 全画面表示中の副作用（背面スクロールの停止・Escでの終了）は開閉でだけ張り直したい。
  // onClose を依存に入れると、呼び出し側がインライン関数を渡すたびに張り直しになるため、
  // 最新の onClose は ref 経由で参照する。
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  /*
   * 縦画面の高さいっぱいに横長画像を表示する。
   * 横長(2:1)の画像を90度回転させ width:100dvh 指定することで、回転前の水平方向が
   * 画面の縦方向へマッピングされ、画面いっぱいの横表示になる。
   * HeroUI Image は max-width が上限で潰れるため、素の img を max-w-none で使う。
   *
   * HeroUI Modal はアニメーション用に transform を持つため、その内側に置いた
   * position:fixed はモーダル基準になり全画面表示にならない。createPortal で
   * body直下へ出してモーダルの外に逃がす。
   */
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95"
      onClick={onClose}
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
          onClose();
        }}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white active:opacity-70"
        aria-label="閉じる"
      >
        <LuX className="text-2xl" />
      </button>
      {/* 画像タップでも閉じる（背景と同じく戻す動作にする） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={deckImageUrl(code)}
        alt={code}
        className="max-w-none rotate-90 rounded-lg object-contain"
        style={{ width: "100dvh", height: "auto", maxHeight: "100dvw" }}
      />
    </div>,
    document.body,
  );
}
