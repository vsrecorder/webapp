import {
  ChampionsleagueResultEventType,
  ChampionsleagueResultGetByScheduleIdResponseType,
  ChampionsleagueResultGetEventsResponseType,
} from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { OfficialEventType } from "@app/types/official_event";
import { getJson } from "@app/utils/coreApi";
import { getOfficialEventById } from "@app/utils/cityleague";
import { cityleagueLeagueTitle } from "@app/utils/cityleagueRank";

/*
 * 大型大会（チャンピオンズリーグ / PJCS）の結果を core-apiserver から引く。
 *
 * シティリーグと違い、閲覧の単位は「店舗ごとのイベント」ではなく「大会」。
 * 1大会が リーグ区分（マスター/シニア/ジュニア/オープン）× Day で数イベントに
 * 分かれており、それらをまとめて1ページで見せるため、取得も大会ID単位で行う。
 */

// 全期間でも数十イベントしか無いので、イベント一覧は常に全件引く。
export async function getChampionsleagueEventRefs(): Promise<
  ChampionsleagueResultEventType[]
> {
  const ret = await getJson<ChampionsleagueResultGetEventsResponseType>(
    `/api/v1beta/championsleague_results/events`,
  );

  return ret?.events ?? [];
}

export async function getChampionsleagueSchedules(): Promise<
  ChampionsleagueScheduleType[]
> {
  const ret = await getJson<ChampionsleagueScheduleType[]>(
    `/api/v1beta/championsleague_schedules`,
  );

  return ret ?? [];
}

export async function getChampionsleagueScheduleById(
  id: string,
): Promise<ChampionsleagueScheduleType | null> {
  const ret = await getJson<ChampionsleagueScheduleType>(
    `/api/v1beta/championsleague_schedules/${encodeURIComponent(id)}`,
  );

  return ret?.id ? ret : null;
}

/**
 * 大会の結果を取得する。
 *
 * leagueType を渡すとその区分だけに絞る（区分ごとのページ用）。省略すると全区分を返す
 * （大会ページの区分一覧で、各区分の優勝者を出すのに使う）。
 * 結果が未公開の大会・区分は core-apiserver が 404 を返すため null になる。
 */
export async function getChampionsleagueResultsByScheduleId(
  id: string,
  leagueType?: number,
): Promise<ChampionsleagueResultGetByScheduleIdResponseType | null> {
  const ret = await getJson<ChampionsleagueResultGetByScheduleIdResponseType>(
    `/api/v1beta/championsleague_results?championsleague_schedule_id=${encodeURIComponent(id)}` +
      (leagueType ? `&league_type=${leagueType}` : ""),
  );

  return ret?.event_results?.length ? ret : null;
}

export type ChampionsleagueScheduleSummary = {
  schedule: ChampionsleagueScheduleType;
  // 結果が登録されているイベント数（リーグ区分 × Day）
  eventCount: number;
};

/**
 * 結果が登録済みの大会を、開催日の新しい順に返す。
 *
 * championsleague_schedules は先の（まだ開催していない）大会も持つため、
 * 結果のあるイベントと突き合わせて「いま開けるページ」だけに絞る。
 */
export async function getChampionsleagueScheduleSummaries(): Promise<
  ChampionsleagueScheduleSummary[]
> {
  const [schedules, events] = await Promise.all([
    getChampionsleagueSchedules(),
    getChampionsleagueEventRefs(),
  ]);

  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(
      event.championsleague_schedule_id,
      (counts.get(event.championsleague_schedule_id) ?? 0) + 1,
    );
  }

  return schedules
    .filter((schedule) => (counts.get(schedule.id) ?? 0) > 0)
    .sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())
    .map((schedule) => ({ schedule, eventCount: counts.get(schedule.id) ?? 0 }));
}

// 大会ページの各イベントに添える公式イベント情報。
// リーグ区分と開催日だけでは Day1 / Day2 の別が見出しに載らないため、
// official_events の大会名（例「… マスターリーグDay2」）を使う。
// 1大会あたり数件しか無いので並列に引く。取れなかったものは null にして
// 呼び出し側でリーグ区分＋開催日の見出しへフォールバックする。
export async function getOfficialEventsByIds(
  ids: number[],
): Promise<Record<number, OfficialEventType>> {
  const unique = [...new Set(ids)];

  const events = await Promise.all(
    unique.map((id) => getOfficialEventById(id).catch(() => null)),
  );

  const byId: Record<number, OfficialEventType> = {};
  unique.forEach((id, index) => {
    const event = events[index];
    if (event) byId[id] = event;
  });

  return byId;
}

// リーグ区分の名称は official_events.league_title と同じ区分なので、シティリーグ側と共有する。
export function championsleagueLeagueTitle(leagueType: number): string {
  return cityleagueLeagueTitle(leagueType);
}

/*
 * リーグ区分のURL。
 *
 * 大会ページは区分ごとに分ける（マスターだけを見に来た人に他区分まで読み込ませない）。
 * URLには league_type の数字ではなく区分名を使う。/championsleagues/pjcs2026/master の
 * ほうが、検索結果やリンクを見ただけで何の区分のページか分かるため。
 * 並びは表示順でもある（マスターが最も読まれるので先頭）。
 */
const LEAGUE_SLUGS: { slug: string; leagueType: number }[] = [
  { slug: "master", leagueType: 4 },
  { slug: "senior", leagueType: 3 },
  { slug: "junior", leagueType: 2 },
  { slug: "open", leagueType: 1 },
];

// 未知のスラッグは null。呼び出し側で notFound() に流す。
export function leagueTypeFromSlug(slug: string): number | null {
  return LEAGUE_SLUGS.find((entry) => entry.slug === slug)?.leagueType ?? null;
}

export function leagueSlugFromType(leagueType: number): string {
  return LEAGUE_SLUGS.find((entry) => entry.leagueType === leagueType)?.slug ?? "";
}

// 表示順（マスター → シニア → ジュニア → オープン）に並べ替えるための序列。
// 未知の区分は末尾へ送る。
export function leagueTypeOrder(leagueType: number): number {
  const index = LEAGUE_SLUGS.findIndex((entry) => entry.leagueType === leagueType);

  return index === -1 ? LEAGUE_SLUGS.length : index;
}

export type ChampionsleagueLeagueRef = {
  scheduleId: string;
  leagueType: number;
  slug: string;
};

/**
 * 結果が登録済みの「大会 × リーグ区分」を、大会の新しい順・区分の表示順で返す。
 *
 * 1区分が1ページなので、sitemap と大会ページの区分一覧はこれを起点にする。
 * championsleague_results は1区分につき1イベントしか持たないため、
 * イベント一覧をそのまま区分の一覧として使える。
 */
export async function getChampionsleagueLeagueRefs(): Promise<ChampionsleagueLeagueRef[]> {
  const events = await getChampionsleagueEventRefs();

  return events
    .map((event) => ({
      scheduleId: event.championsleague_schedule_id,
      leagueType: event.league_type,
      slug: leagueSlugFromType(event.league_type),
    }))
    .filter((ref) => ref.slug !== "");
}
