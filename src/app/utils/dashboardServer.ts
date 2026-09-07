import { cache } from "react";

import { UserBadgesType } from "@app/types/badge";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { UserDesignationType } from "@app/types/designation";
import { UserEnvironmentBadgesResponseType } from "@app/types/environment_badge";
import { DEFAULT_REGULATION_ID } from "@app/types/regulation";
import { UserStreakType } from "@app/types/streak";
import { UserPlayerType } from "@app/types/user_player";
import { UserGymOfficialEventGetResponseType } from "@app/types/user_gym";
import { UserStatType } from "@app/types/user_stat";
import { MyGymEventRange, getMyGymEventRange } from "@app/utils/myGymEventRange";
import { currentSeasonValue } from "@app/utils/season";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";
import { getCurrentYearMonth } from "@app/utils/yearMonthOptions";

/*
 * ダッシュボード(「/」)の各パネルが最初に出す値を、ページの描画中にサーバでまとめて取る。
 *
 * 以前は各パネルがマウント後に自分で取っていた。本番の実測(2026-09-07)では「/」の起動 1 回あたり
 * 6 本の API がハイドレーション後に飛び、1 本あたり BFF 経由で 40〜190ms かかっていた。
 * ここで先に取っておけば、その往復がまるごと消えて最初の描画から中身が出る。
 * 「/」は 1 日に 2,000 回以上ハードロードされる(PWA の起動)アプリの入口で、
 * 記録一覧(/records)よりもハードロードの回数が多い。
 *
 * サーバから見た上流は速い(実測 p50 3〜90ms)ので、8 本を並列に取ってもページの応答は
 * 数十 ms しか伸びない。記録一覧(recordListServer)と同じ考え方。
 *
 * どれかが取れなくても undefined にしてページは出す(パネルが従来どおり自分で取り直す)。
 * null と undefined は意味が違うので混ぜないこと:
 *   undefined = サーバでは取れなかった → パネルが自分で取る
 *   null      = 取れた結果が「無い」   → パネルは取りに行かない(未連携のプレイヤーIDなど)
 */

// 1 本あたりの上限。ここで固まるとページ全体が遅れるので、遅いものは諦めてパネルに任せる
const PANEL_TIMEOUT_MS = 2500;

async function getPanel<T>(label: string, url: string, headers: HeadersInit): Promise<T | undefined> {
  try {
    return await fetchUpstream<T>(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(PANEL_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`failed to fetch ${label} for the dashboard`, error);
    return undefined;
  }
}

// プレイヤーID の連携は「未連携」が多数派で、上流はそれを 404 で返す。
// BFF(/api/usersplayers)と同じく、未連携は null(取れた上で「無い」)として扱う
async function getUserPlayer(headers: HeadersInit): Promise<UserPlayerType | null | undefined> {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
      cache: "no-store",
      method: "GET",
      headers,
      signal: AbortSignal.timeout(PANEL_TIMEOUT_MS),
    });

    if (res.status === 404) return null;
    if (!res.ok) return undefined;

    return (await res.json()) as UserPlayerType;
  } catch (error) {
    console.error("failed to fetch the linked player for the dashboard", error);
    return undefined;
  }
}

function statUrl(userId: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return upstreamUrl`/api/v1beta/users/${userId}/stats?${query}`;
}

export type DashboardInitialDataType = {
  // 「はじめの一歩」パネル(シーズンを問わない全バッジ)
  badges?: UserBadgesType;
  // バッジパネル(選択中シーズン)。season が空のときは badges と同じ内容になる
  seasonBadges?: UserBadgesType;
  // この値を取った時点で選ばれていたシーズン。パネル側は自分が出しているシーズンと
  // 一致するときだけ初期値として使う
  season: string;
  environmentBadges?: UserEnvironmentBadgesResponseType;
  streak?: UserStreakType;
  designation?: UserDesignationType;
  // 連携済みのプレイヤーID。null は「未連携」(取れた上で無い)
  userPlayer?: UserPlayerType | null;
  // 戦績パネルの初期表示(対戦環境で絞り、レギュレーションは既定)
  stat?: UserStatType;
  // 戦績パネルが初期表示に使う対戦環境。パネル側の初期値と一致するときだけ使う
  statEnvironmentId: string;
  // プロフィールカードの当月戦績
  monthlyStat?: UserStatType;
  // その当月("YYYY-MM")
  yearMonth: string;
  /*
   * Myジムのイベント(登録店舗の今後 2 週間)。
   * このパネルは初期表示で見えている位置にあるのに、以前はブラウザで取っていたため
   * 他のパネルの取得と並んで最後に出ていた(本番ビルド・CPU 4x の実測で 5.9 秒)。
   */
  myGymEvents?: UserGymOfficialEventGetResponseType;
  // その期間。パネル側はこの期間で描く(自分で決めると日付境界でずれて初期値が無駄になる)
  myGymRange: MyGymEventRange;
};

