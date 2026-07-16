import { Skeleton } from "@heroui/react";

type Props = {
  // 表示するタブ数（実ページのタブ数に合わせる）。
  count: number;
  // 固定配置用の位置クラス。各ページの Tabs と同じ位置に載せるため呼び出し側から渡す
  // （例: "top-15 left-0 right-0 lg:left-56"）。
  positionClassName: string;
};

// ページ上部に fixed 配置されるタブバー（HeroUI Tabs）のローディングスケルトン。
// タブ自体はデータに依存せずハイドレーション後すぐ実体に差し替わるため、
// ここでは実体の Tabs と同じ位置・高さの「枠」だけをニュートラル色で用意し、
// サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
export default function FixedTabBarSkeleton({ count, positionClassName }: Props) {
  return (
    <div className={`fixed z-50 pl-1 pr-1 ${positionClassName}`}>
      <div className="flex w-full gap-1 rounded-medium bg-default-100 p-1">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-md" />
        ))}
      </div>
    </div>
  );
}
