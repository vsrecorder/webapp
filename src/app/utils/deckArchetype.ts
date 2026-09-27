import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckArchetypeMap, DeckArchetypeType } from "@app/types/deck_archetype";
import { DeckSummaryType } from "@app/types/deckcard";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { isCityleagueListRank } from "@app/utils/cityleagueRank";
import { formatMainPokemon } from "@app/utils/deckSummary";

/*
 * 入賞デッキの種類(デッキ分類)まわりの純粋な変換。
 * 取得(サーバ側)は deckArchetypeServer.ts にあり、こちらはクライアントからも import できる。
 */

/*
 * バトラボ(vslab)がデッキ分類を提供する最初のシーズン。
 *
 * vslab は 2027 シーズン(cityleague_schedule_id が 2027s1 以降、2026-09-26〜)の大会結果だけを
 * 扱い、それより前のデッキコードは索引にあっても「無い」と答える(vslab の service-scope.ts)。
 * 旧シーズンの個別ページは数千ページあり検索エンジンからの流入も多いので、答えが無いと
 * 分かっている照会はこちらで止める。vslab 側の FIRST_SEASON を動かすときはここも合わせる。
 */
export const DECK_ARCHETYPE_FIRST_SEASON = 2027;

// vslab が 1 回の照会で受け付けるデッキコードの上限(vslab の MAX_DECK_CODES と同じ)
export const DECK_ARCHETYPE_CODES_PER_REQUEST = 100;

// デッキコードとして通す形(vslab の DECK_CODE_RE と同じ)。
// 実データは英数字 6 文字 × 3 を "-" で繋いだ 20 文字だが、桁数の違う古い形式を弾かないよう緩めにしてある
export const DECK_CODE_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

// "2027s1" → 2027。形が違えば null
export function seasonYearOfScheduleId(scheduleId: string | null | undefined): number | null {
  const matched = /^(\d{4})s\d+$/.exec(scheduleId ?? "");

  return matched ? Number(matched[1]) : null;
}

// そのシーズンの大会結果にデッキ分類が付くか
export function isDeckArchetypeSeason(scheduleId: string | null | undefined): boolean {
  const year = seasonYearOfScheduleId(scheduleId);

  return year !== null && year >= DECK_ARCHETYPE_FIRST_SEASON;
}

/*
 * 一覧(CityleagueResult)に載る入賞のデッキコードを、分類を提供しているシーズンのイベントから
 * 集める(重複なし)。9位以下は一覧に載らないので取らない(1日ぶんで半分の本数で済む)。
 */
export function collectListedDeckCodes(eventResults: CityleagueResultType[]): string[] {
  const codes = new Set<string>();

  for (const eventResult of eventResults) {
    if (!isDeckArchetypeSeason(eventResult.cityleague_schedule_id)) continue;

    for (const result of eventResult.results) {
      if (!isCityleagueListRank(result.rank)) continue;
      if (result.deck_code) codes.add(result.deck_code);
    }
  }

  return [...codes];
}

/*
 * 形の正しいデッキコードだけを、重複を除いて辞書順に並べる。
 *
 * 並びを揃えるのは、同じ組み合わせを違う順で頼まれても同じ塊に分かれるようにするため。
 * 塊ごとの URL が同じになれば、こちらの Data Cache も vslab 側のキャッシュも 1 回で当たる。
 */
export function normalizeDeckCodes(codes: string[]): string[] {
  const valid = codes.map((code) => code.trim()).filter((code) => DECK_CODE_PATTERN.test(code));

  return [...new Set(valid)].sort();
}

// 1 回の照会の上限ごとに分ける
export function chunkDeckCodes(
  codes: string[],
  size: number = DECK_ARCHETYPE_CODES_PER_REQUEST,
): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < codes.length; index += size) {
    chunks.push(codes.slice(index, index + size));
  }

  return chunks;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

