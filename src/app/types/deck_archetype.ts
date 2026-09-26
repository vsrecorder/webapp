// バトラボ(vslab)のデッキ分類ルールで決めた、入賞デッキ1件の種類。
//
// 形は vslab の GET /api/archetypes/classify の応答(vslab/docs/archetype-rules.md 7章)から、
// 表示に使う項目だけを抜き出したもの。判定に使った環境や日付は持たない。
export type DeckArchetypeType = {
  deckCode: string;
  // 主デッキ名(例「ドラパルトex」)。どの主デッキにも当たらない(未分類)なら null
  archetypeName: string | null;
  // 型の名前(例「バシャーモ型」)。主デッキが型を持たなければ null。
  // 型を持つがどれにも当たらないときは無印の呼び名(既定「その他」)が入る
  variantName: string | null;
  // 表示名。「主デッキ名 型名」、型が無ければ主デッキ名だけ。未分類なら null
  label: string | null;
  // 図鑑 ID(DeckPokemonSpriteType.id と同じ体系)。未分類なら空
  sprites: string[];
};

// デッキコード → 種類。vslab の索引に無いデッキコード(未取り込み・提供範囲外)は含まれない
export type DeckArchetypeMap = Record<string, DeckArchetypeType>;

// GET /api/cityleague_results/deck_archetypes の応答
export type DeckArchetypesGetResponseType = {
  decks: DeckArchetypeMap;
};
