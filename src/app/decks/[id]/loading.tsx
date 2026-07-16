// /decks/[id] の Suspense 境界。
// 親(/decks)の loading（デッキ一覧スケルトン）が詳細ページに継承されると
// 一覧の骨格が詳細画面に出て紛らわしいため、詳細ページ用に上書きする。
// 実体(DeckById)がデータ取得中に表示する読み込み表示と同じ見た目にすることで、
// サーバレンダリング→ハイドレーション→取得完了までを継ぎ目なく見せる。
export default function Loading() {
  return (
    <div className="flex justify-center py-16 text-default-400">読み込み中...</div>
  );
}
