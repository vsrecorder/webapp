/*
 * トレーナー情報パネルの戦績(勝率・試合数・勝敗)を表示するかどうかの設定。
 *
 * 人前でホームを開いても勝率を見せずに済むよう、カード上の目のアイコンで伏せられる。
 * 既定は表示。伏せていても数字の取得自体は行い、表示だけを「——」に置き換える。
 *
 * 保存先は localStorage。端末ごとの表示の好みなので、アカウントには紐付けない
 * (不戦勝・不戦敗の除外設定と同じ扱い。utils/excludeDefaultMatches)。
 *
 * サーバ描画では localStorage を読めないので、同じ値を cookie にも書いて渡す。
 * cookie が無いと最初の1フレームだけ既定(=表示)で描かれ、伏せている端末では
 * 目のアイコンが一瞬「表示中」に見えてから伏せ字へ切り替わる。
 * 読み書きは hooks/useStatsVisible(土台は hooks/usePersistedFlag)に集約してある。
 */

// localStorage の鍵。出荷済みの名前なので変えない(変えると保存済みの選択が既定へ戻る)
export const STATS_VISIBLE_KEY = "profile_stats_visible";

export const STATS_VISIBLE_COOKIE = "statsVisible";

// 1年保つ。表示の好みはそう頻繁に変わらないので、間隔が空いた再訪でも効かせたい
export const STATS_VISIBLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const DEFAULT_STATS_VISIBLE = true;

/*
 * cookie の値を設定へ戻す。cookie は誰でも書き換えられるので、"true" / "false" 以外は
 * 無いものとして扱う(null=既定)。
 */
export function parseStatsVisibleCookie(
  value: string | null | undefined,
): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
