import {
  SimilarDeckArchetypeType,
  SimilarDeckType,
  SimilarDecksGetResponseType,
  SimilarDecksSourceType,
} from "@app/types/similar_deck";

/*
 * 類似デッキ検索(バトラボ)まわりの純粋な変換。
 * 取得(サーバ側)は similarDecksServer.ts にあり、こちらはクライアントからも import できる。
 */

// バトラボの公開オリジン。画面から「バトラボで詳しく見る」で飛ぶ先(BFF は VSLAB_ORIGIN を見る)
export const VSLAB_PUBLIC_ORIGIN = "https://lab.vsrecorder.mobi";

// BFF のパス。デッキコードで引く(deckcards の各口と同じく、コード文字列が鍵)
export function similarDecksApiPath(code: string): string {
  return `/api/deckcards/${encodeURIComponent(code)}/similar`;
}

// バトラボの類似デッキ検索ページ(同じ検索を画面で見る)
export function vslabSimilarPageUrl(code: string, environmentId?: string | null): string {
  const query = new URLSearchParams({ deckCode: code });
  if (environmentId) query.set("env", environmentId);

  return `${VSLAB_PUBLIC_ORIGIN}/similar?${query.toString()}`;
}

// バトラボのデッキ種類ページ(採用カード・入賞デッキ)
export function vslabArchetypePageUrl(archetypeId: string, environmentId?: string | null): string {
  const query = environmentId ? `?env=${encodeURIComponent(environmentId)}` : "";

  return `${VSLAB_PUBLIC_ORIGIN}/archetypes/${encodeURIComponent(archetypeId)}${query}`;
}

// 大会日を「9/26」の短い形にする(シートの 1 行に日付・都道府県・順位を並べるため)。読めない値は空文字
const JST_MONTH_DAY = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
});

export function formatEventDateShort(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : JST_MONTH_DAY.format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/*
 * スプライトの画像 URL から図鑑 ID を戻す。
 *
 * バトラボの類似デッキ検索は種類のスプライトを画像 URL(spriteUrls)で返す。
 * "…/pokemon-sprites/887.png" のように先頭の 0 を落とした形なので、こちらの ID
 * ("0887" の 4 桁)に戻して DeckSprites に渡す(spriteImageUrl が再び 0 を落とす)。
 * 地方の姿などの "25_alola.png" は数字の後ろをそのまま残す。
 * 応答に sprites(ID そのもの)が付くようになればそちらを優先する
 */
export function spriteIdFromUrl(url: string): string | null {
  const matched = /\/0*(\d+)(_[^/.]+)?\.png$/.exec(url);
  if (!matched) return null;

  return `${matched[1].padStart(4, "0")}${matched[2] ?? ""}`;
}

function parseArchetype(value: unknown): SimilarDeckArchetypeType {
  if (!isRecord(value)) return { archetypeId: null, label: null, sprites: [] };

  const sprites = Array.isArray(value.sprites)
    ? stringList(value.sprites)
    : stringList(value.spriteUrls)
        .map(spriteIdFromUrl)
        .filter((id): id is string => id !== null);

  return {
    archetypeId: stringOrNull(value.archetypeId),
    label: stringOrNull(value.label),
    sprites,
  };
}

function parseSimilarDeck(value: unknown): SimilarDeckType | null {
  if (!isRecord(value)) return null;
  if (typeof value.deckCode !== "string" || value.deckCode === "") return null;
  if (typeof value.similarity !== "number" || !Number.isFinite(value.similarity)) return null;

  const eventDate = typeof value.eventDate === "string" ? value.eventDate : "";

  return {
    // 古い応答(entryId が無い)はデッキコードと大会日で代える
    entryId:
      typeof value.entryId === "string" && value.entryId !== ""
        ? value.entryId
        : `${value.deckCode}|${eventDate}`,
    deckCode: value.deckCode,
    similarity: Math.min(1, Math.max(0, value.similarity)),
    eventDate,
    prefectureName: typeof value.prefectureName === "string" ? value.prefectureName : "",
    leagueName: typeof value.leagueName === "string" ? value.leagueName : "",
    rank: typeof value.rank === "number" ? value.rank : 0,
    diffIn: stringList(value.diffIn),
    diffOut: stringList(value.diffOut),
    archetype: parseArchetype(value.deckType),
    sameArchetype: value.sameArchetype === true,
    sameCode: value.sameCode === true,
  };
}

function parseSource(value: unknown): SimilarDecksSourceType | null {
  if (!isRecord(value)) return null;
  if (typeof value.deckCode !== "string" || value.deckCode === "") return null;

  const unresolved = Array.isArray(value.unresolved)
    ? value.unresolved
        .filter(isRecord)
        .filter((c) => typeof c.name === "string")
        .map((c) => ({
          name: c.name as string,
          count: typeof c.count === "number" ? c.count : 0,
        }))
    : [];

  return {
    deckCode: value.deckCode,
    origin: value.origin === "cityleague" ? "cityleague" : "external",
    environmentId: typeof value.environmentId === "string" ? value.environmentId : "",
    environmentTitle: typeof value.environmentTitle === "string" ? value.environmentTitle : "",
    archetype: parseArchetype(value.deckType),
    archetypeSkipped: value.deckTypeSkipped === true,
    placements: typeof value.placements === "number" ? value.placements : 0,
    unresolved,
  };
}

/*
 * BFF(/api/deckcards/{code}/similar)の応答を読む。クライアント用。
 *
 * BFF はバトラボの応答を parseSimilarDecksResponse で表示用の形に直してから返す。
 * クライアントでもう一度 parseSimilarDecksResponse を通してはいけない。バトラボの形
 * (種類は deckType)を前提にしているので、表示用の形(種類は archetype)を通すと種類が
 * 読めず、すべてのデッキが「デッキ名：不明」・スプライト無しになる(実際に起きた)。
 * ここでは形を確かめるだけで、中身は組み替えない
 */
export function readSimilarDecksBody(body: unknown): SimilarDecksGetResponseType | null {
  if (!isRecord(body) || !isRecord(body.source)) return null;
  if (typeof body.source.deckCode !== "string" || !isRecord(body.source.archetype)) return null;
  if (!Array.isArray(body.similar)) return null;

  return body as SimilarDecksGetResponseType;
}

/*
 * バトラボの GET /api/similar の応答を、表示に使う形にする。サーバ(BFF)用。
 * 形が合わなければ null(呼び出し側が「取れなかった」として扱う)。
 * 一覧の 1 件が壊れていても、その 1 件だけ落として残りは出す
 */
export function parseSimilarDecksResponse(body: unknown): SimilarDecksGetResponseType | null {
  if (!isRecord(body)) return null;

  const source = parseSource(body.source);
  if (!source) return null;

  const similar = Array.isArray(body.similar)
    ? body.similar.map(parseSimilarDeck).filter((d): d is SimilarDeckType => d !== null)
    : [];

  return {
    source,
    similar,
    candidates: typeof body.candidates === "number" ? body.candidates : similar.length,
  };
}
