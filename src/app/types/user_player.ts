export type UserPlayerType = {
  id: string;
  created_at: string;
  user_id: string;
  player_id: string;
  locked_until: string;
};

export type UserPlayerGetResponseType = UserPlayerType;

export type UserPlayerCreateRequestType = {
  player_id: string;
};

export type UserPlayerCreateResponseType = UserPlayerType;

// 連携済みプレイヤーIDの入賞1件。イベント単位ではなく入賞1件を1要素として返す
// (トレーナー情報ページでは入賞1件を1枚のカードとして並べるため)。
export type UserPlayerCityleagueResultType = {
  official_event_id: number;
  league_type: number;
  date: Date;
  event_title: string;
  shop_name: string;
  prefecture_name: string;
  // 開催日が属する対戦環境の名称(environments.title)
  environment_title: string;
  rank: number;
  point: number;
  deck_code: string;
  event_detail_result_url: string;
};

export type UserPlayerCityleagueResultsGetResponseType = {
  season: string;
  count: number;
  results: UserPlayerCityleagueResultType[];
};
