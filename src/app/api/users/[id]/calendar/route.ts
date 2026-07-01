import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { RecordGetResponseType, RecordType } from "@app/types/record";
import { DeckData, DeckGetResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { CalendarChipColor, CalendarDataType, CalendarEvent } from "@app/types/calendar";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";

import {
  cleanOfficialEventTitle,
  getEventAccentColor,
  getChipColor,
  getEventTypeName,
} from "@app/components/organisms/Record/officialEventHelpers";

import { toDateKey } from "@app/utils/calendar";

import * as jwt from "jsonwebtoken";

function makeToken(uid: string): string {
  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid,
  };
  return jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);
}

function resolveEventKind(
  data: RecordType["data"],
): "official" | "tonamel" | "unofficial" | "unknown" {
  if (data.official_event_id && data.official_event_id !== 0) return "official";
  if (data.tonamel_event_id) return "tonamel";
  if (data.unofficial_event_id) return "unofficial";
  return "unknown";
}

const UNKNOWN_TITLE = "(タイトル不明)";

// 記録カード(OfficialEventRecord/TonamelEventRecord/UnofficialEventRecord)の表示情報
type RecordEventDisplay = {
  title: string;
  chip_label: string;
  chip_color: CalendarChipColor;
  accent_color_class: string;
};

async function fetchOfficialEventDisplay(id: number): Promise<RecordEventDisplay> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const fallback: RecordEventDisplay = {
    title: UNKNOWN_TITLE,
    chip_label: "公式",
    chip_color: "default",
    accent_color_class: "bg-default-300",
  };

  try {
    const res = await fetch(`https://${domain}/api/v1beta/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return fallback;

    const event: OfficialEventGetByIdResponseType = await res.json();
    if (!event.title) return fallback;

    return {
      title: cleanOfficialEventTitle(event.title),
      chip_label: getEventTypeName(event),
      chip_color: getChipColor(event),
      accent_color_class: getEventAccentColor(event),
    };
  } catch {
    return fallback;
  }
}

// Tonamelイベントは一覧カード(TonamelEventRecord)と同じ固定の見た目(オレンジ系)にする
async function fetchTonamelEventDisplay(id: string): Promise<RecordEventDisplay> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const base = {
    chip_label: "Tonamel",
    chip_color: "warning" as CalendarChipColor,
    accent_color_class: "bg-orange-500",
  };

  try {
    const res = await fetch(`https://${domain}/api/v1beta/tonamel_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return { ...base, title: UNKNOWN_TITLE };

    const event: TonamelEventGetByIdResponseType = await res.json();
    return { ...base, title: event.title || UNKNOWN_TITLE };
  } catch {
    return { ...base, title: UNKNOWN_TITLE };
  }
}

// 記入形式イベントは一覧カード(UnofficialEventRecord)と同じ固定の見た目(グレー系)にする
async function fetchUnofficialEventDisplay(id: string): Promise<RecordEventDisplay> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const base = {
    chip_label: "記入形式",
    chip_color: "default" as CalendarChipColor,
    accent_color_class: "bg-default-400",
  };

  try {
    const res = await fetch(`https://${domain}/api/v1beta/unofficial_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return { ...base, title: UNKNOWN_TITLE };

    const event: UnofficialEventGetByIdResponseType = await res.json();
    return { ...base, title: event.title || UNKNOWN_TITLE };
  } catch {
    return { ...base, title: UNKNOWN_TITLE };
  }
}

async function buildEventDisplayMaps(records: RecordType["data"][]) {
  const officialIds = Array.from(
    new Set(
      records
        .filter((r) => resolveEventKind(r) === "official")
        .map((r) => r.official_event_id),
    ),
  );
  const tonamelIds = Array.from(
    new Set(
      records
        .filter((r) => resolveEventKind(r) === "tonamel")
        .map((r) => r.tonamel_event_id),
    ),
  );
  const unofficialIds = Array.from(
    new Set(
      records
        .filter((r) => resolveEventKind(r) === "unofficial")
        .map((r) => r.unofficial_event_id),
    ),
  );

  const [officialDisplays, tonamelDisplays, unofficialDisplays] = await Promise.all([
    Promise.all(officialIds.map((id) => fetchOfficialEventDisplay(id))),
    Promise.all(tonamelIds.map((id) => fetchTonamelEventDisplay(id))),
    Promise.all(unofficialIds.map((id) => fetchUnofficialEventDisplay(id))),
  ]);

  return {
    officialDisplayById: new Map(officialIds.map((id, i) => [id, officialDisplays[i]])),
    tonamelDisplayById: new Map(tonamelIds.map((id, i) => [id, tonamelDisplays[i]])),
    unofficialDisplayById: new Map(
      unofficialIds.map((id, i) => [id, unofficialDisplays[i]]),
    ),
  };
}

async function fetchAllRecords(token: string): Promise<RecordType["data"][]> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const results: RecordType["data"][] = [];
  let cursor = "";

  while (true) {
    const res = await fetch(
      `https://${domain}/api/v1beta/records?event_type=&deck_id=&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`failed to fetch records: ${res.status}`);
    }

    const ret: RecordGetResponseType = await res.json();
    if (ret.records.length === 0) break;

    results.push(...ret.records.map((r) => r.data));

    const last = ret.records[ret.records.length - 1];
    if (!last.cursor || last.cursor === cursor) break;
    cursor = last.cursor;
  }

  return results;
}

