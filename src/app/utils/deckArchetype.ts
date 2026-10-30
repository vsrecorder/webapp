import { CityleagueResultType } from "@app/types/cityleague_result";
import {
  DeckArchetypeMap,
  DeckArchetypeType,
  RecentDeckArchetypesType,
} from "@app/types/deck_archetype";
import { DeckSummaryType } from "@app/types/deckcard";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { shiftDateString } from "@app/utils/cityleagueListPage";
import { isCityleagueListRank } from "@app/utils/cityleagueRank";
import { toJSTDateString } from "@app/utils/date";
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
 * 読み込み中の骨格(loading.tsx)で、入賞カードにデッキの種類の行を取っておくかの判定。
 *
 * 骨格の時点ではまだ大会のシーズン(cityleague_schedule_id)が分からないので、URL から分かる
 * 値で決める。旧シーズン(『30th CELEBRATION』環境より前)の大会にはスプライト・デッキ名・型が無く、
 * 行を取っておくと骨格だけに出て、実体に差し替わるときにカードが 1 枚あたり 100px 縮む。
 */

// 分類が付く最初のシーズン(2027s1)の初日。『30th CELEBRATION』環境(2026-09-16〜)の最初のシティリーグ
export const DECK_ARCHETYPE_FIRST_DATE = "2026-09-26";

// 開催日("YYYY-MM-DD")の大会にデッキ分類が付くか
export function isDeckArchetypeDate(dateParam: string | null | undefined): boolean {
  return !!dateParam && dateParam >= DECK_ARCHETYPE_FIRST_DATE;
}

/*
 * 公式イベントの ID がこれ以上なら、分類が付くシーズンの大会とみなす(個別ページの URL には ID しか無い)。
 *
 * ID は公式サイトがイベントの登録順に振るので、シーズンごとにまとまる。本番の結果で 2027s1 は
 * 1114995〜1140559(402件)、その前の 2026s3〜s4 は 953415 以下(1371件)で、重なりは無かった
 * (2026-10-30 実測)。境目はその間に置く。外れても骨格の行の有無がずれるだけ
 */
export const DECK_ARCHETYPE_FIRST_EVENT_ID = 1_000_000;

export function isDeckArchetypeEventId(officialEventId: number): boolean {
  return Number.isInteger(officialEventId) && officialEventId >= DECK_ARCHETYPE_FIRST_EVENT_ID;
}

/*
 * 大型大会(チャンピオンズリーグ等)のスケジュールにデッキ分類が付くか。
 *
 * 大型大会の ID はシーズンの年を含む("cl2027_yokohama"、"pjcs2026")。シティリーグと同じく
 * 2027 シーズン以降だけを対象にする。年が読めない ID は対象外
 */
export function isDeckArchetypeChampionsleague(scheduleId: string | null | undefined): boolean {
  const matched = /(\d{4})/.exec(scheduleId ?? "");

  return !!matched && Number(matched[1]) >= DECK_ARCHETYPE_FIRST_SEASON;
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
 * 照会したデッキコードのうち、応答の辞書に無いもの(vslab の索引にまだ載っていない)。
 *
 * 照会に失敗した(応答が無い)ときは呼ばない。失敗まで「載っていない」と数えると、
 * vslab が落ちている間に大会結果がまるごと見えなくなる。
 */
export function pendingDeckCodes(queried: string[], decks: DeckArchetypeMap): string[] {
  return normalizeDeckCodes(queried).filter((code) => !decks[code]);
}

/*
 * デッキ分類が揃うまで結果を出さずに待つ期間(開催日から何日前まで)。1 なら今日と昨日(JST)。
 *
 * 結果の取り込み(import-cityleague-result-job)は当日開催の大会を投入し、結果が公開されるまで
 * 同じ日の夕方から夜に取り直すので、登録はほぼ当日中、遅くても翌日になる。vslab の索引は
 * その 15〜35 分後に追いつく(索引の取り込みは :15 と :45)。
 *
 * 期間を区切るのは、索引に入らないまま終わる大会を永久に隠さないため。vslab の索引の取り込みは
 * 入賞デッキが 1 件でも取れないと大会ごと飛ばし、取り込み後のキャッシュ破棄が届かなければ
 * 「無い」という答えが最大 3 時間残る。期間を過ぎた大会は、分類が無くても従来どおり出す。
 */
export const DECK_ARCHETYPE_WAIT_DAYS = 1;

// 開催日(date)が、分類を待つ期間に入っているか。today は JST の今日 "YYYY-MM-DD"。
// 開催日が読めないときは期間外として扱う(隠さずに出す。日付の変換で一覧ごと落とさない)
export function isWithinDeckArchetypeWait(
  date: Date | string | null | undefined,
  today: string,
): boolean {
  if (date === null || date === undefined || Number.isNaN(new Date(date).getTime())) {
    return false;
  }

  return toJSTDateString(date) >= shiftDateString(today, -DECK_ARCHETYPE_WAIT_DAYS);
}

/*
 * その大会の結果を、デッキ分類が揃うまで出さずにおくか。
 *
 * 入賞デッキのどれかが「まだ分類できない」(pending)なら出さない。大会結果は vslab の索引より
 * 15〜35 分早く core-apiserver に入るので、その間に出すと種類の行が無いカードが並び、索引に
 * 載ったあとで種類の行が足されてカードが伸びる。結果の登録前と同じく、まだ無いものとして扱う。
 * 開催日が待つ期間(DECK_ARCHETYPE_WAIT_DAYS)を過ぎた大会は、分類が無くても出す。
 */
export function isAwaitingDeckArchetypes(
  eventResult: CityleagueResultType,
  pending: ReadonlySet<string>,
  today: string,
): boolean {
  if (pending.size === 0) return false;
  if (!isWithinDeckArchetypeWait(eventResult.date, today)) return false;

  // 入賞の配列が欠けた応答でも一覧ごと止めない
  return (eventResult.results ?? []).some((result) =>
    pending.has(result.deck_code?.trim() ?? ""),
  );
}

/*
 * 直近の判定(RecentDeckArchetypesType)で、その大会をまだ出さずにおくか。
 *
 * 開催日が待つ期間を過ぎていれば出す。期間内なら、判定で確かめられていて分類が揃っている
 * ときだけ出す(確かめられていない大会は、判定を作ったあとに登録されたもので、次の判定まで待つ)。
 * 判定が無い(作れなかった)ときは何も隠さない。期間の境目は判定を作った日で決めるので、
 * 端末の時計がずれていても画面ごとに食い違わない。
 */
export function isHiddenWhileAwaiting(
  officialEventId: number,
  date: Date | string | null | undefined,
  recent: Pick<RecentDeckArchetypesType, "today" | "checked" | "awaiting"> | null | undefined,
): boolean {
  if (!recent) return false;
  if (!isWithinDeckArchetypeWait(date, recent.today)) return false;

  return !recent.checked.includes(officialEventId) || recent.awaiting.includes(officialEventId);
}

// 分類が揃っている大会の結果だけを残す(並びは保つ)。today は JST の今日 "YYYY-MM-DD"
export function withoutAwaitingDeckArchetypes(
  eventResults: CityleagueResultType[],
  pending: string[],
  today: string,
): CityleagueResultType[] {
  const pendingSet = new Set(pending);

  return eventResults.filter(
    (eventResult) => !isAwaitingDeckArchetypes(eventResult, pendingSet, today),
  );
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
