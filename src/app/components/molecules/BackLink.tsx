import NextLink from "next/link";

import { LuChevronLeft } from "react-icons/lu";

type Props = {
  href: string;
  // 戻り先の名前(「デッキ一覧」「みんなの公開デッキ」など)。長い名前は省略記号で切る
  label: string;
  ariaLabel?: string;
  className?: string;
};

/*
 * 上位のページへ戻るリンク。個別ページ(デッキ・投稿・大会結果)やハブページの先頭に置く。
 *
 * ヘッダ直下に小さな文字を置くと窮屈で押しにくいため、ピル型のボタンにして上下に余白を取る。
 * 見た目をここに1つにまとめ、ページごとに文字の大きさや色が違ってしまわないようにする。
 * サーバコンポーネントからも使うため、HeroUI の Link ではなく next/link を使う。
 */
export default function BackLink({ href, label, ariaLabel, className = "" }: Props) {
  return (
    <NextLink
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-content1 py-1.5 pl-2 pr-3.5 text-sm font-bold text-default-600 shadow-small hover:text-default-800 active:opacity-70 ${className}`}
    >
      <LuChevronLeft className="shrink-0 text-base" />
      <span className="truncate">{label}</span>
    </NextLink>
  );
}
