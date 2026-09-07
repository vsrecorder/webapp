"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@heroui/react";

import DeckImageZoomOverlay from "@app/components/atoms/DeckImageZoomOverlay";
import { deckImageUrl } from "@app/utils/deckImage";

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
  /*
   * 画像を読めなかった（CDN にまだ無い・消えている等で 404）。スケルトンを止め、
   * ブラウザ既定の壊れた画像アイコンと alt を出さないために使う。これが無いと
   * 読み込み中と区別が付かず、いつまでも読み込み中に見える。
   */
  const [imageFailed, setImageFailed] = useState(false);
  // デッキ画像タップで開く全画面（横向き）表示のオープン状態
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);

  /*
   * 読み込みの決着を state に反映する。onLoad / onError だけに頼れないのは、React が
   * それらを張る前に読み込みが終わっていることがあるため（キャッシュ済み、あるいは
   * サーバ描画された画像がハイドレーションより先に読み終わる場合）。そうなると load も
   * error も二度と飛ばず、スケルトンが乗ったまま残る。complete なら決着済みで、
   * naturalWidth が 0 なら失敗。
   *
   * 画像自体も HeroUI の <Image> ではなく素の <img> にしてある。あちらは表示用の <img> と
   * は別に detached な new Image() で読み込みを監視するため、loading="lazy" だと
   * 交差判定が永久に来ず「読み終わっているのに透明のまま」になる。
   *
   * code が変わったときもここで組み直す。前のデッキコードの結果（特に失敗）が残ったままだと、
   * 次の画像を出せなくなる。
   */
  useEffect(() => {
    const img = imageRef.current;
    const settled = !!img?.complete;
    setImageLoaded(settled && img.naturalWidth > 0);
    setImageFailed(settled && img.naturalWidth === 0);
  }, [code]);

  // 画像の中身（スケルトン＋画像）。ズーム有無で共通に使う。
  const imageContent = (
    <>
      {!imageLoaded && !imageFailed && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        alt={alt ?? code}
        src={deckImageUrl(code)}
        loading={loading}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageFailed(true)}
        className={`h-full w-full rounded-md object-cover ${
          imageFailed ? "opacity-0" : ""
        }`}
      />
    </>
  );

  // 読めなかったときは枠を無地にして「そこに画像がある場所」だけを残す
  // （デッキ一覧のギャラリーカードと同じ見せ方）。
  const frameClass = `relative w-full aspect-2/1 block${imageFailed ? " rounded-md bg-default-100" : ""}`;

  // disableZoom のときは、タップで全画面表示しない素の画像として描画する。
  // それ以外はタップで拡大するボタンにする。読めなかったときは拡大しても何も映らないので、
  // ボタンにはせず素の枠として描く。
  return (
    <>
      {disableZoom || imageFailed ? (
        <div className={frameClass}>{imageContent}</div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomOpen(true);
          }}
          className={`${frameClass} cursor-zoom-in active:opacity-90 transition-opacity`}
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
