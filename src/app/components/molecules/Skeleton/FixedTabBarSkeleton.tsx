import { Skeleton } from "@heroui/react";

type Props = {
  // 表示するタブ数（実ページのタブ数に合わせる）。
  count: number;
  // 固定配置用のクラス。各ページの Tabs と同じ位置・同じ背景に載せるため呼び出し側から渡す
  // （例: "top-15 left-0 right-0 lg:left-56"）。実体側が背景や余白を持つ場合はそれも含める
  // （食い違うと骨格から実体へ切り替わった瞬間にタブが跳ねる）。
  positionClassName: string;
  /*
   * タブの入れ物（HeroUI の tabList）に載せるクラス。既定は HeroUI の既定背景。
   * 実体が classNames.tabList で別の背景を使う画面は、その背景を渡して骨格と揃える。
   */
  barClassName?: string;
};

/*
 * ページ上部に fixed 配置されるタブバー（HeroUI Tabs）のローディングスケルトン。
 * タブ自体はデータに依存せずハイドレーション後すぐ実体に差し替わるため、
 * ここでは実体の Tabs と同じ位置・高さの「枠」だけをニュートラル色で用意し、
 * サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
 *
 * 寸法は HeroUI Tabs(size="md")のテーマに合わせている。この部品を使う画面
 * (記録一覧・記録作成・シティリーグ結果)はすべて size="md" で、タブの高さは
 * classNames でも h-8 に揃えられている。
 *
 * デッキ一覧・みんなの公開デッキは骨格をやめ、loading.tsx でも実体の
 * DeckSegmentedControl をそのまま描いている(タブがグレーの棒に化けて戻る
 * ちらつきを無くすため。理由はそちらのコメント)。同じ手はここを使う画面にも使える。
 *
 *   tabList → p-1 gap-2 rounded-medium   タブの入れ物
 *   tab     → h-8 rounded-small(8px)     タブ1つ
 *
 * ここが実体とずれると、骨格から実体へ切り替わった瞬間にタブの隙間や角が変わって見える。
 */
export default function FixedTabBarSkeleton({
  count,
  positionClassName,
  barClassName = "bg-default-100",
}: Props) {
  return (
    <div className={`fixed z-50 pl-1 pr-1 ${positionClassName}`}>
      <div className={`flex w-full gap-2 rounded-medium p-1 ${barClassName}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-small" />
        ))}
      </div>
    </div>
  );
}
