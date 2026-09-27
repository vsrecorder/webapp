import { OfficialEventType } from "@app/types/official_event";
import { getCityleagueResultByOfficialEventId } from "@app/utils/cityleague";
import { DateWinnerDeck, summarizeDateWinners } from "@app/utils/cityleagueDateShare";
import { mapWithConcurrency } from "@app/utils/concurrency";
import { isDeckArchetypeSeason } from "@app/utils/deckArchetype";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

// core-apiserver への同時要求数。1件は DB 参照だけで軽い(cityleagueWinner.ts と同じ)
const RESULT_CONCURRENCY = 10;

// OGP 画像に並べる優勝デッキの数(横に 4 枚)
const OG_WINNER_LIMIT = 4;

/*
 * 開催日の OGP 画像に載せる「その日の優勝デッキ」を集める。
 *
 * その日の各大会の優勝デッキを、バトラボのデッキ分類で主デッキごとに数える。分類が付くのは
 * 2027 シーズン以降の大会だけなので、それより前の大会は数えない(全部そうなら空になり、画像は
 * 日付だけのものになる)。
 *
 * 画像を作るとき(ogImageUrlFor が実体を用意するとき)にだけ呼ぶ。ページの描画では呼ばない。
 * 1 日で数十大会の結果を引くため、閲覧のたびに走らせると初回表示が遅くなる。
 * 結果は個別ページと同じ取得関数(24時間キャッシュ)で引くので、個別ページ側と二重には取りに行かない。
 * 取れなかった大会は数えないだけで、全体は落とさない。
 */
export async function getDateWinnerDecks(events: OfficialEventType[]): Promise<DateWinnerDeck[]> {
  const results = await mapWithConcurrency(events, RESULT_CONCURRENCY, (event) =>
    getCityleagueResultByOfficialEventId(event.id).catch(() => null),
  );

  const winnerCodes = results.flatMap((result) => {
    if (!result || !isDeckArchetypeSeason(result.cityleague_schedule_id)) return [];
    const winner = result.results.find((entry) => entry.rank === 1);
    return winner?.deck_code ? [winner.deck_code] : [];
  });

  if (winnerCodes.length === 0) return [];

  const archetypes = await getDeckArchetypesByCodes(winnerCodes);

  // 同じデッキコードで複数の大会に優勝していれば、その回数ぶん数える
  return summarizeDateWinners(
    winnerCodes.map((code) => archetypes[code]),
    OG_WINNER_LIMIT,
  );
}
