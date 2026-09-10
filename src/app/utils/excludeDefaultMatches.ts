/*
 * 不戦勝・不戦敗を戦績集計から外すかどうかの設定。
 *
 * 不戦勝/不戦敗は対戦そのものが行われていないため、勝率を「実力」として読むときは雑音に
 * なる。既定で外すのは、ホームの戦績が「自分がどれだけ勝てているか」を見るものであり、
 * 対戦していない試合を混ぜた数字のほうが誤解を招くため。外すと公式のスイスドロー成績とは
 * 一致しなくなるので、含める側にも切り替えられるようにしてある。
 *
 * 設定は1つで、トレーナー情報パネル・戦績分析パネル・月毎の勝率推移パネルに効く。
 * 同じ画面の中で一方が66.7%、もう一方が60.0%と出ると、どちらが自分の勝率なのか
 * 分からなくなるため。
 *
 * 保存先は localStorage。表示の好みであって記録そのものではないので端末ごとで足りる
 * (トレーナー情報パネルの戦績の表示/非表示と揃えてある)。
 *
 * サーバ描画では localStorage を読めないので、同じ値を cookie にも書いて
 * (EXCLUDE_DEFAULT_MATCHES_COOKIE)サーバへ渡す。cookie が無い初回訪問だけ既定
 * (DEFAULT_EXCLUDE_DEFAULT_MATCHES)になる。
 *
 * cookie を経由しないと、外している端末でも最初の描画は既定(=外す)になり、
 *   ・トグルが一瞬だけ有効に見えてから外れる
 *   ・サーバが取った戦績が使えず、ハイドレーション後に必ず取り直しになる
 * の2つが起きる。localStorage を正としつつ、書くときは cookie も必ず一緒に更新すること
 * (書き込みは hooks/useExcludeDefaultMatches に集約してある)。
 */

/*
 * localStorage のキー。"false" のときだけ含める(未保存は既定に従う)。
 *
 * 名前が profile_ で始まるのは、この設定がトレーナー情報パネルだけのものとして
 * 先に出たため。戦績分析パネルにも効くようになった今は名前と合っていないが、
 * 改名すると保存済みの選択(「含める」に切り替えた端末)が既定へ戻ってしまうので、
 * 出荷済みのキーをそのまま使い続ける。
 */
export const EXCLUDE_DEFAULT_MATCHES_KEY = "profile_exclude_default_matches";

export const DEFAULT_EXCLUDE_DEFAULT_MATCHES = true;

/*
 * サーバ描画へ設定を渡すための cookie。値は "true" / "false"。
 *
 * localStorage と二重に持つのは、サーバが localStorage を読めないため
 * (ダッシュボードの並び DASHBOARD_LAYOUT_COOKIE と同じ手)。正は localStorage で、
 * cookie は「サーバに見せるための写し」。
 */
export const EXCLUDE_DEFAULT_MATCHES_COOKIE = "excludeDefaultMatches";

// 1年保つ。表示の好みはそう頻繁に変わらないので、間隔が空いた再訪でも効かせたい
export const EXCLUDE_DEFAULT_MATCHES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/*
 * cookie の値を設定へ戻す。cookie は誰でも書き換えられるので、"true" / "false" 以外は
 * 無いものとして扱う(null=既定)。
 */
export function parseExcludeDefaultMatchesCookie(
  value: string | null | undefined,
): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

// localStorage から読んだ生の値を設定へ戻す。null(未保存・読めない環境)は既定になる
export function toExcludeDefaultMatches(stored: string | null): boolean {
  if (stored === null) return DEFAULT_EXCLUDE_DEFAULT_MATCHES;
  return stored !== "false";
}

/*
 * 集計APIへ渡すクエリの値。
 *
 * APIの既定は「絞り込まない」(他の絞り込みパラメータと同じ流儀)で、こちらの既定とは
 * 別物なので、含める場合も含めて常に明示して送る。
 */
export function excludeDefaultMatchesParam(excluded: boolean): string {
  return String(excluded);
}

/*
 * 上の設定に依らず、常に不戦勝・不戦敗を外して集計する画面のためのクエリ。
 *
 * デッキの戦績は「このデッキがどれだけ勝てるか」を見るためのもので、対戦していない試合を
 * 混ぜる意味がない。トレーナー情報・戦績分析(user_stat)がトグルで切り替えられるのは
 * 公式のスイスドロー成績と突き合わせたい人がいるためだが、デッキ単位の勝率にその用途は
 * 無いため、みんなのデッキ環境(weekly_deck_usage_stat)と同じく常時除外にしてある。
 * 対戦相手のデッキ分析も同じ扱いにする(「どのデッキと当たったか」に不戦を数える根拠がなく、
 * 勝率の意味もデッキ使用率分析と揃う)。
 *
 * 適用先:
 *   - デッキ一覧カード・デッキ詳細の対戦成績
 *   - ダッシュボードのデッキ使用率分析・対戦相手のデッキ分析
 *   - デッキ詳細の対戦相手のデッキ分析
 *   - 対戦環境分析(EnvironmentWindowCard)。比較相手の環境平均が常時除外のため揃える
 *   - ふりかえり(バトルレポート)。全体戦績・デッキ・相手デッキを1枚ずつ見せる面なので、
 *     カードごとに条件が違うと同じ期間の勝率が2種類出てしまう。カード自身にも断りを出す
 *
 * 画面に「不戦勝・不戦敗を除いて集計しています」と断るのは、不戦が母数に入りうる面だけ。
 * 自分のデッキの戦績(デッキ使用率分析・デッキ一覧/詳細)やふりかえりの全体戦績は、
 * 不戦勝が「そのデッキを1回使って1勝」として数えられるため、外したことで数字が変わる。
 * 一方、対戦相手のデッキ分析は相手デッキが記録されている対戦だけが母数で、相手のいない
 * 不戦はそもそも入らない(結果が変わらない)。ここで断ると「入りうるものを外している」と
 * 読めて誤解を招くので、文言は出さない。
 *
 * 例外として、デッキセレクタの選択肢を作るために deck_usage を引く分
 * (月毎の勝率推移・対戦相手のデッキ分析)はこのクエリを使わず、従来どおり不戦を含める
 * (「使ったデッキ」の一覧なので、不戦しかない記録のデッキも候補に残す)。
 * 勝率推移のグラフ自体は上の設定に従う。
 */
export const EXCLUDE_DEFAULT_MATCHES_QUERY = "exclude_default_matches=true";

/*
 * 期間セレクタを持たない画面(デッキ一覧カード・デッキ詳細)が引く、全期間の戦績のクエリ。
 *
 * デッキ一覧はサーバ描画(deckListServer)とクライアント(useDeckUsageAllTime)の両方から
 * 同じ集計を引くので、条件が食い違うと戻り遷移のたびに数字が変わる。必ずここを共有すること。
 */
export const DECK_USAGE_ALL_TIME_QUERY = `all_time=true&${EXCLUDE_DEFAULT_MATCHES_QUERY}`;
