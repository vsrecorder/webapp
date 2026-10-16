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

/*
 * 分類の照会結果。種類の辞書と、まだ分類できないデッキコード。
 *
 * pending は vslab が「索引に無い」と答えたコード。大会結果は core-apiserver に先に入り、
 * vslab の索引に載るのは 15〜35 分遅れる(索引の取り込みは :15 と :45)ので、その間の入賞デッキがここに入る。
 * vslab が応答しなかった(失敗した)照会のコードは、分類できるかどうか分からないので入れない。
 */
export type DeckArchetypeLookup = {
  decks: DeckArchetypeMap;
  pending: string[];
};

// GET /api/cityleague_results/deck_archetypes の応答
export type DeckArchetypesGetResponseType = {
  decks: DeckArchetypeMap;
};

/*
 * 直近(分類を待つ期間 = 今日・昨日)の大会の、デッキ分類が揃っているかの判定。
 *
 * サーバが 30 秒ごとに 1 枚だけ作り(utils/cityleagueAwaitingServer)、一覧・ホームのパネル・
 * ハブ・個別ページ・選手ページがすべてこれを見て隠すかどうかを決める。画面ごとに別の照会で
 * 判定すると、照会ごとのキャッシュが別々の時刻に切れて、索引が追いついた直後に食い違うため。
 * GET /api/cityleague_results/recent_deck_archetypes の応答でもある。
 */
export type RecentDeckArchetypesType = {
  // 判定した日(JST の今日 "YYYY-MM-DD")。待つ期間の境目はこの日で決める
  today: string;
  // 待つ期間の結果を確かめられた大会(official_event_id)。これに無い直近の大会はまだ出さない
  checked: number[];
  // そのうち分類がまだ揃わない大会
  awaiting: number[];
  // 分類が揃った大会の入賞デッキ(8 位まで)の種類。判定と同じ答えなので、出した大会に種類の行が欠けない
  decks: DeckArchetypeMap;
};
