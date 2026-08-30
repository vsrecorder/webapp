import { ChampionshipSeriesType } from "@app/types/championship_series";
import { todayJSTDateString, toJSTDateString } from "@app/utils/date";

export type SeasonOption = { value: string; label: string };

const CHAMPIONSHIP_SERIES_ID_PREFIX = "series_";

function seasonValue(championshipSeries: ChampionshipSeriesType): string {
  return championshipSeries.id.replace(new RegExp(`^${CHAMPIONSHIP_SERIES_ID_PREFIX}`), "");
}

// from_date / to_date は DATE 型(JSTの暦日)で、API からは "2026-08-31T00:00:00+09:00" のように
// 「その日の JST 0時」の時刻として届く。時刻付きの now と直接比較すると、to_date 当日
// (シーズン最終日)が 0時を過ぎた時点で期間外になってしまう。
// そのため比較は暦日文字列("YYYY-MM-DD")に揃えて行う。
function isStarted(championshipSeries: ChampionshipSeriesType, today: string): boolean {
  return toJSTDateString(championshipSeries.from_date) <= today;
}

function isCurrent(championshipSeries: ChampionshipSeriesType, today: string): boolean {
  return (
    isStarted(championshipSeries, today) &&
    today <= toJSTDateString(championshipSeries.to_date)
  );
}

// championshipSeries は championship_series テーブル由来のシーズン一覧
// (from_date降順、バックエンドの一覧APIがその順で返す前提)。
// 選択肢には開始済みのシーズンのみを表示する(未開催シーズンは記録が存在しないため)。
// ユーザー登録以前のシーズンも(そのユーザーの記録は無いが)選択可能にする。
export function seasonOptionsFromChampionshipSeries(
  championshipSeries: ChampionshipSeriesType[],
): SeasonOption[] {
  const today = todayJSTDateString();

  return championshipSeries
    .filter((cs) => isStarted(cs, today))
    .map((cs) => ({ value: seasonValue(cs), label: cs.title }));
}

// 今日(JST)が属するシーズンの season 識別子を返す。
// 該当が無ければ「開始済みの最新シーズン」(= seasonOptionsFromChampionshipSeries の先頭)に
// フォールバックする。未開催のシーズンへはフォールバックしない: 選択肢に無い値になって
// select の表示と取得データが食い違ううえ、取得結果も空(称号なし・バッジ0件)になるため。
// 開始済みのシーズンが1件も無ければ ""(バックエンドが現在シーズンを既定として補う)。
export function currentSeasonValue(championshipSeries: ChampionshipSeriesType[]): string {
  const today = todayJSTDateString();

  const current =
    championshipSeries.find((cs) => isCurrent(cs, today)) ??
    championshipSeries.find((cs) => isStarted(cs, today));

  return current ? seasonValue(current) : "";
}
