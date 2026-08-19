import { CityleagueResultGetEventsResponseType } from "@app/types/cityleague_result";
import { CityleagueResultType } from "@app/types/cityleague_result";
import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { OfficialEventResponseType, OfficialEventType } from "@app/types/official_event";

// 過去イベントの結果は確定後に変わらないため、長めにキャッシュする。
const REVALIDATE_SECONDS = 60 * 60 * 24;

// 公式イベント種別のうち「シティリーグ」を指すID。
const OFFICIAL_EVENT_TYPE_ID_CITYLEAGUE = 2;

function coreApiUrl(path: string): string {
  return `https://${process.env.VSRECORDER_DOMAIN}${path}`;
}

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(coreApiUrl(path), {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  // 404 は「本当に存在しない」ので null を返し、呼び出し元の notFound() に流す。
  if (res.status === 404) return null;

  // それ以外の失敗は一時的な障害の可能性がある。ここで null を返すと notFound() に
  // 流れ、生きているページが noindex 付きで返る。noindex は 404 や 500 と違って
  // 「意図的にインデックスするな」という指示なので、障害中にクロールされた分だけ
  // 検索結果から外れてしまう。例外にして 500 を返し、クローラに再訪させる。
  if (!res.ok) {
    throw new Error(`core-apiserver responded ${res.status}: ${path}`);
  }

  return res.json();
}

export async function getOfficialEventById(
  id: number,
): Promise<OfficialEventType | null> {
  const ret = await getJson<OfficialEventType>(`/api/v1beta/official_events/${id}`);

  return ret?.id ? ret : null;
}

export async function getCityleagueResultByOfficialEventId(
  id: number,
): Promise<CityleagueResultType | null> {
  const ret = await getJson<CityleagueResultType>(
    `/api/v1beta/cityleague_results?official_event_id=${id}`,
  );

  // 入賞者が1人もいないイベントは表示するものが無いため、存在しない扱いにする。
  return ret?.results?.length ? ret : null;
}

export type CityleagueEventRef = {
  id: number;
  date: string;
};

// 結果が登録されている全イベントを返す。sitemap と各ハブページの絞り込みに使う。
// 入賞者まで返す /cityleague_results は全期間で十数MBに達するため、イベント単位に畳んだ
// /cityleague_results/events を使う。league_type を省略すると全リーグが対象になる。
export async function getAllCityleagueEventRefs(): Promise<CityleagueEventRef[]> {
  const ret = await getJson<CityleagueResultGetEventsResponseType>(
    `/api/v1beta/cityleague_results/events`,
  );

  return (ret?.events ?? []).map((event) => ({
    id: event.official_event_id,
    date: String(event.date),
  }));
}

// 期間で区切られたグルーピングの軸。シーズン（cityleague_schedules）と環境（environments）は
// どちらも id / title / from_date / to_date を持つため、同じ形で扱える。
export type CityleagueTerm = {
  id: string;
  title: string;
  from_date: Date;
  to_date: Date;
};

export async function getCityleagueSeasons(): Promise<CityleagueTerm[]> {
  const ret = await getJson<CityleagueScheduleType[]>(`/api/v1beta/cityleague_schedules`);

  return ret ?? [];
}

export async function getEnvironments(): Promise<CityleagueTerm[]> {
  const ret = await getJson<EnvironmentType[]>(`/api/v1beta/environments`);

  return ret ?? [];
}

function toDateOnly(date: Date | string): string {
  return new Date(date).toISOString().split("T")[0];
}

async function getOfficialEventsByTerm(
  fromDate: Date | string,
  toDate: Date | string,
): Promise<OfficialEventType[]> {
  const ret = await getJson<OfficialEventResponseType>(
    `/api/v1beta/official_events?type_id=${OFFICIAL_EVENT_TYPE_ID_CITYLEAGUE}` +
      `&start_date=${toDateOnly(fromDate)}&end_date=${toDateOnly(toDate)}`,
  );

  return ret?.official_events ?? [];
}

/**
 * 期間内の、結果が登録済みのシティリーグを開催日の新しい順に返す。
 *
 * official_events は店舗名や都道府県を持つが結果の有無を知らず、cityleague_results は
 * 結果の有無を知るが店舗名を持たない。両者を突き合わせることで、結果ページが存在する
 * イベントだけをリンクできる（結果が無いイベントの詳細ページは 404 になるため）。
 */
export async function getCityleagueEventsInTerm(
  fromDate: Date | string,
  toDate: Date | string,
): Promise<OfficialEventType[]> {
  const [officialEvents, eventRefs] = await Promise.all([
    getOfficialEventsByTerm(fromDate, toDate),
    getAllCityleagueEventRefs(),
  ]);

  const idsWithResults = new Set(eventRefs.map((ref) => ref.id));

  return officialEvents
    .filter((event) => idsWithResults.has(event.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 結果が登録済みのシティリーグを、新しい順に limit 件返す。
 *
 * 一覧トップから個別ページへ直接リンクするために使う。一覧のタブは結果そのものを
 * その場で展開する作りで個別ページへのリンクを持たないため、ここが個別ページへの
 * 最も浅い入口になる（トップ → 一覧 → 個別 の深さ2）。
 */
export async function getLatestCityleagueEvents(
  limit: number,
): Promise<OfficialEventType[]> {
  const eventRefs = await getAllCityleagueEventRefs();

  if (eventRefs.length === 0) return [];

  // 結果の登録は開催から数日遅れるうえ、シーズンの合間は開催自体が無い。
  // 今日を起点にすると空振りするため、結果がある最新の開催日を起点にする。
  const latestTime = eventRefs.reduce(
    (max, ref) => Math.max(max, new Date(ref.date).getTime()),
    0,
  );
  const latestDate = new Date(latestTime);

  // シティリーグは週末に集中するため、90日遡れば limit 件はまず満たせる。
  const fromDate = new Date(latestTime);
  fromDate.setDate(fromDate.getDate() - 90);

  const events = await getCityleagueEventsInTerm(fromDate, latestDate);

  return events.slice(0, limit);
}

/**
 * 指定イベントと同じ月に開催された、結果が登録済みの他のシティリーグを limit 件返す。
 *
 * 個別ページ同士を横に繋ぐために使う。これが無いと個別ページへの内部リンクは
 * 開催月ハブからの1本だけになり、クローラが個別ページ間を辿れない。
 */
export async function getRelatedCityleagueEvents(
  event: OfficialEventType,
  limit: number,
): Promise<OfficialEventType[]> {
  const term = monthKeyToTerm(toMonthKey(event.date));

  if (!term) return [];

  const events = await getCityleagueEventsInTerm(term.fromDate, term.toDate);

  return events.filter((related) => related.id !== event.id).slice(0, limit);
}

type TermBounds = {
  term: CityleagueTerm;
  from: string;
  to: string;
};

/*
 * 期間の境界を "YYYY-MM-DD" に正規化した結果を、期間配列ごとに覚えておく。
 *
 * findTermByDate はイベント1件ごとに呼ばれるため、素直に書くと同じ期間の境界を
 * イベント件数ぶん計算し直すことになる（実測: 7,802件 × 環境31件 × 2 = 48万回の
 * Date 生成で約97ms、シーズンで約59ms）。境界は期間配列が同じなら変わらないので、
 * 1度だけ求めて使い回す。
 *
 * キーを期間配列そのものにしているのは、配列が取得のたびに作り直されるため。
 * WeakMap にしておけば配列が捨てられた時点でこちらも回収される。
 */
const termBoundsCache = new WeakMap<CityleagueTerm[], TermBounds[]>();

function getTermBounds(terms: CityleagueTerm[]): TermBounds[] {
  const cached = termBoundsCache.get(terms);
  if (cached) return cached;

  const bounds = terms.map((term) => ({
    term,
    from: toDateOnly(term.from_date),
    to: toDateOnly(term.to_date),
  }));
  termBoundsCache.set(terms, bounds);

  return bounds;
}

// 期間の配列から、指定日を含むものを返す。シーズン・環境の判定に使う。
export function findTermByDate(
  terms: CityleagueTerm[],
  date: Date | string,
): CityleagueTerm | undefined {
  const target = toDateOnly(date);

  return getTermBounds(terms).find(
    (bounds) => bounds.from <= target && target <= bounds.to,
  )?.term;
}

// "2026-04-30T00:00:00+09:00" -> "2026-04"（JSTでの年月）
export function toMonthKey(date: Date | string): string {
  return formatInJst(date, { year: "numeric", month: "2-digit" }).replace("/", "-");
}

// "2026-04" -> その月の初日と末日
export function monthKeyToTerm(
  monthKey: string,
): { fromDate: string; toDate: string } | null {
  const matched = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (month < 1 || month > 12) return null;

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    fromDate: `${matched[1]}-${matched[2]}-01`,
    toDate: `${matched[1]}-${matched[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

// "2026-04" -> "2026年4月"
export function formatMonthKey(monthKey: string): string {
  const matched = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!matched) return monthKey;

  return `${matched[1]}年${Number(matched[2])}月`;
}

/*
 * 書式ごとの Intl.DateTimeFormat を使い回すためのキャッシュ。
 *
 * toLocaleDateString は呼び出しのたびに内部で Intl.DateTimeFormat を作る。
 * 開催月ハブは 7,802件のイベント全件に対して toMonthKey を呼ぶため、この生成コストが
 * そのままページの表示時間になっていた（実測: この集計だけで約420ms、本番の TTFB は約2秒）。
 * 書式は数種類しかないので、1つ作って使い回す。
 *
 * キーに JSON 文字列を使えるのは、呼び出し側が固定のオブジェクトリテラルを渡すため。
 */
const jstFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatInJst(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const cacheKey = JSON.stringify(options);

  let formatter = jstFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      ...options,
    });
    jstFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(new Date(date));
}

export function formatEventDate(date: Date | string): string {
  return formatInJst(date, { year: "numeric", month: "long", day: "numeric" });
}

export function formatTermRange(term: CityleagueTerm): string {
  return `${formatEventDate(term.from_date)} 〜 ${formatEventDate(term.to_date)}`;
}
