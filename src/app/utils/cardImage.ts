import { getImageProps } from "next/image";

/*
 * カード画像(公式サイトの card_images/large)を next/image の最適化 API(/_next/image)に通す。
 *
 * 公式サイトにはこの 1 種類しか無く、868×1212 の JPEG で 1 枚 80〜240KB(平均 233KB)ある。
 * 56px のサムネイルにも、384px のモーダルにも同じものを読んでいたので、表示の大きさに合わせて
 * 縮めた WebP を同一オリジンから配る(2026-09-29 実測: モーダル用 w=828 で 53KB、サムネイル用
 * w=128 で 4.5KB。カードリスト 1 デッキぶん 27 枚は 6.3MB → 約 120KB)。
 * 最適化した画像はサーバに残る(next.config の minimumCacheTTL)ので、2 回目以降は公式サイトまで行かない。
 * www.pokemon-card.com は next.config の images.remotePatterns に入っている。
 *
 * <Image> ではなく getImageProps で素の <img> に付けるのは、読み込みの決着(onLoad / onError)を
 * 自分で見て骨格を外すため。先読み(DeckCardDetailRow)にも同じ srcset を渡し、表示と同じ候補を
 * ブラウザに選ばせてキャッシュを当てる。
 */

/*
 * 用途ごとの大きさ。srcset は 1x・2x の 2 候補になり、幅は next.config の imageSizes / deviceSizes
 * (既定値)のうち、これ以上で最も近いものに丸められる
 */
export const CARD_IMAGE_SIZES = {
  // カードリストのサムネイル。実効幅は端末幅の 1/5 で 65〜100px。候補は 96 と 256
  thumbnail: { width: 96, height: 134 },
  // カード 1 枚を大きく見せるモーダル。表示幅は最大 384px(24rem)。候補は 384 と 828
  modal: { width: 384, height: 536 },
} as const;

export type CardImageSize = keyof typeof CARD_IMAGE_SIZES;

// <img> にそのまま広げる属性(src / srcSet / width / height / decoding / loading / style)
export function cardImageProps(
  src: string,
  alt: string,
  size: CardImageSize,
  loading: "lazy" | "eager" = "lazy",
) {
  const { props } = getImageProps({ src, alt, ...CARD_IMAGE_SIZES[size], loading });

  return props;
}
