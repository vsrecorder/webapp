// core-apiserver の NormalizeFingerprint(internal/infrastructure/fingerprint.go)と
// 同じ集計キーを生成する。プラットフォーム週次デッキ使用率(weekly_deck_usage)の各行が
// 持つ fingerprint 文字列と、ログインユーザー自身のデッキの pokemon_sprites を突き合わせ、
// 「自分のデッキが環境で何位か」をフロントだけで引き当てるために使う(施策E-2)。
//
// 正規化ルール(サーバ側と一致させること):
//   1. 重複を排除する
//   2. 昇順ソートする。Go の sort.Strings(バイト順)と一致させるため、数値ソートではなく
//      JS 既定の文字列比較を使う。スプライトIDはASCII(ゼロ埋め数値 "0006" や "0006_mega_x")
//      なので、この既定ソートでサーバと同じ結果になる。
//   3. カンマで連結する
//
// スプライトが1つも無い場合は空文字を返す。空文字は weekly_usage の「その他」枠
// (fingerprint === "")と同値になるため、呼び出し側では必ず「一致なし」として扱うこと。
export function fingerprintKey(spriteIds: string[]): string {
  const uniq = Array.from(new Set(spriteIds));
  uniq.sort();
  return uniq.join(",");
}
