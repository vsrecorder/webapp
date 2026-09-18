import { TagType } from "@app/types/tag";

/*
 * 表示用にタグを並べ替える。プリセットタグ(運営が用意する全ユーザー共通のタグ)を先に、
 * ユーザー自身のタグを後ろに置く。同じ群の中の並びは受け取ったままにする(安定ソート)。
 *
 * デッキ・デッキコード・対戦結果に付くプリセットは ACE SPEC だけなので、これで
 * 「ACE SPEC が常に先頭」になる(記録に付くプリセットは大会順位のみ。
 *  付与先ごとに見せるプリセットが分かれている: types/tag.ts の TagPresetCategory)。
 * ACE SPEC はデッキの中身を言い当てる情報で、自分用のラベルより先に読めた方がよい。
 * 1行に収める表示では溢れた分が見えないため、並び順がそのまま「何が見えるか」になる。
 */
export function sortTagsPresetFirst(tags: TagType[] | undefined | null): TagType[] {
  if (!tags || tags.length === 0) return [];

  return [...tags].sort((a, b) => Number(b.preset_flg) - Number(a.preset_flg));
}