// vslab の応答の decks の 1 項目から、表示に使う項目だけを取り出す。形が違えば null
function parseDeckArchetype(deckCode: string, value: unknown): DeckArchetypeType | null {
  if (!value || typeof value !== "object") return null;

  const entry = value as Record<string, unknown>;

  if (
    !isStringOrNull(entry.archetypeName ?? null) ||
    !isStringOrNull(entry.variantName ?? null) ||
    !isStringOrNull(entry.label ?? null)
  ) {
    return null;
  }

  const sprites = Array.isArray(entry.sprites)
    ? entry.sprites.filter((id): id is string => typeof id === "string" && id !== "")
    : [];

  return {
    deckCode,
    archetypeName: (entry.archetypeName as string | null) ?? null,
    variantName: (entry.variantName as string | null) ?? null,
    label: (entry.label as string | null) ?? null,
    sprites,
  };
}

/*
 * vslab の応答(GET /api/archetypes/classify)から、デッキコード → 種類の辞書を組み立てる。
 *
 * 未分類(索引にあるがどの主デッキにも当たらない)は label が null の項目として残す。
 * 索引に無いコード(notFound)は応答の decks に入っていないので、辞書にも入らない。
 * 形が違う項目は捨てる(vslab 側の変更で全体が落ちないように)。
 */
export function parseDeckArchetypeResponse(body: unknown): DeckArchetypeMap {
  const decks =
    body && typeof body === "object" ? (body as { decks?: unknown }).decks : undefined;

  if (!decks || typeof decks !== "object" || Array.isArray(decks)) return {};

  const map: DeckArchetypeMap = {};

  for (const [deckCode, value] of Object.entries(decks as Record<string, unknown>)) {
    if (!DECK_CODE_PATTERN.test(deckCode)) continue;

    const archetype = parseDeckArchetype(deckCode, value);
    if (archetype) map[deckCode] = archetype;
  }

  return map;
}

/*
 * 入賞デッキを自分のデッキとして登録するときの初期値(デッキ名・アイコン)を、分類から作る。
 *
 * 入賞カードの「このデッキコードでデッキを登録」で開く登録モーダルに渡す。名前は主デッキ名
 * (「ドラパルトex」)だけで、型名(「バシャーモ型」)は含めない。自分のデッキの名前としては
 * 型まで付くと長く、同じ主デッキの別の型を登録したときに名前が割れるため。アイコンは分類の
 * スプライトを 1 枠目・2 枠目に入れる(デッキのアイコンは 2 枠なので 3 体以上の定義でも
 * 先頭 2 体だけ)。どちらも登録前に利用者が変えられる。分類が無い・未分類のときは空で、
 * これまでどおり自分で入れる。
 *
 * 名前の空白は 1 つに詰める。定義側で 2 つ続いているものがあり、そのまま入れると
 * デッキ名に不自然な空きが残るため。
 */
export function deckArchetypeToDeckDraft(archetype: DeckArchetypeType | undefined): {
  name: string;
  sprites: DeckPokemonSpriteType[];
} {
  if (!archetype?.archetypeName) return { name: "", sprites: [] };

  return {
    name: archetype.archetypeName.replace(/\s+/g, " ").trim(),
    sprites: archetype.sprites.slice(0, 2).map((id, index) => ({ id, position: index + 1 })),
  };
}

/*
 * 入賞デッキを文章の中で呼ぶときの名前。大会の個別ページの冒頭(要約文・順位ごとのデッキ一覧)で使う。
 *
 * デッキ分類(バトラボ)の名前を優先し、型名は括弧で囲む(「ドラパルトex(バシャーモ型)」)。
 * 一覧では「 / 」で区切って並べるので、主デッキ名と型名が空白で並ぶと、どこまでが 1 つのデッキか
 * 読み取りにくいため。分類が無い(2027 シーズンより前・vslab の索引に無い)か未分類のときは、
 * カード内訳から選んだ主なポケモン(「ヨマワル・ヨノワール」)で呼ぶ。未分類で「デッキ名：不明」と
 * 書くより、何のデッキかの目安になるため。どちらも無ければ空文字(呼び出し側が省く)。
 * 名前の空白は 1 つに詰める(定義側で 2 つ続くものがある)。
 */
export function deckDisplayName(
  archetype: DeckArchetypeType | undefined,
  summary: DeckSummaryType | undefined,
): string {
  const tidy = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

  const name = archetype?.label ? tidy(archetype.archetypeName) : "";
  if (name) {
    const variant = tidy(archetype?.variantName);
    return variant ? `${name}(${variant})` : name;
  }

  return formatMainPokemon(summary?.mainPokemon ?? []);
}
