import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

export type CalendarEventType =
  | "record"
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
  // 記録カード(OfficialEventRecord等)のアクセントカラーと同じTailwindクラス
  accent_color_class: string;
  created_at: string;
};

export type CalendarDeckEvent = {
  type: "deck_created";
  deck_id: string;
  deck_name: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  created_at: string;
};

export type CalendarDeckCodeEvent = {
  type: "deck_code_added";
  deck_id: string;
  deck_name: string;
  deck_code_id: string;
  code: string;
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
  | CalendarDeckEvent
  | CalendarDeckCodeEvent
  | CalendarDeckArchivedEvent;

// キー: "YYYY-MM-DD"（JST基準）
export type CalendarDataType = Record<string, CalendarEvent[]>;

export type CalendarGetResponseType = {
  data: CalendarDataType;
};
