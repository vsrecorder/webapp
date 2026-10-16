import {
  CityleagueResultGetResponseType,
  CityleagueResultType,
} from "@app/types/cityleague_result";
import { RecentDeckArchetypesType } from "@app/types/deck_archetype";
import { shiftDateString } from "@app/utils/cityleagueListPage";
import { NO_STORE, getJson } from "@app/utils/coreApi";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";
import {
  DECK_ARCHETYPE_WAIT_DAYS,
  collectListedDeckCodes,
  isHiddenWhileAwaiting,
  isWithinDeckArchetypeWait,
  withoutAwaitingDeckArchetypes,
} from "@app/utils/deckArchetype";
import { lookupDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

/*
 * デッキ分類(バトラボ)がまだ揃わない直近の大会の判定を、サーバに 1 枚だけ持つ。
 *
 * 大会結果はバトラボの索引より 15〜35 分早く入るので、その間は大会を出さない。出さない大会は
 * 一覧・ホームのパネル・ハブ(最近開催・開催日/月/シーズン/環境)・個別ページ・関連リンク・選手ページの
 * すべてで同じでないと、一覧に無い大会が別の場所に並び、押すと 404 になる。
 *
 * 以前は画面ごとに自分の表示ぶんのデッキコード(その日・そのリーグ、新しく出る大会だけ、大会 ID …)で
 * 照会していた。Next の Data Cache は URL ごとに別々の時刻で切れ、切れた直後の 1 回は古い答えを返すので、
 * 索引が追いついた直後に画面ごとの答えが 1〜2 分食い違っていた。そこで判定はここだけで作り、
 * 画面はすべてこれを見る(ブラウザ側の一覧・パネルは /api/cityleague_results/recent_deck_archetypes 経由)。
 *
 * 作り方: 待つ期間(今日・昨日)の結果を全リーグぶん 1 回で取り(多い週末で 80 大会・140KB 程度)、
 * 一覧に載る 8 位までのデッキコードをバトラボに聞く。どちらも Data Cache を通さず今の答えを使う。
 *
 * 持ち方: Data Cache ではなくプロセス内に持ち、壁時計の 30 秒刻みで作り直す。時刻を鍵に入れて
 * Data Cache に置くと、刻みごとにキャッシュのファイルが増え続ける(消されない)。本番は 2 プロセスで
 * 動くが、どちらも同じ刻みで作り直すので、食い違うのはバトラボの答えが切り替わる瞬間をまたいだ
 * 最大 30 秒だけになる。1 プロセスあたりの往復は 30 秒に 1 回(本番の結果 1 本とバトラボ数本)で、
 * 待つ期間に大会が無い(開催期間外など)ときは呼ばれない。
 */

const SNAPSHOT_INTERVAL_MS = 30 * 1000;

// 判定と、判定に使った大会。BFF がリーグ・日付で絞って返すために持つ
type Snapshot = RecentDeckArchetypesType & {
  events: CityleagueResultType[];
};

let current: { key: string; snapshot: Promise<Snapshot | null> } | null = null;

async function buildSnapshot(today: string): Promise<Snapshot | null> {
  try {
    const ret = await getJson<CityleagueResultGetResponseType>(
      `/api/v1beta/cityleague_results?from_date=${shiftDateString(today, -DECK_ARCHETYPE_WAIT_DAYS)}&to_date=${today}`,
      NO_STORE,
    );
    const results = Array.isArray(ret?.event_results) ? ret.event_results : [];

    const { decks, pending } = await lookupDeckArchetypesByCodes(collectListedDeckCodes(results), {
      fresh: true,
    });
    const ready = new Set(
      withoutAwaitingDeckArchetypes(results, pending, today).map(
        (result) => result.official_event_id,
      ),
    );

    return {
      today,
      checked: results.map((result) => result.official_event_id),
      awaiting: results
        .map((result) => result.official_event_id)
        .filter((id) => !ready.has(id)),
      decks,
      events: results,
    };
  } catch (error) {
    console.warn("failed to check cityleague events awaiting deck archetypes", error);

    return null;
  }
}

/*
 * 今の刻みの判定。作れなかったら null(呼び出し側は何も隠さない。隠す側に倒すと、本番の上流や
 * バトラボの障害で新しい結果がどこにも出なくなる)。失敗もその刻みのあいだは覚えておく
 * (取り直すと、同じ刻みの中で画面ごとに隠したり隠さなかったりする)。
 */
export function getRecentDeckArchetypes(): Promise<Snapshot | null> {
  const now = Date.now();
  const today = todayJSTDateString();
  const key = `${today}:${Math.floor(now / SNAPSHOT_INTERVAL_MS)}`;

  if (current?.key !== key) {
    current = { key, snapshot: buildSnapshot(today) };
  }

  return current.snapshot;
}

// テストで刻みをまたがずに作り直すためのもの
export function resetRecentDeckArchetypesForTest(): void {
  current = null;
}

/*
 * BFF で返す形に絞る。leagueType・date を渡すと、その大会のぶんだけにする(ブラウザへ送る量を減らす)。
 * 絞っても判定そのものは同じ 1 枚から取るので、画面ごとに食い違わない。
 */
export function pickRecentDeckArchetypes(
  snapshot: Snapshot,
  { leagueType, date }: { leagueType?: number; date?: string } = {},
): RecentDeckArchetypesType {
  const events = snapshot.events.filter(
    (event) =>
      (leagueType === undefined || event.league_type === leagueType) &&
      (date === undefined || toJSTDateString(event.date) === date),
  );
  const ids = new Set(events.map((event) => event.official_event_id));
  const codes = collectListedDeckCodes(
    events.filter((event) => !snapshot.awaiting.includes(event.official_event_id)),
  );

  return {
    today: snapshot.today,
    checked: snapshot.checked.filter((id) => ids.has(id)),
    awaiting: snapshot.awaiting.filter((id) => ids.has(id)),
    decks: Object.fromEntries(
      codes.filter((code) => snapshot.decks[code]).map((code) => [code, snapshot.decks[code]]),
    ),
  };
}

/*
 * 分類がまだ揃わない直近の大会を除く(並びは保つ)。ハブ・関連リンク・sitemap・選手ページ向け。
 *
 * 待つ期間の大会が無ければ判定を取らずにそのまま返す(旧シーズンのハブなど、ほとんどの表示はこれ)。
 */
export async function withoutAwaitingCityleagueEvents<T>(
  items: T[],
  eventOf: (item: T) => { id: number; date: Date | string },
): Promise<T[]> {
  const today = todayJSTDateString();
  if (!items.some((item) => isWithinDeckArchetypeWait(eventOf(item).date, today))) return items;

  const recent = await getRecentDeckArchetypes();
  if (!recent) return items;

  return items.filter((item) => {
    const { id, date } = eventOf(item);
    return !isHiddenWhileAwaiting(id, date, recent);
  });
}
