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

  if (!res.ok) return null;

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

// 期間の配列から、指定日を含むものを返す。シーズン・環境の判定に使う。
export function findTermByDate(
  terms: CityleagueTerm[],
  date: Date | string,
): CityleagueTerm | undefined {
  const target = toDateOnly(date);

  return terms.find(
    (term) => toDateOnly(term.from_date) <= target && target <= toDateOnly(term.to_date),
  );
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

function formatInJst(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    ...options,
  });
}

export function formatEventDate(date: Date | string): string {
  return formatInJst(date, { year: "numeric", month: "long", day: "numeric" });
}

export function formatTermRange(term: CityleagueTerm): string {
  return `${formatEventDate(term.from_date)} 〜 ${formatEventDate(term.to_date)}`;
}
