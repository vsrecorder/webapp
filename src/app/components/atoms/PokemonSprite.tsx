"use client";

import { Image } from "@heroui/react";

import { spriteImageUrl } from "@app/utils/sprite";
import { spriteFitStyle } from "@app/utils/spriteFit";

// ポケモンスプライトを枠内で最適表示する共通コンポーネント。
//
// 各スプライト画像はキャラの大きさ・キャンバス内の位置がまちまちなため、
// 単純に固定サイズで表示すると小型ポケモンが小さく・下寄りに見えてしまう。
// ここでは各画像のアルファ境界(bbox)を基準に、キャラを枠内で最適サイズ・位置
// (水平中央・下端接地)へ正規化して表示する(spriteFitStyle)。
//
// 枠は正方形(size px)・relative・overflow-hidden、img は absolute + 算出済み transform。
// id は padded 形式("0006" 等 / メガ等は "0006_mega_x")。未指定/欠損時は unknown を表示。
//
// raw=true のときは HeroUI の <Image> ではなく素の <img> を使う。
// HeroUI の <Image> は基底クラスに opacity-0 を持つため、html2canvas 等での
// 画像書き出しでは透明化して写らない。書き出し対象(シェアカード等)では raw を使う。

type Props = {
  id?: string | null;
  /** 枠の一辺(px)。既存レイアウトに合わせて指定する。既定 44 */
  size?: number;
  /** 枠 div に付与する追加クラス */
  className?: string;
  /** 画像書き出し用に素の <img> で描画する */
  raw?: boolean;
};

export default function PokemonSprite({
  id,
  size = 44,
  className = "",
  raw = false,
}: Props) {
  const alt = id ? id.replace(/^0+(?!$)/, "") : "unknown";
  const src = spriteImageUrl(id);
  const style = spriteFitStyle(id, size);

  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {raw ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt} src={src} style={style} />
      ) : (
        <Image removeWrapper alt={alt} src={src} style={style} />
      )}
    </div>
  );
}
