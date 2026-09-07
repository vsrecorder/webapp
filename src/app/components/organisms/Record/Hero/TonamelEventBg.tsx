import Image from "next/image";

/*
 * Tonamel記録のイベント情報パネルへ敷く、Tonamelイベント画像(競技ページの og:image)の背景。
 * パネル全面に cover で敷き、不透明度だけで沈める(全面ウォッシュ)。
 *
 * 画像は主催者がアップロードした派手なサムネイル(文字入り・高コントラスト)のことも、
 * カバー未設定でTonamel既定のオレンジ地のこともある。どちらでも日付・イベント名・
 * チップが読めるよう、不透明度は 9%(ダーク 10%)に抑えている。
 *
 * CSSの background-image ではなく next/image を使う理由:
 *   - 元画像が 1280x720 の PNG で 1.4MB に達することがあり、最適化を通したい
 *   - シェア画像の書き出し(utils/captureImage.ts)は <img> しか面倒を見ない。
 *     背景CSSの画像は外部オリジンのままでは書き出しに写らない
 *     (img.tonamel.com は CORS を許可しておらず、CSPのconnect-srcにも無い)。
 *     最適化API経由なら同一オリジンになり、既存の「読み込み待ち・失敗時の再試行」に
 *     そのまま乗る。
 */

type Props = {
  // TonamelイベントのOGP画像URL(取得できていないときは空文字)
  image: string;
};

export default function TonamelEventBg({ image }: Props) {
  if (!image) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <Image
        src={image}
        alt=""
        fill
        /* パネルの実効幅は、狭い画面ではカード幅の約7割。
           コンテンツ幅の上限(max-w-2xl)に達する広い画面では 500px 弱で頭打ちになる。 */
        sizes="(min-width: 1024px) 500px, 70vw"
        className="object-cover opacity-[0.09] dark:opacity-[0.10]"
      />
    </span>
  );
}
