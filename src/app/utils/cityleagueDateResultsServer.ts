import {
  CityleagueResultGetResponseType,
  CityleagueResultType,
} from "@app/types/cityleague_result";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";
import {
  getRecentDeckArchetypes,
  pickRecentDeckArchetypes,
} from "@app/utils/cityleagueAwaitingServer";
import { LIST_REVALIDATE_SECONDS, NO_STORE, getJson } from "@app/utils/coreApi";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";
import { collectListedDeckCodes, isWithinDeckArchetypeWait } from "@app/utils/deckArchetype";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

export type CityleagueDateResults = {
  // その日の大会の結果(入賞者つき)。並びは一覧と同じ「結果が登録された新しい順」
  results: CityleagueResultType[];
  // 一覧に載る入賞(8位まで)のデッキの種類。取れなかったデッキは含まれず、カードは種類の行を出さない
  deckArchetypes: DeckArchetypeMap;
};

// 上流から、その日の全リーグの結果を取る(表示してよい大会だけに絞る)
async function fetchResultsOfDate(
  dateParam: string,
  visibleIds: Set<number>,
  revalidate: number | typeof NO_STORE,
): Promise<CityleagueResultType[]> {
  const ret = await getJson<CityleagueResultGetResponseType>(
    `/api/v1beta/cityleague_results?from_date=${dateParam}&to_date=${dateParam}`,
    revalidate,
  );

  return (ret?.event_results ?? []).filter((result) => visibleIds.has(result.official_event_id));
}

/*
 * その日の結果。ふだんは Data Cache(5分)から取る。
 *
 * 表示してよい大会(visibleIds)は別の取得(結果のある大会の一覧。こちらも5分)から来るので、
 * 期限の切れ目がずれると、一覧には載っているのに結果のキャッシュには無い大会が出る。そのままだと
 * 見出しの件数とタブの件数が合わず、その会場のカードがどこにも出ない。欠けていたときだけ
 * キャッシュを通さずに取り直す(1日の結果は多い日でも 70KB ほどで、上流は p50 15ms)。
 */
async function getResultsOfDate(
  dateParam: string,
  visibleIds: Set<number>,
): Promise<CityleagueResultType[]> {
  const cached = await fetchResultsOfDate(dateParam, visibleIds, LIST_REVALIDATE_SECONDS);

  if (cached.length >= visibleIds.size) return cached;

  return fetchResultsOfDate(dateParam, visibleIds, NO_STORE);
}

/*
 * 入賞デッキの種類を、リーグごとに分けて引く。
 *
 * 一覧(cityleagueListServer)は「リーグ×日」の入賞をまとめて引くので、同じ単位で引けば
 * バトラボへの照会の URL が一覧と同じになり、Data Cache を共有できる(日でまとめて引くと
 * 塊の切れ目が変わり、一覧で温まったキャッシュに当たらない)。キャッシュに当たれば、
 * バトラボが応答しないときもページは待たされない(期限切れでも古い答えをすぐ返す)。
 */
async function getDeckArchetypesByLeague(
  results: CityleagueResultType[],
): Promise<DeckArchetypeMap> {
  const byLeague = new Map<number, CityleagueResultType[]>();
  for (const result of results) {
    const list = byLeague.get(result.league_type) ?? [];
    list.push(result);
    byLeague.set(result.league_type, list);
  }

  const maps = await Promise.all(
    [...byLeague.values()].map((leagueResults) =>
      getDeckArchetypesByCodes(collectListedDeckCodes(leagueResults)).catch(
        (): DeckArchetypeMap => ({}),
      ),
    ),
  );

  return Object.assign({}, ...maps);
}

/*
 * 開催日ページに並べる、その日の全リーグの結果と入賞デッキの種類。
 *
 * 以前の開催日ページは店舗名のリンクを並べるだけで、入賞デッキを見るには会場ごとに個別ページを
 * 開く必要があった(「この日の結果をまとめて見る」の行き先なのに、まとめて見られなかった)。
 * 一覧(/cityleague_results)と同じ結果カードを並べるため、ここで1日ぶんをまとめて取る。
 * 上流はリーグを省くと全リーグを1回で返す(多い日で 40 大会・入賞 600 件)。
 *
 * events は表示してよい大会(結果があり、デッキ分類の待ちが済んだもの。getCityleagueEventsInTerm)。
 * 結果はこれに含まれる大会だけに絞る。分類待ちの大会がここにだけ並ぶと、一覧・個別ページと食い違う。
 *
 * 直近(今日・昨日)の日は、一覧・個別ページと同じ判定の1枚(cityleagueAwaitingServer)から結果と
 * 種類を取る。1枚には待つ期間の結果が全リーグぶん入っているので、上流へ取りに行かずに済む。
 * 判定が作れなかったときと、それより前の日は上流から取る。
 *
 * 取得に失敗したら null。ページは店舗名のリンクの一覧に戻す(個別ページへは辿れる)。
 */
export async function getCityleagueDateResults(
  dateParam: string,
  events: OfficialEventType[],
): Promise<CityleagueDateResults | null> {
  try {
    const visibleIds = new Set(events.map((event) => event.id));

    const snapshot = isWithinDeckArchetypeWait(dateParam, todayJSTDateString())
      ? await getRecentDeckArchetypes()
      : null;

    if (snapshot) {
      const results = snapshot.events.filter(
        (result) =>
          toJSTDateString(result.date) === dateParam && visibleIds.has(result.official_event_id),
      );

      // 1枚の種類は待つ期間の全大会ぶんあるので、この日のぶんだけにしてブラウザへ送る
      return {
        results,
        deckArchetypes: pickRecentDeckArchetypes(snapshot, { date: dateParam }).decks,
      };
    }

    const results = await getResultsOfDate(dateParam, visibleIds);

    // 種類が取れなくても結果は出す(カードは種類の行が無いだけになる)
    const deckArchetypes = await getDeckArchetypesByLeague(results);

    return { results, deckArchetypes };
  } catch (error) {
    console.error(`failed to fetch the cityleague results on ${dateParam}`, error);

    return null;
  }
}
