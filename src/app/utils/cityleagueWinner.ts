import { CityleagueWinnerType } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";
import { getCityleagueResultByOfficialEventId } from "@app/utils/cityleague";
import { mapWithConcurrency } from "@app/utils/concurrency";
import { getDeckSummaries } from "@app/utils/deckSummaryServer";

// core-apiserver への同時要求数。1件は DB 参照だけで軽い。
const RESULT_CONCURRENCY = 10;

// 各イベントの優勝者と、そのデッキの主なポケモンを引く。
// 一覧ハブの各行に「優勝：○○ex・△△（□□選手）」を添えるためのもので、
// 店舗名の羅列だったハブに「何のデッキが勝ったか」のテキストを載せる。
//
// 結果は個別ページと同じ取得関数(24時間キャッシュ)で引くため、個別ページ側と二重には取りに行かない。
// イベント単位の取得失敗はそのイベントを省くに留め、全体は落とさない。
export async function getCityleagueWinners(
  events: OfficialEventType[],
): Promise<Record<number, CityleagueWinnerType>> {
  const results = await mapWithConcurrency(events, RESULT_CONCURRENCY, (event) =>
    getCityleagueResultByOfficialEventId(event.id).catch(() => null),
  );

  const winners = events.flatMap((event, index) => {
    const winner = results[index]?.results.find((result) => result.rank === 1);
    return winner ? [{ eventId: event.id, winner }] : [];
  });

  const summaries = await getDeckSummaries(winners.map(({ winner }) => winner.deck_code));

  const byEventId: Record<number, CityleagueWinnerType> = {};

  for (const { eventId, winner } of winners) {
    byEventId[eventId] = {
      playerName: winner.player_name,
      mainPokemon: summaries[winner.deck_code]?.mainPokemon ?? [],
    };
  }

  return byEventId;
}
