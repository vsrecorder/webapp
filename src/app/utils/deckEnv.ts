// プラットフォーム週次デッキ使用率(weekly_usage)に、あるデッキ(スプライト集合)を
// 突き合わせて「環境の中での立ち位置」を求める共通ロジック。
// 施策E-2(環境の窓カード)と施策E-1(記録直後のリターン)で共有する。

import { deckFingerprintKey, fingerprintKey } from "@app/utils/fingerprint";
import { lastWeekValue, isInCurrentWeekJST } from "@app/utils/week";
import {
  WeeklyDeckUsageGroupingType,
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";
import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { isZeroDate } from "@app/utils/date";

// 「ランキング対象」= 「その他」(空指紋)を除いたデッキ変種を、使用率(count)降順・
// 同率は勝率降順に整列して返す。順位はこの並びの index+1。
export function rankableDecks(stat: WeeklyDeckUsageStatType): WeeklyDeckUsageItemType[] {
  return [...stat.decks.filter((d) => d.fingerprint !== "")].sort(
    (a, b) => b.count - a.count || b.win_rate - a.win_rate,
  );
}

export type DeckEnvPosition = {
  rank: number; // 1始まりの環境順位
  // 該当デッキの集計行(使用率・勝率など)。使用率は「その他」を含む全体件数が分母の usage_rate を使う
  row: WeeklyDeckUsageItemType;
};

// 突き合わせたいデッキのスプライトIDから、環境上の立ち位置を返す。
// 指紋が空(スプライト未設定)か、ランキングに載っていなければ null。
export function findDeckPosition(
  stat: WeeklyDeckUsageStatType,
  spriteIds: string[],
): DeckEnvPosition | null {
  const fp = fingerprintKey(spriteIds);
  if (fp === "") return null;
  const rankable = rankableDecks(stat);
  const idx = rankable.findIndex((d) => d.fingerprint === fp);
  if (idx < 0) return null;
  return { rank: idx + 1, row: rankable[idx] };
}

export type FirstSpriteEnvPosition = DeckEnvPosition & {
  // 行に束ねられた内訳のうち、突き合わせたデッキ(組み合わせ単位)に当たるもの。
  // 内訳に見つからなければ null(行の中での割合は出せない)。
  member: WeeklyDeckUsageItemType | null;
};

/*
 * 1体目でまとめた集計(grouping=first_sprite)の中で、あるデッキが属する行の立ち位置を返す。
 * 行は集計側で「その組み合わせで最も多く1体目に置かれたスプライト」で束ねられているため、
 * 先に内訳(members)の組み合わせ指紋で親行を探し、無ければ自分の1体目の指紋で探す
 * (環境の窓カードと同じ引き当て方)。スプライト未設定かランキング外なら null。
 */
export function findFirstSpritePosition(
  stat: WeeklyDeckUsageStatType,
  sprites: Pick<MatchPokemonSpriteType, "id" | "position">[],
): FirstSpriteEnvPosition | null {
  const exactFp = deckFingerprintKey(sprites, "exact");
  const firstFp = deckFingerprintKey(sprites, "first_sprite");
  if (exactFp === "" || firstFp === "") return null;
  const rankable = rankableDecks(stat);
  let idx = rankable.findIndex((d) => d.members?.some((m) => m.fingerprint === exactFp));
  if (idx < 0) idx = rankable.findIndex((d) => d.fingerprint === firstFp);
  if (idx < 0) return null;
  const row = rankable[idx];
  return {
    rank: idx + 1,
    row,
    member: row.members?.find((m) => m.fingerprint === exactFp) ?? null,
  };
}

// 施策E-1: 環境リターンを出してよい記録かどうかを、記録の開催日から判定する。
// リターンの根拠は常に「(操作日から見た)先週の対戦環境データ」なので、今週より前の対戦を
// 遡って記録した場合は当時の環境と食い違う(当時はトップでも今は圏外、の逆もある)。
// 開催日が今週から外れる記録では出さない。
// 開催日は event_date、未設定(ゼロ値 0001-01-01)なら記録の作成日で見る。
// このフォールバック順は戦績カード(RecordHero)の日付表示と揃えること。
export function isEnvReturnTargetDate(
  eventDate?: string,
  createdAt?: string | Date,
): boolean {
  const isSet = (date?: string): date is string =>
    !isZeroDate(date);
  const dateStr = isSet(eventDate) ? eventDate : createdAt?.toString();
  if (!dateStr) return false;
  return isInCurrentWeekJST(dateStr);
}

// 先週の週次デッキ使用率を取得する。取得できなければ null。
async function fetchLastWeekUsage(
  grouping: WeeklyDeckUsageGroupingType,
): Promise<WeeklyDeckUsageStatType | null> {
  try {
    const res = await fetch(
      `/api/deck_meta/weekly_usage?week=${lastWeekValue()}&grouping=${grouping}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 施策E-1: 相手デッキのスプライトから、先週の環境での立ち位置を引く。
// - position: ランキングに載っていれば順位情報、圏外なら null
// - firstSprite: 1体目でまとめたときの立ち位置。圏外・取得失敗なら null
// - hasEnvData: 先週のランキングにデータがあるか(空の週はリターンを出さない)
// スプライト無し・取得失敗なら null(その場合はリターンを出さない)。
// ランキング外の相手でもリターンを出すため、position の有無ではなく hasEnvData で判定する。
// 1体目でまとめた集計は補足表示なので、そちらだけ取れなかったときは firstSprite=null で続ける。
export async function fetchOpponentEnv(
  sprites: Pick<MatchPokemonSpriteType, "id" | "position">[],
): Promise<{
  position: DeckEnvPosition | null;
  firstSprite: FirstSpriteEnvPosition | null;
  hasEnvData: boolean;
} | null> {
  if (sprites.length === 0) return null;
  const [stat, firstStat] = await Promise.all([
    fetchLastWeekUsage("exact"),
    fetchLastWeekUsage("first_sprite"),
  ]);
  if (!stat) return null;
  return {
    position: findDeckPosition(stat, sprites.map((s) => s.id)),
    firstSprite: firstStat ? findFirstSpritePosition(firstStat, sprites) : null,
    hasEnvData: rankableDecks(stat).length > 0,
  };
}

// 施策E-3: 自分のデッキのスプライトから、先週の環境での立ち位置(順位・環境平均勝率)を引く。
// 「暫定値の環境補完(借りて→返す)」で、個人勝率の錨となる同デッキの環境平均勝率を得るために使う。
// 組み合わせ単位の立ち位置だけを使うため、1体目でまとめた集計は取得しない。
export async function fetchDeckEnv(
  spriteIds: string[],
): Promise<{ position: DeckEnvPosition | null; hasEnvData: boolean } | null> {
  if (spriteIds.length === 0) return null;
  const stat = await fetchLastWeekUsage("exact");
  if (!stat) return null;
  return {
    position: findDeckPosition(stat, spriteIds),
    hasEnvData: rankableDecks(stat).length > 0,
  };
}
