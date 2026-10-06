import { CityleagueWinnerType } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";
import { getCityleagueResultByOfficialEventId } from "@app/utils/cityleague";
import { mapWithConcurrency } from "@app/utils/concurrency";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { deckDisplayName, isDeckArchetypeSeason } from "@app/utils/deckArchetype";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";
import { getDeckSummaries } from "@app/utils/deckSummaryServer";

// core-apiserver への同時要求数。1件は DB 参照だけで軽い。
const RESULT_CONCURRENCY = 10;

// 各イベントの優勝者と、その優勝デッキの呼び名を引く。
// 一覧ハブの各行に「優勝：○○ex(△△型)（□□選手）」を添えるためのもので、
// 店舗名の羅列だったハブに「何のデッキが勝ったか」のテキストを載せる。
//
// デッキの呼び名は個別ページ(入賞カード・冒頭の要約文)と同じ deckDisplayName で決める。
// 2027 シーズン以降の大会はバトラボ(vslab)のデッキ分類の「主デッキ名(型名)」、それ以外と
// 未分類のデッキはカード構成から求めた主なポケモン。以前は一覧だけ主なポケモンで呼んでいたため、
// 個別ページの「ドラパルトex(カーストボム型)」が一覧では「ドラパルトex」になるなど食い違っていた。
//
// 結果は個別ページと同じ取得関数(24時間キャッシュ)で引くため、個別ページ側と二重には取りに行かない。
// イベント単位の取得失敗はそのイベントを省くに留め、全体は落とさない。分類が取れなかったとき
// (バトラボの無応答・索引への取り込み待ち)は主なポケモンで呼ぶ。
export async function getCityleagueWinners(
  events: OfficialEventType[],
): Promise<Record<number, CityleagueWinnerType>> {
  const results = await mapWithConcurrency(events, RESULT_CONCURRENCY, (event) =>
    getCityleagueResultByOfficialEventId(event.id).catch(() => null),
  );

  const winners = events.flatMap((event, index) => {
    const result = results[index];
    const winner = result?.results.find((entry) => entry.rank === 1);
    return winner
      ? [
          {
            eventId: event.id,
            winner,
            hasArchetype: isDeckArchetypeSeason(result?.cityleague_schedule_id),
          },
        ]
      : [];
  });

  // 分類が付くのは 2027 シーズン以降の大会だけ。それより前のデッキコードは照会しない
  const archetypeCodes = winners
    .filter(({ hasArchetype, winner }) => hasArchetype && !!winner.deck_code)
    .map(({ winner }) => winner.deck_code);

  const [summaries, archetypes] = await Promise.all([
    getDeckSummaries(winners.map(({ winner }) => winner.deck_code)),
    archetypeCodes.length > 0
      ? getDeckArchetypesByCodes(archetypeCodes).catch((): DeckArchetypeMap => ({}))
      : Promise.resolve<DeckArchetypeMap>({}),
  ]);

  const byEventId: Record<number, CityleagueWinnerType> = {};

  for (const { eventId, winner, hasArchetype } of winners) {
    byEventId[eventId] = {
      playerName: winner.player_name,
      deckName: deckDisplayName(
        hasArchetype ? archetypes[winner.deck_code] : undefined,
        summaries[winner.deck_code],
      ),
    };
  }

  return byEventId;
}
