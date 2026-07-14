import { Skeleton } from "@heroui/react";

// boardレイアウト（デッキ画像→デッキコード→バージョン・対戦環境チップ）用スケルトン。
// hideImage: デッキ画像を別所（ギャラリーのヒーロー画像）で表示する場合に true。
export default function DeckCodeCardSkeleton({
  hideImage = false,
}: { hideImage?: boolean } = {}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {!hideImage && <Skeleton className="aspect-2/1 w-full rounded-lg" />}

      {/* デッキコード行 */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* バージョン・対戦環境チップ */}
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-28 rounded-md" />
      </div>
    </div>
  );
}
