import {
  SimilarDeckArchetypeType,
  SimilarDeckType,
  SimilarDecksGetResponseType,
  SimilarDecksSourceType,
} from "@app/types/similar_deck";

import { toJSTDateString } from "@app/utils/date";

/*
 * 類似デッキ検索(バトラボ)まわりの純粋な変換。
 * 取得(サーバ側)は similarDecksServer.ts にあり、こちらはクライアントからも import できる。
 */

// バトラボの公開オリジン。画面から「バトラボで詳しく見る」で飛ぶ先(BFF は VSLAB_ORIGIN を見る)
export const VSLAB_PUBLIC_ORIGIN = "https://lab.vsrecorder.mobi";

// BFF のパス。デッキコードで引く(deckcards の各口と同じく、コード文字列が鍵)。
// date(JST の暦日 YYYY-MM-DD)を添えると、その日の環境の入賞デッキと比べる
// (みんなの公開デッキは投稿された日の環境で比べる)
export function similarDecksApiPath(code: string, date?: string | null): string {
  const path = `/api/deckcards/${encodeURIComponent(code)}/similar`;

  return date ? `${path}?date=${encodeURIComponent(date)}` : path;
}

/*
 * 類似デッキを使える最初の日(JST の暦日)。環境『30th CELEBRATION』(m6a)の開始日。
 *
 * バトラボは 2027 シーズン(『30th CELEBRATION』)以降の入賞デッキしか扱わない。それより前の
 * 環境のデッキ(その頃に公開された投稿・その頃の大会の入賞デッキ)は同じ環境の比べる相手が
 * いないので、類似デッキのボタンを出さない(2026-09-29 に運営者の指示で制限した)。
 * 自分のデッキは常に今の環境と比べるので、この制限は掛けない
 */
export const SIMILAR_DECKS_FIRST_DATE = "2026-09-16";

// その日(JST の暦日 YYYY-MM-DD)のデッキで類似デッキを使えるか
export function isSimilarDecksAvailableOn(date: string): boolean {
  return date >= SIMILAR_DECKS_FIRST_DATE;
}

// date の形(YYYY-MM-DD)
export const SIMILAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/*
 * JST の暦日(YYYY-MM-DD)が属する環境。開始日がその日以前の環境のうち、いちばん新しいもの。
 *
 * core-apiserver の GET /environments?date=(Environment.FindByDate)と同じ規則にそろえる。
 * 終了日では区切らない(次の環境が始まるまでは前の環境が続く扱い)。開始日は JST の暦日で
 * 比べる(バックエンドは "2026-09-16T00:00:00+09:00" の形で返す)。当たらなければ null
 */
export function environmentOnDate<T extends { from_date: Date | string }>(
  environments: T[],
  date: string,
): T | null {
  let found: T | null = null;
  let foundFrom = "";

  for (const env of environments) {
    const from = toJSTDateString(env.from_date);
    if (from <= date && from > foundFrom) {
      found = env;
      foundFrom = from;
    }
  }

  return found;
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
 * デッキの種類の表示名。型名は括弧で囲む(「ドラパルトex(バシャーモ型)」)。
 *
 * バトラボの label は「ドラパルトex バシャーモ型」と空白で並べただけなので、どこまでが
 * 主デッキ名か読み取りにくい。シティリーグ結果の入賞デッキ(deckDisplayName)と同じ形にそろえる。
 * 主デッキ名の無い古い応答は label をそのまま使う。未分類なら null(呼び出し側が「デッキ名：不明」)。
 * 名前の空白は 1 つに詰める(定義側で 2 つ続くものがある)。
 */
export function similarDeckArchetypeName(archetype: SimilarDeckArchetypeType): string | null {
  const tidy = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

  const name = tidy(archetype.archetypeName);
  if (name) {
    const variant = tidy(archetype.variantName);
    return variant ? `${name}(${variant})` : name;
  }

  return tidy(archetype.label) || null;
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
  if (!isRecord(value)) {
    return { archetypeId: null, archetypeName: null, variantName: null, label: null, sprites: [] };
  }

  const sprites = Array.isArray(value.sprites)
    ? stringList(value.sprites)
    : stringList(value.spriteUrls)
        .map(spriteIdFromUrl)
        .filter((id): id is string => id !== null);

  return {
    archetypeId: stringOrNull(value.archetypeId),
    archetypeName: stringOrNull(value.archetypeName),
    variantName: stringOrNull(value.variantName),
    label: stringOrNull(value.label),
    sprites,
  };
}

/*
 * カード名 → カード画像の URL。バトラボが差分カードのぶんだけ添えてくる。
 * 文字列でない値と、画像として読み込めない値(http(s) 以外)は落とす
 */
function parseImages(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  const images: Record<string, string> = {};
  for (const [name, url] of Object.entries(value)) {
    if (typeof url === "string" && /^https?:\/\//.test(url)) images[name] = url;
  }

  return images;
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
    // 同じカードリストの入賞か。sameList を返す前のバトラボ(同じデッキコードだけを見ていた)の
    // 応答は sameCode で代える。同じコードなら必ず同じリスト
    sameList: typeof value.sameList === "boolean" ? value.sameList : value.sameCode === true,
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
    images: parseImages(body.images),
  };
}
