import {
  DeckArchetypeMap,
  DeckArchetypesGetResponseType,
  RecentDeckArchetypesType,
} from "@app/types/deck_archetype";
import { CityleagueResultType } from "@app/types/cityleague_result";
import { todayJSTDateString } from "@app/utils/date";
import {
  chunkDeckCodes,
  collectListedDeckCodes,
  isHiddenWhileAwaiting,
  isWithinDeckArchetypeWait,
  normalizeDeckCodes,
} from "@app/utils/deckArchetype";

/*
 * 入賞デッキの種類(バトラボのデッキ分類)を、ブラウザ側から BFF 経由でまとめて引く。
 *
 * シティリーグ結果一覧の 2 ページ目以降(CityleagueResults)と、ホームの「本日のシティリーグ」の
 * 会場カードから開く結果モーダル(CityleagueEvent)が、1 日ぶんのデッキコードで使う。
 *
 * BFF の上限(100 件 = vslab の 1 回の照会)ごとに分けて並列に投げ、1 つの辞書にまとめる。
 * 取れなかった塊は落とす(そのカードに種類の行が出ないだけで、結果は出す)。
 */
export async function fetchDeckArchetypes(codes: string[]): Promise<DeckArchetypeMap> {
  const chunks = chunkDeckCodes(normalizeDeckCodes(codes));

  const maps = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(
          `/api/cityleague_results/deck_archetypes?codes=${encodeURIComponent(chunk.join(","))}`,
          {
            cache: "no-store",
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );
        if (!res.ok) return {};

        const data: DeckArchetypesGetResponseType = await res.json();

        return data?.decks && typeof data.decks === "object" ? data.decks : {};
      } catch {
        return {};
      }
    }),
  );

  return Object.assign({}, ...maps);
}

/*
 * 直近(今日・昨日)の大会の、デッキ分類が揃っているかの判定を BFF から取る。
 *
 * 一覧とホームのパネルが、分類待ちの大会を出さずにおくために使う。判定はサーバの 1 枚
 * (cityleagueAwaitingServer)なので、ハブ・個別ページと食い違わない。leagueType・date で
 * そのリーグ・その日のぶんに絞れる。
 *
 * 取れなければ null(呼び出し側は何も隠さず、分類は fetchDeckArchetypes で取る)。
 * timeoutMs を渡すと、それまでに返らなければ諦める(結果の表示をこれ以上待たせない画面向け)。
 */
export async function fetchRecentDeckArchetypes(
  { leagueType, date }: { leagueType?: number; date?: string },
  { timeoutMs }: { timeoutMs?: number } = {},
): Promise<RecentDeckArchetypesType | null> {
  const params = new URLSearchParams();
  if (leagueType !== undefined) params.set("league_type", String(leagueType));
  if (date !== undefined) params.set("date", date);

  try {
    const res = await fetch(`/api/cityleague_results/recent_deck_archetypes?${params}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    if (!res.ok) return null;

    const data: RecentDeckArchetypesType = await res.json();

    // 形が違えば判定が無いものとして扱う(全部「確かめられていない」と読むと結果がまるごと隠れる)
    if (
      typeof data?.today !== "string" ||
      !Array.isArray(data.checked) ||
      !Array.isArray(data.awaiting) ||
      !data.decks ||
      typeof data.decks !== "object"
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export type ResolvedDeckArchetypes = {
  // 出してよい結果(並びは保つ)
  visible: CityleagueResultType[];
  // 分類待ちで出さなかった結果があるか
  hasAwaiting: boolean;
  // 出す結果の入賞デッキの種類
  decks: DeckArchetypeMap;
};

/*
 * 結果のうち出してよいものと、それに添えるデッキの種類を決める(一覧・ホームのパネル共通)。
 *
 * 直近(今日・昨日)の大会を含むときは、サーバの判定(fetchRecentDeckArchetypes)で出すかどうかを決め、
 * 出す大会の種類も判定と同じ答えを使う(別に照会すると、その照会のキャッシュが古くて種類の行が
 * 欠けることがある)。直近でない大会と、判定が取れなかったときは何も隠さず、種類は
 * fetchDeckArchetypes で取る。
 */
export async function resolveDeckArchetypes(
  results: CityleagueResultType[],
  { leagueType, date, timeoutMs }: { leagueType?: number; date?: string; timeoutMs?: number },
): Promise<ResolvedDeckArchetypes> {
  const today = todayJSTDateString();
  const recentResults = results.filter((result) => isWithinDeckArchetypeWait(result.date, today));
  const olderResults = results.filter((result) => !isWithinDeckArchetypeWait(result.date, today));

  const [recent, olderDecks] = await Promise.all([
    recentResults.length > 0
      ? fetchRecentDeckArchetypes({ leagueType, date }, { timeoutMs })
      : Promise.resolve(null),
    fetchDeckArchetypes(collectListedDeckCodes(olderResults)),
  ]);

  const visible = results.filter(
    (result) => !isHiddenWhileAwaiting(result.official_event_id, result.date, recent),
  );

  // 判定が取れなかった直近の大会は、これまでどおり種類だけを取る
  const recentDecks = recent
    ? recent.decks
    : await fetchDeckArchetypes(collectListedDeckCodes(recentResults));

  return {
    visible,
    hasAwaiting: visible.length < results.length,
    decks: { ...olderDecks, ...recentDecks },
  };
}
