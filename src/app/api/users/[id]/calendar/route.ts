import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { CalendarChipColor, CalendarDataType, CalendarEvent } from "@app/types/calendar";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { DeckPokemonSpriteType, MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

import {
  cleanOfficialEventTitle,
  getEventAccentColor,
  getChipColor,
  getEventTypeName,
  getEventVenueLabel,
} from "@app/components/organisms/Record/officialEventHelpers";

import { toDateKey } from "@app/utils/calendar";

import * as jwt from "jsonwebtoken";

// core-apiserver の GET /users/{id}/calendar が返す形。
// 記録・対戦結果・デッキ・デッキコードと、参照先のイベント情報がまとめて入っている。
type CalendarApiGame = {
  go_first: boolean;
  your_prize_cards: number;
  opponents_prize_cards: number;
};

type CalendarApiMatch = {
  id: string;
  created_at: string;
  opponents_deck_info: string;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  memo: string;
  games: CalendarApiGame[];
  pokemon_sprites: MatchPokemonSpriteType[];
};

type CalendarApiRecord = {
  id: string;
  created_at: string;
  official_event_id: number;
  tonamel_event_id: string;
  unofficial_event_id: string;
  deck_id: string;
  deck_code_id: string;
  matches: CalendarApiMatch[];
};

type CalendarApiDeckCode = {
  id: string;
  created_at: string;
  code: string;
};

type CalendarApiDeck = {
  id: string;
  created_at: string;
  // アーカイブされていない場合は null
  archived_at: string | null;
  name: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  deck_codes: CalendarApiDeckCode[];
};

type CalendarApiNamedEvent = {
  id: string;
  title: string;
};

type CalendarApiResponse = {
  records: CalendarApiRecord[];
  decks: CalendarApiDeck[];
  official_events: OfficialEventGetByIdResponseType[];
  tonamel_events: CalendarApiNamedEvent[];
  unofficial_events: CalendarApiNamedEvent[];
};

// カレンダーは記録・デッキを丸ごと集計するため、バックエンドの処理時間が
// 単純な取得系より長くなりうる。トークンが処理の途中で切れないよう長めに取る。
const TOKEN_EXPIRES_IN = "60s";

function makeToken(uid: string): string {
  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRES_IN,
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid,
  };
  return jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);
}

function resolveEventKind(
  record: CalendarApiRecord,
): "official" | "tonamel" | "unofficial" | "unknown" {
  if (record.official_event_id && record.official_event_id !== 0) return "official";
  if (record.tonamel_event_id) return "tonamel";
  if (record.unofficial_event_id) return "unofficial";
  return "unknown";
}

const UNKNOWN_TITLE = "(タイトル不明)";

// 記録カード(OfficialEventRecord/TonamelEventRecord/UnofficialEventRecord)の表示情報。
// 色やラベルはUIの関心事なので、バックエンドには持たせずここで決める。
type RecordEventDisplay = {
  title: string;
  chip_label: string;
  chip_color: CalendarChipColor;
  accent_color_class: string;
  venue_label: string;
};

const FALLBACK_DISPLAY: RecordEventDisplay = {
  title: UNKNOWN_TITLE,
  chip_label: "記録",
  chip_color: "default",
  accent_color_class: "bg-default-300",
  venue_label: "",
};

function buildOfficialEventDisplay(
  event: OfficialEventGetByIdResponseType,
): RecordEventDisplay {
  if (!event.title) {
    return {
      title: UNKNOWN_TITLE,
      chip_label: "公式",
      chip_color: "default",
      accent_color_class: "bg-default-300",
      venue_label: "",
    };
  }

  return {
    title: cleanOfficialEventTitle(event.title),
    chip_label: getEventTypeName(event),
    chip_color: getChipColor(event),
    accent_color_class: getEventAccentColor(event),
    venue_label: getEventVenueLabel(event),
  };
}

