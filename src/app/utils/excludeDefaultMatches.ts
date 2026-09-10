/*
 * 不戦勝・不戦敗を戦績集計から外すかどうかの設定。
 *
 * 不戦勝/不戦敗は対戦そのものが行われていないため、勝率を「実力」として読むときは雑音に
 * なる。既定で外すのは、ホーム最上部のトレーナー情報パネルが「自分がどれだけ勝てているか」を
 * 見る場所であり、対戦していない試合を混ぜた数字のほうが誤解を招くため。外すと公式の
 * スイスドロー成績とは一致しなくなるので、含める側にも切り替えられるようにしてある。
 *
 * 保存先は localStorage。表示の好みであって記録そのものではないので端末ごとで足りる
 * (同じカードの戦績の表示/非表示と揃えてある)。
 *
 * サーバ描画では localStorage を読めないため、サーバ側は必ず既定
 * (DEFAULT_EXCLUDE_DEFAULT_MATCHES)で取る。カード側もこの既定と一致するときだけ
 * サーバの値を初期値として使い、食い違うときはハイドレーション後に取り直す。
 * 両者がこの定数を共有していないと、既定を変えたときに「初期値を使う条件」だけが
 * 取り残されて毎回取り直しになるので、必ずここを参照すること。
 */

// localStorage のキー。"false" のときだけ含める(未保存は既定に従う)
export const EXCLUDE_DEFAULT_MATCHES_KEY = "profile_exclude_default_matches";

export const DEFAULT_EXCLUDE_DEFAULT_MATCHES = true;

// localStorage から読んだ生の値を設定へ戻す。null(未保存・読めない環境)は既定になる
export function toExcludeDefaultMatches(stored: string | null): boolean {
  if (stored === null) return DEFAULT_EXCLUDE_DEFAULT_MATCHES;
  return stored !== "false";
}
