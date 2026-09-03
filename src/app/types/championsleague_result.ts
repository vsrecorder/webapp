// 大型大会の入賞1件。シティリーグ(Result)と違い point を持たない
// （championsleague_results に列が無いため、公式が返す値も保存していない）。
export type ChampionsleagueResult = {
  player_id: string;
  player_name: string;
  rank: number;
  deck_code: string;
};

// 1イベント（リーグ区分 × Day）の結果。1大会はこれを数件持つ。
export type ChampionsleagueEventResultType = {
  championsleague_schedule_id: string;
  official_event_id: number;
  league_type: number;
  date: Date;
  event_detail_result_url: string;
  results: ChampionsleagueResult[];
};

export type ChampionsleagueResultGetByScheduleIdResponseType = {
  championsleague_schedule_id: string;
  count: number;
  event_results: ChampionsleagueEventResultType[];
};

// 入賞者を含まない、イベント単位の軽量な応答（/championsleague_results/events）
export type ChampionsleagueResultEventType = {
  championsleague_schedule_id: string;
  official_event_id: number;
  league_type: number;
  date: Date;
};

export type ChampionsleagueResultGetEventsResponseType = {
  count: number;
  events: ChampionsleagueResultEventType[];
};
