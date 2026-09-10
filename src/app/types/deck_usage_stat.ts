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
  pokemon_sprites: DeckPokemonSpriteType[];
};

export type DeckUsageStatType = {
  user_id: string;
  year_month: string;
  environment_id: string;
  season: string;
  regulation_id: string;
  total_records: number;
  decks: DeckUsageItemType[];
};
