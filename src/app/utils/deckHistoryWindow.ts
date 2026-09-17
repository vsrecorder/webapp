// 相手デッキ候補に使う「自身の過去マッチ」の対象期間。
//
// 環境は数か月で入れ替わるため、古い対戦まで候補に出すと、いま当たらないデッキが
// 上位に残り続ける(候補は出現回数の多い順に並ぶので、昔たくさん当たったデッキほど残る)。
// 期間で区切り、直近の対戦だけから候補を作る。
//
// 他ユーザの水増し候補にも期間の絞り込みはあるが、そちらはサーバ側で行う
// (core-apiserver の adr/opponent-deck-candidates.md)。ここは自身の履歴だけを対象にする。

type MatchWithCreatedAt = { created_at: Date };

// OWN_DECK_HISTORY_WINDOW_MONTHS は自身の履歴を遡る月数。
export const OWN_DECK_HISTORY_WINDOW_MONTHS = 6;

// ownDeckHistoryCutoff は候補に含める下限の日時(これより前の対戦は候補にしない)。
export function ownDeckHistoryCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - OWN_DECK_HISTORY_WINDOW_MONTHS);

  return cutoff;
}

/*
 * filterOwnDeckHistoryWindow は、候補の対象期間に収まる対戦だけを返す。
 *
 * 判定は created_at(記録した日時)で行う。対戦日(親recordのevent_date)のほうが
 * 実態には近いが、対戦一覧の応答に含まれないため、取得できる値で近似する
 * (サーバ側の全体候補の集計も同じく matches.created_at で期間を切っている)。
 *
 * created_at が欠けている・日付として解釈できない対戦は、期間を判定できないため
 * 候補に含めない(古いデータが素通りするより、候補に出ないほうが害が小さい)。
 */
export function filterOwnDeckHistoryWindow<T extends MatchWithCreatedAt>(
  matches: T[] | undefined,
  now: Date = new Date(),
): T[] {
  if (!matches) return [];

  const cutoff = ownDeckHistoryCutoff(now).getTime();

  return matches.filter((match) => {
    const createdAt = new Date(match.created_at).getTime();
    if (Number.isNaN(createdAt)) return false;

    return createdAt >= cutoff;
  });
}
