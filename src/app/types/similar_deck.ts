// バトラボ(vslab)の類似デッキ検索(GET /api/similar)の応答から、表示に使う項目だけを抜き出したもの。
//
// 検索元(自分のデッキ)と、カード構成が近いシティリーグの入賞デッキの一覧。
// 類似度は多重集合 Jaccard(0〜1)。デッキの種類はバトラボのデッキ分類ルールで決まる
// (シティリーグ結果の入賞デッキに付けている種類と同じ規則)。

// デッキの種類(要約)。未分類なら archetypeId と label が null で、sprites は空
export type SimilarDeckArchetypeType = {
  archetypeId: string | null;
  // 主デッキ名(「ドラパルトex」)と型名(「バシャーモ型」)。型が無ければ variantName は null。
  // 画面には similarDeckArchetypeName で「ドラパルトex(バシャーモ型)」の形にして出す
  archetypeName: string | null;
  variantName: string | null;
  // 表示名。「主デッキ名 型名」、型が無ければ主デッキ名だけ(主デッキ名・型名の無い古い応答の代わり)
  label: string | null;
  // 図鑑 ID(DeckPokemonSpriteType.id と同じ体系)。DeckSprites にそのまま渡せる
  sprites: string[];
};

// 差分カード 1 種類。imageUrl はそのカードが入っているデッキの印刷(絵柄)の画像。
// バトラボの索引に画像が無いカード・cards を返す前の古い応答では null
export type SimilarDiffCardType = {
  name: string;
  imageUrl: string | null;
};

// 構成が近い入賞デッキ 1 件
export type SimilarDeckType = {
  // 行を見分ける ID(バトラボの索引の文書 ID)。自分のデッキと同じコードの入賞は大会ごとに
  // 別の行になるので、デッキコードでは一意にならない
  entryId: string;
  deckCode: string;
  // 類似度(0〜1)
  similarity: number;
  // 大会日(ISO 8601)
  eventDate: string;
  prefectureName: string;
  leagueName: string;
  // 順位(1 / 2 / 3 / 5 / 9 / 17。cityleagueRankLabel で表記にする)
  rank: number;
  // 入賞デッキにあって自分のデッキに無い(または少ない)カード名。最大 6 種類
  diffIn: string[];
  // 自分のデッキにあって入賞デッキに無い(または少ない)カード名。最大 6 種類
  diffOut: string[];
  /*
   * diffIn / diffOut と同じ差分に、画像を添えたもの。差分カードのタグをタップしたときの
   * 画像はここから出す。in はその入賞デッキに入っている印刷、out は自分のデッキに入っている
   * 印刷なので、カードリストに並ぶ絵柄と一致する(images は種類の代表画像で、絵柄が違うことがある)
   */
  cards: { in: SimilarDiffCardType[]; out: SimilarDiffCardType[] };
  archetype: SimilarDeckArchetypeType;
  // 検索元と同じ主デッキか(型は問わない)。どちらかが未分類なら false
  sameArchetype: boolean;
  // 検索元と同じカードリストの入賞か(類似度 100% で先頭に並ぶ)。デッキコードは違うことがある。
  // 同じリストかは、カード(アート違いは束ねる)と枚数がすべて同じかでバトラボが決める
  sameList: boolean;
};

// 検索元(自分のデッキ)
export type SimilarDecksSourceType = {
  deckCode: string;
  // cityleague: バトラボの索引にある入賞デッキ / external: 索引に無く、中身を取り寄せたデッキ
  origin: "cityleague" | "external";
  environmentId: string;
  // 比べた環境の名前(例「30th CELEBRATION」)
  environmentTitle: string;
  archetype: SimilarDeckArchetypeType;
  // カードマスタと照合できないカードがあって、種類を判定しなかったとき true
  archetypeSkipped: boolean;
  // 検索元と同じカードリストの入賞の件数(提供範囲の中。デッキコードが違っても数える)。
  // 0 なら同じリストでは入賞していない
  placements: number;
  // 照合できず類似度から外したカード
  unresolved: { name: string; count: number }[];
};

// GET /api/deckcards/{code}/similar の応答
export type SimilarDecksGetResponseType = {
  source: SimilarDecksSourceType;
  similar: SimilarDeckType[];
  // 類似度を計算した候補の数
  candidates: number;
  /*
   * カード名 → カードマスタの代表画像(公式サイト)の URL。差分カードに出るカードの分だけ
   * バトラボが添えてくる。デッキに入っている印刷とは限らない(絵柄違い)ので、
   * cards[].imageUrl が無いときの控えにだけ使う。鍵は diffIn / diffOut の要素そのもの
   */
  images?: Record<string, string>;
};