/*
 * ダッシュボードの各パネルの初期値をまとめて取る。
 *
 * 取りに行くクエリは、各パネルがマウント直後に投げるものと厳密に同じにすること
 * (食い違うと初期値が使われず、結局パネルが取り直して往復が消えない)。
 * シーズン・当月はどちらも JST の暦日から決まり、サーバとブラウザで同じ値になる
 * (utils/season・utils/yearMonthOptions)。
 *
 * environmentId は UserStatPanel の初期値と同じ「今日の対戦環境、無ければ一覧の先頭」を渡すこと。
 * 同じリクエスト内で二度呼ばれても 1 回で済ませる
 */
export const getDashboardInitialData = cache(
  async (
    userId: string,
    championshipSeries: ChampionshipSeriesType[],
    environmentId: string,
  ): Promise<DashboardInitialDataType> => {
    const season = currentSeasonValue(championshipSeries);
    const yearMonth = getCurrentYearMonth();
    const myGymRange = getMyGymEventRange();

    const headers: HeadersInit = { Accept: "application/json" };
    const authHeaders: HeadersInit = {
      Accept: "application/json",
      Authorization: "Bearer " + signUpstreamToken(userId),
    };

    // upstreamUrl は空の URLSearchParams を渡すと末尾の "?" を落とす。BFF 側と同じ組み立てにする
    const noQuery = new URLSearchParams();
    const seasonQuery = new URLSearchParams(season ? { season } : {});

    const [
      badges,
      seasonBadges,
      environmentBadges,
      streak,
      designation,
      userPlayer,
      stat,
      monthlyStat,
      myGymEvents,
    ] = await Promise.all([
      getPanel<UserBadgesType>(
        "badges",
        upstreamUrl`/api/v1beta/users/${userId}/badges?${noQuery}`,
        headers,
      ),
      getPanel<UserBadgesType>(
        "season badges",
        upstreamUrl`/api/v1beta/users/${userId}/badges?${seasonQuery}`,
        headers,
      ),
      getPanel<UserEnvironmentBadgesResponseType>(
        "environment badges",
        upstreamUrl`/api/v1beta/users/${userId}/environment_badges`,
        headers,
      ),
      getPanel<UserStreakType>(
        "streak",
        upstreamUrl`/api/v1beta/users/${userId}/streak`,
        headers,
      ),
      getPanel<UserDesignationType>(
        "designation",
        upstreamUrl`/api/v1beta/users/${userId}/designation?${seasonQuery}`,
        headers,
      ),
      getUserPlayer(authHeaders),
      environmentId
        ? getPanel<UserStatType>(
            "stat",
            statUrl(userId, {
              regulation_id: String(DEFAULT_REGULATION_ID),
              environment_id: environmentId,
            }),
            headers,
          )
        : Promise.resolve<UserStatType | undefined>(undefined),
      getPanel<UserStatType>(
        "monthly stat",
        statUrl(userId, { year_month: yearMonth }),
        headers,
      ),
      getPanel<UserGymOfficialEventGetResponseType>(
        "my gym events",
        upstreamUrl`/api/v1beta/users/my_gyms/official_events?${new URLSearchParams({
          start_date: myGymRange.startDate,
          end_date: myGymRange.endDate,
        })}`,
        authHeaders,
      ),
    ]);

    return {
      badges,
      seasonBadges,
      season,
      environmentBadges,
      streak,
      designation,
      userPlayer,
      stat,
      statEnvironmentId: environmentId,
      monthlyStat,
      yearMonth,
      myGymEvents,
      myGymRange,
    };
  },
);
