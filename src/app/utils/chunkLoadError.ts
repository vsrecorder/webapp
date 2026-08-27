/*
 * デプロイ直後などに、古いページがもう存在しないチャンクを取りに行くと
 * ChunkLoadError が発生する。この場合、エラーバウンダリの reset() は同じ import を
 * 同じように失敗させるだけで復旧しない。新しい HTML と新しいチャンク名を取り直すには
 * ページ全体の再読み込み(location.reload)が必要になる。
 * error.tsx / global-error.tsx の「再読み込み」ボタンがこの判定で挙動を切り替える。
 */
export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    // webpack は JS を「Loading chunk X failed」、CSS を「Loading CSS chunk X failed」と報告する
    /Loading (CSS )?chunk .+ failed/i.test(error.message)
  );
}
