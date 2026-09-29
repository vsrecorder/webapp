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

/*
 * カード画像を開く前に、読み込みとデコードを待つ上限。
 *
 * モーダルは絵を持って入場させたい。骨格で入場して着地の瞬間に画像へ差し替えると、Android の
 * Chrome では差し替えが入場アニメーションの終わり(合成レイヤーが解除されて背面と一緒に
 * 描き直される瞬間)と重なり、古いタイル(暗幕も何も無い開く前の画面)が 1〜2 フレーム出る
 * (2026-09-29 の実機動画)。温まった画像は 60〜130ms で届く(本番実測)ので、その程度なら待ってから
 * 開く。それより遅い(初回の最適化など)ときは待たずに骨格で開く。タップから開くまでの遅れとして
 * 体感できる手前に収める
 */
export const PRE_DECODE_WAIT_MS = 150;

// モーダル用の大きさで先に読んでデコードしておく。上限までに終わらなければそのまま返す(開くのを止めない)
export function preDecodeCardImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, PRE_DECODE_WAIT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const img = new window.Image();
    const props = cardImageProps(src, "", "modal", "eager");
    // モーダルの <img> と同じ srcset を持たせ、同じ候補をブラウザに選ばせる(キャッシュが当たる)
    if (props.srcSet) img.srcset = props.srcSet;
    img.src = props.src;
    if (typeof img.decode === "function") {
      img.decode().then(done, done);
    } else {
      img.onload = done;
      img.onerror = done;
    }
  });
}
