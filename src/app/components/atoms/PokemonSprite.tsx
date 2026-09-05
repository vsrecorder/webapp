"use client";

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
// 画像は素の <img> で描く。HeroUI の <Image> は読み込み完了まで opacity-0 で、完了時に
// data-loaded="true" が付いて初めて表示される作りだが、画像がブラウザのキャッシュにあると
// React が load を受け取る前に読み込みが終わってしまい、その合図が来ないまま透明で残ることがある
// (同じスプライトが一覧に何度も出る・戻る操作でカードが作り直される、といった場面で起きる)。
// 小さなPNGでフェードインの必要も無いため、素の <img> にして表示漏れの余地を無くしている。
// 画像書き出し(captureThemedPng)でも、透明にならないぶん確実に写る。

type Props = {
  id?: string | null;
  /** 枠の一辺(px)。既存レイアウトに合わせて指定する。既定 44 */
  size?: number;
  /** 枠 div に付与する追加クラス */
  className?: string;
  /**
   * <img loading> をそのまま指定する。既定(未指定)は即時読み込み。
   * 一度に何十枚も並べる一覧(横スクロールのデッキ選択など)でだけ "lazy" を渡し、
   * 画面外のスプライトを初回リクエストから外す。
   * 書き出し(captureThemedPng)では読み込み済みである必要があるため渡さないこと。
   */
  loading?: "lazy" | "eager";
};

export default function PokemonSprite({
  id,
  size = 44,
  className = "",
  loading,
}: Props) {
  const alt = id ? id.replace(/^0+(?!$)/, "") : "unknown";
  const src = spriteImageUrl(id);
  const style = spriteFitStyle(id, size);

  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} src={src} style={style} loading={loading} />
    </div>
  );
}
