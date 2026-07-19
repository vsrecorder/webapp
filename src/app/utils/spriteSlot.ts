// デッキ・対戦相手のスプライトは、バックエンド上は順序付き配列だが、各要素に
// position(1/2) を持たせて「どの枠のアイコンか」を固定する。position を持たない
// 旧データも存在するため、表示・初期値の解決は必ずこのユーティリティを経由し、
// 後方互換を保つ。deck / match のどちらのスプライト型でも使える汎用実装。

type SpriteWithPosition = { id: string; position?: number };

// 配列内のいずれかの要素が position を持っているか。
// 1つでも持っていれば position ベースで解決し、なければ旧データとしてインデックス解決する。
function hasPosition(sprites: SpriteWithPosition[]): boolean {
  return sprites.some((s) => s.position != null);
}

// 指定スロット(1/2)のスプライトを取得する。
// position を持つ新データは position 一致で、旧データは配列インデックス(0/1)で解決する。
export function getSpriteBySlot<T extends SpriteWithPosition>(
  sprites: T[] | undefined | null,
  slot: 1 | 2,
): T | undefined {
  if (!sprites || sprites.length === 0) return undefined;

  if (hasPosition(sprites)) {
    return sprites.find((s) => s.position === slot);
  }

  // 旧データ(positionなし)はインデックスでスロットを解決
  return sprites[slot - 1];
}

// position 順(1→2)に並べ替えた配列を返す。旧データ(positionなし)は元の並びのまま返す。
// 常に2体分を左詰めで表示するコンパクト表示で、スロット順を安定させるために使う。
export function sortedSprites<T extends SpriteWithPosition>(
  sprites: T[] | undefined | null,
): T[] {
  if (!sprites || sprites.length === 0) return [];

  if (!hasPosition(sprites)) return sprites;

  return [...sprites].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}
