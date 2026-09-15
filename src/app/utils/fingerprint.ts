import { sortedSprites } from "@app/utils/spriteSlot";

import { WeeklyDeckUsageGroupingType } from "@app/types/weekly_deck_usage_stat";

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

// 表示枠は1体目・2体目の2つだけ。集計側も同じ範囲で指紋を作るため、3体目以降は落とす
// (画面に出ないスプライトが指紋だけを分けると、見た目が同じ行が複数並ぶ)。
const MAX_SPRITE_SLOT = 2;

type SpriteWithPosition = { id: string; position?: number };

/*
 * 集計単位(grouping)に合わせたデッキの指紋を作る。
 * 週次デッキ使用率の各行の fingerprint と突き合わせるために使う。
 *
 *   exact        … 表示される2枠のスプライト全部で決まる(従来どおり)
 *   first_sprite … 1体目のスプライトだけで決まる(2体目が違うだけの派生は同じ指紋)
 *
 * 「1体目」は position 昇順の先頭で、position が 1 のものとは限らない。1枠目が欠けて
 * 2枠目だけに登録された票を指紋なしとして捨てないための規則で、集計側
 * (core-apiserver の internal/infrastructure/weekly_deck_usage_stat.go)と揃えている。
 * position を持たない旧データは配列の並びを枠の順とみなす(spriteSlot と同じ扱い)。
 */
export function deckFingerprintKey(
  sprites: SpriteWithPosition[] | undefined | null,
  grouping: WeeklyDeckUsageGroupingType,
): string {
  const visible = sortedSprites(sprites).filter(
    (sprite, index) => (sprite.position ?? index + 1) <= MAX_SPRITE_SLOT,
  );
  if (visible.length === 0) return "";

  if (grouping === "first_sprite") return fingerprintKey([visible[0].id]);
  return fingerprintKey(visible.map((sprite) => sprite.id));
}