// Tonamelイベントは一覧カード(TonamelEventRecord)と同じ固定の見た目(オレンジ系)にする
function buildTonamelEventDisplay(title: string): RecordEventDisplay {
  return {
    title: title || UNKNOWN_TITLE,
    chip_label: "Tonamel",
    chip_color: "warning",
    accent_color_class: "bg-orange-500",
    venue_label: "",
  };
}

// 自由形式イベントは一覧カード(UnofficialEventRecord)と同じ固定の見た目(グレー系)にする
function buildUnofficialEventDisplay(title: string): RecordEventDisplay {
  return {
    title: title || UNKNOWN_TITLE,
    chip_label: "自由形式",
    chip_color: "default",
    accent_color_class: "bg-default-400",
    venue_label: "",
  };
}

function resolveDisplay(
  record: CalendarApiRecord,
  eventKind: ReturnType<typeof resolveEventKind>,
  officialDisplayById: Map<number, RecordEventDisplay>,
  tonamelDisplayById: Map<string, RecordEventDisplay>,
  unofficialDisplayById: Map<string, RecordEventDisplay>,
): RecordEventDisplay {
  switch (eventKind) {
    case "official":
      return officialDisplayById.get(record.official_event_id) ?? FALLBACK_DISPLAY;
    case "tonamel":
      // Tonamelは外部サイトから取得するため、取得できなかったイベントは
      // バックエンドの応答に含まれない。その場合もカードの見た目は保ちたいので、
      // タイトル不明のTonamel表示にフォールバックする。
      return (
        tonamelDisplayById.get(record.tonamel_event_id) ?? buildTonamelEventDisplay("")
      );
    case "unofficial":
      return (
        unofficialDisplayById.get(record.unofficial_event_id) ??
        buildUnofficialEventDisplay("")
      );
    default:
      return FALLBACK_DISPLAY;
  }
}

function pushEvent(data: CalendarDataType, dateKey: string, event: CalendarEvent) {
  if (!data[dateKey]) data[dateKey] = [];
  data[dateKey].push(event);
}

