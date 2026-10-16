import { OfficialEventType } from "@app/types/official_event";

/*
 * 開催日ページでリーグ区分ごとの開催数を数える。
 *
 * クライアント部品(CityleagueDateEventTabs)から使うので、サーバ側の取得(core-apiserver・バトラボ)を
 * 含む utils/cityleague.ts から切り離してある。あちらから import するとブラウザ向けの
 * バンドルに取得のコードまで入る。
 */

// 開催日ページでリーグ区分ごとの開催数を見せるときの並び順。
// タブ一覧(cityleagueListPrefs.CITYLEAGUE_TABS)と同じオープン→シニア→ジュニア
const LEAGUE_TITLE_ORDER = ["オープン", "シニア", "ジュニア"];

export type CityleagueLeagueCount = {
  leagueTitle: string;
  count: number;
};

// events を league_title でグルーピングし、区分ごとの開催数を返す。
export function countEventsByLeagueTitle(
  events: OfficialEventType[],
): CityleagueLeagueCount[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.league_title, (counts.get(event.league_title) ?? 0) + 1);
  }

  const indexOf = (leagueTitle: string) => {
    const index = LEAGUE_TITLE_ORDER.indexOf(leagueTitle);
    return index === -1 ? LEAGUE_TITLE_ORDER.length : index;
  };

  return [...counts.entries()]
    .map(([leagueTitle, count]) => ({ leagueTitle, count }))
    .sort((a, b) => indexOf(a.leagueTitle) - indexOf(b.leagueTitle));
}
