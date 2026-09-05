"use client";

import { useCallback, useState } from "react";

import { Skeleton } from "@heroui/react";

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
  /**
   * <img loading> をそのまま渡す。既定(未指定)は即時読み込み。
   * 何件も並ぶ一覧で画面外のカードの画像を初回リクエストから外すときだけ "lazy" を渡す。
   */
  loading?: "lazy" | "eager";
};

// デッキ画像（2:1の横長）を表示し、タップで縦画面いっぱいの横向き全画面表示にする
// 共通コンポーネント。デッキモーダル(DeckCodeCard)とバージョン一覧(DisplayDeckCodes)で
// 同一の拡大挙動を共有する。拡大表示そのものは DeckImageZoomOverlay が担う。
export default function ZoomableDeckImage({ code, disableZoom = false, alt, loading }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  // デッキ画像タップで開く全画面（横向き）表示のオープン状態
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  /*
   * 画像がブラウザのキャッシュにあると、React が onLoad を張る前に読み込みが終わってしまい、
   * その後 load が飛ばないことがある。onLoad だけに頼るとスケルトンが乗ったまま残るため、
   * 要素が挿さった時点で読み込み済みかどうかも見る(戻る操作や一覧の再描画で起きる)。
   * 画像自体も HeroUI の <Image> ではなく素の <img> にして、同じ理由での「透明のまま」を避ける。
   */
  const imageRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setImageLoaded(true);
  }, []);

  // 画像の中身（スケルトン＋画像）。ズーム有無で共通に使う。
  const imageContent = (
    <>
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        alt={alt ?? code}
        src={deckImageUrl(code)}
        loading={loading}
        onLoad={() => setImageLoaded(true)}
        className="h-full w-full rounded-md object-cover"
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
