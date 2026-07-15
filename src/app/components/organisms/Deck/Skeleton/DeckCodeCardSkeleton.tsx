import { Skeleton } from "@heroui/react";

// boardレイアウト（デッキ画像→デッキコード）用スケルトン。実態のDeckCodeCardに合わせ、
// 画像とデッキコード行だけを並べる（チップ行は無い）。
// hideImage: デッキ画像を別所（ギャラリーのヒーロー画像）で表示する場合に true。
export default function DeckCodeCardSkeleton({
  hideImage = false,
}: { hideImage?: boolean } = {}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {!hideImage && <Skeleton className="aspect-2/1 w-full rounded-lg" />}

      {/* デッキコード行 */}
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
