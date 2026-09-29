/*
 * 角丸の骨格ブロック。モーダルの中では HeroUI の <Skeleton> の代わりにこれを使う。
 *
 * HeroUI の Skeleton は `overflow-hidden` の枠の中で ::before を translateX で走らせて
 * 光沢を作る。この「角丸 + overflow-hidden + transform で動く子」は、モーダル
 * (framer-motion が transform を持つ)の下に来ると iOS Safari が角丸の外側を
 * 透明ではなく黒で合成する(black-corners バグ)。骨格の四隅に黒い弧が覗いて見える。
 *
 * こちらは transform を使わず opacity だけを animate-pulse で動かすので、
 * 同じ場所に置いても踏まない。色は HeroUI の Skeleton と同じものを当てている。
 */
export default function PulseSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-content3 dark:bg-content2 ${className}`}
    />
  );
}
