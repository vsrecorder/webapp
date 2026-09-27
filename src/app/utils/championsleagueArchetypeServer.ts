import { ChampionsleagueEventResultType } from "@app/types/championsleague_result";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";
import { toJSTDateString } from "@app/utils/date";
import { isDeckArchetypeChampionsleague } from "@app/utils/deckArchetype";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

/*
 * 大型大会(チャンピオンズリーグ等)の入賞デッキの種類(バトラボのデッキ分類)を、サーバ側で引く。
 *
 * 大型大会の入賞デッキは vslab の索引(シティリーグの大会結果)に無いので、環境と開催日を添えて
 * 引き、vslab にデッキの中身を取り寄せて判定してもらう。環境は公式イベント情報にしか無いので、
 * 引けなかったイベントのデッキは飛ばす。2027 シーズンより前の大会は引かない(分類が無い)。
 * 取れなかったデッキは辞書に入らないだけで、ページは出す。
 *
 * 環境と開催日が同じイベントのデッキは 1 回にまとめる(大会ページは区分ごとの優勝デッキだけを
 * 引くので、まとめないと 1 件ずつの照会が区分の数だけ並ぶ)。照会は順に投げる(並列にしない)。
 * この照会は vslab 側で 1 秒に 2 回の枠に入っていて、同時に投げると、同じ瞬間に開かれた別のページの
 * ぶんと合わせて枠を超えうる。順に投げても vslab がデッキの中身を持っていれば 1 本 50ms 程度で済む。
 */
export async function getChampionsleagueDeckArchetypes(
  scheduleId: string,
  eventResults: ChampionsleagueEventResultType[],
  officialEvents: Record<number, OfficialEventType>,
  // 優勝デッキだけを引く(大会ページの「○○リーグの優勝は…」用)。既定は入賞全部
  options: { winnersOnly?: boolean } = {},
): Promise<DeckArchetypeMap> {
  if (!isDeckArchetypeChampionsleague(scheduleId)) return {};

  // (環境, 開催日) → デッキコード
  const groups = new Map<string, { environmentId: string; date: string; codes: string[] }>();

  for (const eventResult of eventResults) {
    const environmentId = officialEvents[eventResult.official_event_id]?.environment_id;
    if (!environmentId) continue;

    const date = toJSTDateString(eventResult.date);
    const key = `${environmentId}\t${date}`;
    const group = groups.get(key) ?? { environmentId, date, codes: [] };

    const results = options.winnersOnly
      ? eventResult.results.filter((result) => result.rank === 1)
      : eventResult.results;
    group.codes.push(...results.map((result) => result.deck_code));
    groups.set(key, group);
  }

  const merged: DeckArchetypeMap = {};

  for (const { environmentId, date, codes } of groups.values()) {
    Object.assign(merged, await getDeckArchetypesByCodes(codes, { environmentId, date }));
  }

  return merged;
}
