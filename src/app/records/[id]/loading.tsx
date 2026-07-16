import { Spinner } from "@heroui/spinner";

// /records/[id] の Suspense 境界。
// 親(/records)の loading（記録一覧スケルトン）が詳細ページに継承されると
// 一覧の骨格が詳細画面に出て紛らわしいため、詳細ページ用に上書きする。
// 実体(RecordById)がデータ取得中に表示する中央スピナーと同じ見た目にすることで、
// サーバレンダリング→ハイドレーション→取得完了までを継ぎ目なく見せる。
export default function Loading() {
  return (
    <div className="pt-30 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
