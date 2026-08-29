"use client";

import { useState } from "react";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";

import DeckImageZoomOverlay, {
  deckImageUrl,
} from "@app/components/atoms/DeckImageZoomOverlay";

type Props = {
  // デッキコード（画像URLの生成に使う）
  code: string;
  // タップでの全画面表示を無効化する場合に true。
  disableZoom?: boolean;
  // 画像の代替テキスト。省略時はデッキコード。
  alt?: string;
};

// デッキ画像（2:1の横長）を表示し、タップで縦画面いっぱいの横向き全画面表示にする
// 共通コンポーネント。デッキモーダル(DeckCodeCard)とバージョン一覧(DisplayDeckCodes)で
// 同一の拡大挙動を共有する。拡大表示そのものは DeckImageZoomOverlay が担う。
export default function ZoomableDeckImage({ code, disableZoom = false, alt }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  // デッキ画像タップで開く全画面（横向き）表示のオープン状態
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // 画像の中身（スケルトン＋Image）。ズーム有無で共通に使う。
  const imageContent = (
    <>
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      <Image
        radius="sm"
        shadow="none"
        alt={alt ?? code}
        src={deckImageUrl(code)}
        className=""
        onLoad={() => setImageLoaded(true)}
      />
    </>
  );

  // disableZoom のときは、タップで全画面表示しない素の画像として描画する。
  // それ以外はタップで拡大するボタンにする。
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

      <DeckImageZoomOverlay
        code={code}
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
      />
    </>
  );
}
