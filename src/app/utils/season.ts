import { ChampionshipSeriesType } from "@app/types/championship_series";

export type SeasonOption = { value: string; label: string };

const CHAMPIONSHIP_SERIES_ID_PREFIX = "series_";

function seasonValue(championshipSeries: ChampionshipSeriesType): string {
  return championshipSeries.id.replace(new RegExp(`^${CHAMPIONSHIP_SERIES_ID_PREFIX}`), "");
}

// championshipSeries は championship_series テーブル由来のシーズン一覧
// (from_date降順、バックエンドの一覧APIがその順で返す前提)。
// 選択肢には開始済みのシーズンのみを表示する(未開催シーズンは記録が存在しないため)。
// ユーザー登録以前のシーズンも(そのユーザーの記録は無いが)選択可能にする。
export function seasonOptionsFromChampionshipSeries(
  championshipSeries: ChampionshipSeriesType[],
): SeasonOption[] {
  const now = new Date();

  return championshipSeries
    .filter((cs) => new Date(cs.from_date) <= now)
    .map((cs) => ({ value: seasonValue(cs), label: cs.title }));
}

// nowが属するシーズンのseason識別子を返す(該当が無ければ最新のシーズンにフォールバック)。
export function currentSeasonValue(championshipSeries: ChampionshipSeriesType[]): string {
  if (championshipSeries.length === 0) return "";

  const now = new Date();
  const current = championshipSeries.find(
    (cs) => new Date(cs.from_date) <= now && now <= new Date(cs.to_date),
  );

  return seasonValue(current ?? championshipSeries[0]);
}
