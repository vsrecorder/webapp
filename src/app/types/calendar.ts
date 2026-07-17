import { DeckPokemonSpriteType, MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

export type CalendarEventType =
  | "record"
  | "match_added"
  | "deck_created"
  | "deck_code_added"
  | "deck_archived";

// HeroUI Chip の color prop に渡せる値
export type CalendarChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

export type CalendarRecordEvent = {
  type: "record";
  record_id: string;
  deck_id: string;
  deck_name: string;
  // 利用したデッキのスプライトと、実際に使用したデッキコード
  deck_pokemon_sprites: DeckPokemonSpriteType[];
  deck_code: string;
  event_kind: "official" | "tonamel" | "unofficial" | "unknown";
  event_title: string;
  chip_label: string;
  chip_color: CalendarChipColor;
  // 公式イベントの主催店舗(会場)名。無ければ空文字
  venue_label: string;
  // 記録カード(OfficialEventRecord等)のアクセントカラーと同じTailwindクラス
  accent_color_class: string;
  created_at: string;
};

// 記録に紐づく対戦結果の追加。記録カードと同じイベント表示情報(chip等)を持つことで、
// どの記録に紐づく対戦かをカード上で明示する
export type CalendarMatchEvent = {
  type: "match_added";
  match_id: string;
  record_id: string;
  event_kind: "official" | "tonamel" | "unofficial" | "unknown";
  event_title: string;
  chip_label: string;
  chip_color: CalendarChipColor;
  venue_label: string;
  accent_color_class: string;
  // 対戦で使用した自分のデッキ。対戦単位では持たないため、紐づく記録から引く
  deck_name: string;
  deck_pokemon_sprites: DeckPokemonSpriteType[];
  opponents_deck_info: string;
  opponents_pokemon_sprites: MatchPokemonSpriteType[];
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  // 不戦勝/不戦敗の場合は対局データが無いため null
  go_first: boolean | null;
  your_prize_cards: number | null;
  opponents_prize_cards: number | null;
  memo: string;
  created_at: string;
};

export type CalendarDeckEvent = {
  type: "deck_created";
  deck_id: string;
  deck_name: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  // デッキ作成と同時刻に登録された初期バージョンのコード。ある場合のみサムネイルを表示する
  code?: string;
  created_at: string;
};

export type CalendarDeckCodeEvent = {
  type: "deck_code_added";
  deck_id: string;
  deck_name: string;
  deck_code_id: string;
  code: string;
  // 直前のバージョンのコード。これと code を比べてカードの増減を出す。
  // 比較対象が無い(このデッキで最初のバージョン)場合は空文字
  previous_code: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  created_at: string;
};

export type CalendarDeckArchivedEvent = {
  type: "deck_archived";
  deck_id: string;
  deck_name: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  created_at: string;
};

export type CalendarEvent =
  | CalendarRecordEvent
  | CalendarMatchEvent
  | CalendarDeckEvent
  | CalendarDeckCodeEvent
  | CalendarDeckArchivedEvent;

// キー: "YYYY-MM-DD"（JST基準）
export type CalendarDataType = Record<string, CalendarEvent[]>;

export type CalendarGetResponseType = {
  data: CalendarDataType;
};
