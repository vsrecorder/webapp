import Image from "next/image";

/*
 * 記録一覧の Tonamel カードへ敷く、Tonamelイベント画像(競技ページの og:image)の背景。
 * カード全面に cover で敷き、不透明度だけで沈める(記録詳細のイベント情報パネルと同じ扱い)。
 *
 * 不透明度は記録詳細のイベント情報パネル(Hero/TonamelEventBg.tsx)と同じ 12%(ダーク10%)。
 * 同じ記録が一覧と詳細で同じ濃さに見えるようにしてある。変えるときは両方を揃えること。
 *
 * next/image を通すのは、元画像が 1.4MB に達することがあるのと、
 * 外部オリジンのままだとシェア画像の書き出しに写らないため(理由は TonamelEventBg.tsx)。
 */

type Props = {
  // TonamelイベントのOGP画像URL(取得できていないときは空文字)
  image: string;
};

export default function TonamelCardBg({ image }: Props) {
  if (!image) return null;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.10]"
    >
      <Image
        src={image}
        alt=""
        /* カード幅は狭い画面では画面いっぱい、広い画面ではコンテンツ幅の上限(max-w-2xl)で頭打ち */
        fill
        sizes="(min-width: 768px) 672px, 100vw"
        className="object-cover object-center"
      />
    </span>
  );
}
