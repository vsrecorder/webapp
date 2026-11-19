import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

export type DeckUsageItemType = {
  deck_id: string;
  name: string;
  count: number;
  usage_rate: number;
  wins: number;
  losses: number;
  win_rate: number;
  game_count: number;
  go_first_count: number;
  go_second_count: number;
  go_first_rate: number;
  go_first_wins: number;
  go_first_win_rate: number;
  go_second_wins: number;
  go_second_win_rate: number;
  // 集計対象外(ignore_stats_flg=true)の記録の件数。
  // 勝率などの集計には含まれないが、その旨をデッキ一覧に表示するために使う。
  // バックエンド未対応時は undefined になり得るため任意。
  ignored_count?: number;
  // 不戦勝・不戦敗として勝率の集計から外した対戦数(除外して集計したときだけ返る)。
  // 不戦しか記録が無いデッキは count が 0 になるため、これが無いと
  // 「対戦記録が無いデッキ」と区別できない。バックエンド未対応時は undefined。
  default_match_count?: number;
  // この行の成績に対応するスプライト。期間中の対戦で使ったバージョンのもの
  // (1デッキ1行の集計ではいちばん多く使った組み合わせ、行を分けた集計ではその行の組み合わせ)。
  pokemon_sprites: DeckPokemonSpriteType[];
  // デッキ自体のいまのスプライト(＝最新バージョンのスプライト)。期間によって変わらない。
  // バックエンド未対応時は undefined になり得るため任意(deckIdentitySprites で読む)。
  deck_pokemon_sprites?: DeckPokemonSpriteType[];
};

/*
 * 「どのデッキか」を示すためのスプライト(デッキの選択肢の横に出すアイコンなど)。
 *
 * 行の pokemon_sprites は期間中に使ったバージョンのものなので、同じデッキでも選んだ期間に
 * よって変わる。デッキを選ぶ場面でそれを出すと、期間を変えるたびに同じデッキのアイコンが
 * 入れ替わり、デッキ一覧で見ているアイコンとも食い違う。こちらはいまのデッキのスプライトを返す。
 * 古いバックエンド(deck_pokemon_sprites を返さない)では pokemon_sprites を使う
 * (その頃の pokemon_sprites はデッキのスプライトそのものなので、結果は同じになる)。
 */
export function deckIdentitySprites(
  item: Pick<DeckUsageItemType, "pokemon_sprites" | "deck_pokemon_sprites"> | null | undefined,
): DeckPokemonSpriteType[] {
  return item?.deck_pokemon_sprites ?? item?.pokemon_sprites ?? [];
}

/*
 * 行を一意に指す鍵。
 *
 * split_by_sprites=true で取った集計は、同じデッキでも対戦で使ったスプライトの組み合わせごとに
 * 行が分かれるので、deck_id だけでは行を区別できない(同じデッキ名のまま相棒を入れ替えた前後が
 * 別の行になる)。React の key や選択中の行の判定にはこれを使う。
 * deck_id が無い行(「その他」など)は呼び出し側で別の鍵を当てる(空文字を返す)。
 */
export function deckUsageRowKey(item: Pick<DeckUsageItemType, "deck_id" | "pokemon_sprites">) {
  if (!item.deck_id) return "";

  const sprites = (item.pokemon_sprites ?? [])
    .map((sprite, index) => `${sprite.position || index + 1}:${sprite.id}`)
    .sort()
    .join(",");

  return `${item.deck_id}|${sprites}`;
}

export type DeckUsageStatType = {
  user_id: string;
  year_month: string;
  environment_id: string;
  season: string;
  regulation_id: string;
  total_records: number;
  decks: DeckUsageItemType[];
};

// デッキの1バージョン(デッキコード)で戦った対戦の成績
export type DeckCodeUsageItemType = {
  deck_code_id: string;
  count: number;
  wins: number;
  losses: number;
  draws: number;
  // 勝ち/(勝ち+負け)。引き分けは分母に含めない
  win_rate: number;
};

// デッキの対戦成績をバージョンごとに分けたもの(全期間)
export type DeckCodeUsageStatType = {
  user_id: string;
  deck_id: string;
  deck_codes: DeckCodeUsageItemType[];
  // バージョンを指定せずに記録した対戦の数(どのバージョンの成績にも入らない)
  unassigned_count: number;
};