// `/decks/all` はアーカイブ済みデッキを含まないため、archived=true/false を明示的に
// 指定してページネーション取得し、両方をマージする
async function fetchDecksByArchived(
  token: string,
  archived: boolean,
): Promise<DeckData[]> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const results: DeckData[] = [];
  let cursor = "";

  while (true) {
    const res = await fetch(
      `https://${domain}/api/v1beta/decks?limit=10&archived=${archived}&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`failed to fetch decks(archived=${archived}): ${res.status}`);
    }

    const ret: DeckGetResponseType = await res.json();
    if (ret.decks.length === 0) break;

    results.push(...ret.decks.map((d) => d.data));

    const last = ret.decks[ret.decks.length - 1];
    if (!last.cursor || last.cursor === cursor) break;
    cursor = last.cursor;
  }

  return results;
}

async function fetchAllDecks(token: string): Promise<DeckData[]> {
  const [activeDecks, archivedDecks] = await Promise.all([
    fetchDecksByArchived(token, false),
    fetchDecksByArchived(token, true),
  ]);

  return [...activeDecks, ...archivedDecks];
}

// バックエンドの未設定(ゼロ値)日時はUnixエポック紀元前を表す年1になる規約
function isArchived(deck: DeckData): boolean {
  return new Date(deck.archived_at).getFullYear() !== 1;
}

async function fetchDeckCodesByDeckId(
  token: string,
  deckId: string,
): Promise<DeckCodeType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/decks/${deckId}/deckcodes`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch deckcodes for deck ${deckId}: ${res.status}`);
  }

  return res.json();
}

function pushEvent(data: CalendarDataType, dateKey: string, event: CalendarEvent) {
  if (!data[dateKey]) data[dateKey] = [];
  data[dateKey].push(event);
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
    const [records, decks] = await Promise.all([
      fetchAllRecords(token),
      fetchAllDecks(token),
    ]);

    const deckNameById = new Map(decks.map((deck) => [deck.id, deck.name]));

    const [deckCodesByDeck, eventDisplayMaps] = await Promise.all([
      Promise.all(decks.map((deck) => fetchDeckCodesByDeckId(token, deck.id))),
      buildEventDisplayMaps(records),
    ]);
    const { officialDisplayById, tonamelDisplayById, unofficialDisplayById } =
      eventDisplayMaps;

    const fallbackDisplay: RecordEventDisplay = {
      title: UNKNOWN_TITLE,
      chip_label: "記録",
      chip_color: "default",
      accent_color_class: "bg-default-300",
    };

    const data: CalendarDataType = {};

    for (const record of records) {
      const deckName = deckNameById.get(record.deck_id) ?? "不明なデッキ";
      const eventKind = resolveEventKind(record);
      const display =
        eventKind === "official"
          ? (officialDisplayById.get(record.official_event_id) ?? fallbackDisplay)
          : eventKind === "tonamel"
            ? (tonamelDisplayById.get(record.tonamel_event_id) ?? fallbackDisplay)
            : eventKind === "unofficial"
              ? (unofficialDisplayById.get(record.unofficial_event_id) ?? fallbackDisplay)
              : fallbackDisplay;

      pushEvent(data, toDateKey(record.created_at), {
        type: "record",
        record_id: record.id,
        deck_id: record.deck_id,
        deck_name: deckName,
        event_kind: eventKind,
        event_title: display.title,
        chip_label: display.chip_label,
        chip_color: display.chip_color,
        accent_color_class: display.accent_color_class,
        created_at: String(record.created_at),
      });
    }

    for (const deck of decks) {
      pushEvent(data, toDateKey(deck.created_at), {
        type: "deck_created",
        deck_id: deck.id,
        deck_name: deck.name,
        pokemon_sprites: deck.pokemon_sprites ?? [],
        created_at: String(deck.created_at),
      });

      if (isArchived(deck)) {
        pushEvent(data, toDateKey(deck.archived_at), {
          type: "deck_archived",
          deck_id: deck.id,
          deck_name: deck.name,
          pokemon_sprites: deck.pokemon_sprites ?? [],
          created_at: String(deck.archived_at),
        });
      }
    }

    decks.forEach((deck, index) => {
      for (const deckCode of deckCodesByDeck[index]) {
        pushEvent(data, toDateKey(deckCode.created_at), {
          type: "deck_code_added",
          deck_id: deck.id,
          deck_name: deck.name,
          deck_code_id: deckCode.id,
          code: deckCode.code,
          pokemon_sprites: deck.pokemon_sprites ?? [],
          created_at: String(deckCode.created_at),
        });
      }
    });

    for (const dateKey of Object.keys(data)) {
      data[dateKey].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "failed to build calendar" }, { status: 500 });
  }
}