async function fetchCalendar(
  token: string,
  userId: string,
): Promise<CalendarApiResponse> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${userId}/calendar`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch calendar: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = makeToken(session.user.id);

  try {
    // カレンダーの組み立てに必要なデータは、バックエンドの集計エンドポイントが
    // 一度に返す。以前はここで記録・デッキごとにAPIを呼んでいたため、記録が増えるほど
    // リクエスト数が線形に増え、処理中にトークンが失効して失敗することがあった。
    const calendar = await fetchCalendar(token, session.user.id);

    return NextResponse.json({ data: buildCalendarData(calendar) }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed to build calendar" }, { status: 500 });
  }
}

// バックエンドの集計結果から、日付(JST)ごとの活動ログを組み立てる。
function buildCalendarData(calendar: CalendarApiResponse): CalendarDataType {
  const officialDisplayById = new Map(
    calendar.official_events.map((event) => [event.id, buildOfficialEventDisplay(event)]),
  );
  const tonamelDisplayById = new Map(
    calendar.tonamel_events.map((event) => [
      event.id,
      buildTonamelEventDisplay(event.title),
    ]),
  );
  const unofficialDisplayById = new Map(
    calendar.unofficial_events.map((event) => [
      event.id,
      buildUnofficialEventDisplay(event.title),
    ]),
  );

  const deckById = new Map(calendar.decks.map((deck) => [deck.id, deck]));

  // 記録で使われたデッキコード(バージョン)の中身を引けるようにする
  const deckCodeById = new Map(
    calendar.decks.flatMap((deck) =>
      deck.deck_codes.map((deckCode) => [deckCode.id, deckCode.code] as const),
    ),
  );

  const data: CalendarDataType = {};

  for (const record of calendar.records) {
    const deck = deckById.get(record.deck_id);
    const eventKind = resolveEventKind(record);
    const display = resolveDisplay(
      record,
      eventKind,
      officialDisplayById,
      tonamelDisplayById,
      unofficialDisplayById,
    );

    pushEvent(data, toDateKey(record.created_at), {
      type: "record",
      record_id: record.id,
      deck_id: record.deck_id,
      deck_name: deck?.name ?? "",
      deck_pokemon_sprites: deck?.pokemon_sprites ?? [],
      deck_code: deckCodeById.get(record.deck_code_id) ?? "",
      event_kind: eventKind,
      event_title: display.title,
      chip_label: display.chip_label,
      chip_color: display.chip_color,
      accent_color_class: display.accent_color_class,
      venue_label: display.venue_label,
      created_at: String(record.created_at),
    });

    // 対戦結果は、紐づく記録と同じ表示情報(chip等)を持たせることで、
    // どの記録に紐づく対戦かをカード上で明示する
    for (const match of record.matches) {
      const firstGame = match.games?.[0];

      pushEvent(data, toDateKey(match.created_at), {
        type: "match_added",
        match_id: match.id,
        record_id: record.id,
        event_kind: eventKind,
        event_title: display.title,
        chip_label: display.chip_label,
        chip_color: display.chip_color,
        accent_color_class: display.accent_color_class,
        venue_label: display.venue_label,
        deck_name: deck?.name ?? "",
        deck_pokemon_sprites: deck?.pokemon_sprites ?? [],
        opponents_deck_info: match.opponents_deck_info,
        opponents_pokemon_sprites: match.pokemon_sprites ?? [],
        default_victory_flg: match.default_victory_flg,
        default_defeat_flg: match.default_defeat_flg,
        victory_flg: match.victory_flg,
        go_first: firstGame ? firstGame.go_first : null,
        your_prize_cards: firstGame ? firstGame.your_prize_cards : null,
        opponents_prize_cards: firstGame ? firstGame.opponents_prize_cards : null,
        memo: match.memo,
        created_at: String(match.created_at),
      });
    }
  }

  for (const deck of calendar.decks) {
    // カードの増減は直前のバージョンとの比較で出すため、登録順に並べておく
    const sortedDeckCodes = [...deck.deck_codes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // デッキ作成と同時刻に登録された初期バージョンは、別イベントにせず登録イベントにまとめる
    const initialCode = deck.deck_codes.find(
      (deckCode) => String(deckCode.created_at) === String(deck.created_at),
    );

    pushEvent(data, toDateKey(deck.created_at), {
      type: "deck_created",
      deck_id: deck.id,
      deck_name: deck.name,
      pokemon_sprites: deck.pokemon_sprites ?? [],
      code: initialCode?.code,
      created_at: String(deck.created_at),
    });

    if (deck.archived_at) {
      pushEvent(data, toDateKey(deck.archived_at), {
        type: "deck_archived",
        deck_id: deck.id,
        deck_name: deck.name,
        pokemon_sprites: deck.pokemon_sprites ?? [],
        created_at: String(deck.archived_at),
      });
    }

    for (const [index, deckCode] of sortedDeckCodes.entries()) {
      // 初期バージョンは登録イベントにまとめているため、ここでは出さない
      if (initialCode && deckCode.id === initialCode.id) continue;

      pushEvent(data, toDateKey(deckCode.created_at), {
        type: "deck_code_added",
        deck_id: deck.id,
        deck_name: deck.name,
        deck_code_id: deckCode.id,
        code: deckCode.code,
        // 初期バージョンも比較対象に含めるため、除外前の並びから直前を引く
        previous_code: sortedDeckCodes[index - 1]?.code ?? "",
        pokemon_sprites: deck.pokemon_sprites ?? [],
        created_at: String(deckCode.created_at),
      });
    }
  }

  // 同じ日の中は登録時刻の昇順で並べる
  for (const dateKey of Object.keys(data)) {
    data[dateKey].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return data;
}
