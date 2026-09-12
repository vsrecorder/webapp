import {
  ChampionsleagueResultEventType,
  ChampionsleagueResultGetByScheduleIdResponseType,
  ChampionsleagueResultGetEventsResponseType,
} from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { OfficialEventType } from "@app/types/official_event";
import { LIST_REVALIDATE_SECONDS, getJson } from "@app/utils/coreApi";
import {
  formatEventDate,
  formatEventMonthDay,
  getOfficialEventById,
} from "@app/utils/cityleague";
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
  // 新しい結果が登録されると増えるので、確定した個別ページより短く持つ
  const ret = await getJson<ChampionsleagueResultGetEventsResponseType>(
    `/api/v1beta/championsleague_results/events`,
    LIST_REVALIDATE_SECONDS,
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
 *
 * 既定の1日ではなく一覧と同じ短い間隔で持つ。入賞者1人ぶんの内容は確定後に変わらないが、
 * 「その大会にどのイベントがあるか」は後から増えるため。実際、2026-09-12 に
 * import-championsleague-result-bat が最終日だけでなく初日から取り込むようになったとき、
 * 既に取り込み済みの大会に1日目のイベントが足された。1日キャッシュではそれが
 * 丸1日ページに出てこない（シニア・ジュニアの1日目が消えたまま）。
 */
export async function getChampionsleagueResultsByScheduleId(
  id: string,
  leagueType?: number,
): Promise<ChampionsleagueResultGetByScheduleIdResponseType | null> {
  const ret = await getJson<ChampionsleagueResultGetByScheduleIdResponseType>(
    `/api/v1beta/championsleague_results?championsleague_schedule_id=${encodeURIComponent(id)}` +
      (leagueType ? `&league_type=${leagueType}` : ""),
    LIST_REVALIDATE_SECONDS,
  );

  return ret?.event_results?.length ? ret : null;
}

export type ChampionsleagueScheduleSummary = {
  schedule: ChampionsleagueScheduleType;
  // 結果が登録されているリーグ区分の数（1日目/2日目に分かれていても1つと数える）
  leagueCount: number;
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

  // 区分数はイベント数と一致しない（1日目/2日目が別イベントで登録される区分がある）ため、
  // league_type の種類数で数える。
  const leagueTypes = new Map<string, Set<number>>();
  for (const event of events) {
    const id = event.championsleague_schedule_id;
    const types = leagueTypes.get(id);
    if (types) types.add(event.league_type);
    else leagueTypes.set(id, new Set([event.league_type]));
  }

  return schedules
    .filter((schedule) => (leagueTypes.get(schedule.id)?.size ?? 0) > 0)
    .sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())
    .map((schedule) => ({
      schedule,
      leagueCount: leagueTypes.get(schedule.id)?.size ?? 0,
    }));
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

/*
 * リーグ区分ごとにイベントをまとめる。
 *
 * シニアとジュニアは1日目と2日目が別々の大会として開かれることがあり、同じ区分に
 * 2イベントぶら下がる（例: チャンピオンズリーグ2026 大阪のシニアは 3/28 と 3/29）。
 * 一方で区分ページのURLは区分に1つしか無いため、イベントをそのまま一覧にすると
 * 同じリンクが2行並び、React の key も衝突する。区分の一覧を作る側は必ずここを通すこと。
 */
export type ChampionsleagueLeagueGroup<T> = {
  leagueType: number;
  slug: string;
  // 開催日の古い順（1日目 → 2日目）
  events: T[];
};

export function groupEventsByLeagueType<T extends { league_type: number; date: Date }>(
  events: T[],
): ChampionsleagueLeagueGroup<T>[] {
  const byLeagueType = new Map<number, T[]>();

  for (const event of events) {
    const group = byLeagueType.get(event.league_type);
    if (group) group.push(event);
    else byLeagueType.set(event.league_type, [event]);
  }

  return [...byLeagueType]
    .map(([leagueType, group]) => ({
      leagueType,
      slug: leagueSlugFromType(leagueType),
      events: [...group].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    }))
    .sort((a, b) => leagueTypeOrder(a.leagueType) - leagueTypeOrder(b.leagueType));
}

/*
 * 区分の開催日ラベル。「2026年3月28日・3月29日」のように、2日目以降は月日だけを足す。
 * 年を繰り返すと行が長くなり、一覧では区分名より日付のほうが目立ってしまう。
 */
export function formatLeagueDates(dates: Date[]): string {
  const sorted = [...dates].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return sorted
    .map((date, index) => (index === 0 ? formatEventDate(date) : formatEventMonthDay(date)))
    .join("・");
}

export type ChampionsleagueLeagueRef = {
  scheduleId: string;
  leagueType: number;
  slug: string;
};

/**
 * 結果が登録済みの「大会 × リーグ区分」を、大会の新しい順・区分の表示順で返す。
 *
 * 1区分が1ページなので、sitemap はこれを起点にする。1日目と2日目が別イベントの区分は
 * ページも1つなので、イベントをそのまま並べると sitemap に同じURLが2回載る。
 */
export async function getChampionsleagueLeagueRefs(): Promise<ChampionsleagueLeagueRef[]> {
  const events = await getChampionsleagueEventRefs();

  const bySchedule = new Map<string, ChampionsleagueResultEventType[]>();
  for (const event of events) {
    const group = bySchedule.get(event.championsleague_schedule_id);
    if (group) group.push(event);
    else bySchedule.set(event.championsleague_schedule_id, [event]);
  }

  return [...bySchedule].flatMap(([scheduleId, scheduleEvents]) =>
    groupEventsByLeagueType(scheduleEvents)
      .filter((group) => group.slug !== "")
      .map((group) => ({
        scheduleId,
        leagueType: group.leagueType,
        slug: group.slug,
      })),
  );
}
