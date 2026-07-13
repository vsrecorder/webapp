export type Result = {
  player_id: string;
  player_name: string;
  rank: number;
  point: number;
  deck_code: string;
};

export type CityleagueResultType = {
  cityleague_schedule_id: string;
  official_event_id: number;
  league_type: number;
  date: Date;
  event_detail_result_url: string;
  results: Result[];
};

export type CityleagueResultGetResponseType = {
  league_type: number;
  from_date: Date;
  to_date: Date;
  count: number;
  event_results: CityleagueResultType[];
};

// 入賞者を含まない、イベント単位の軽量な応答（/cityleague_results/events）
export type CityleagueResultEventType = {
  official_event_id: number;
  league_type: number;
  date: Date;
};

export type CityleagueResultGetEventsResponseType = {
  count: number;
  events: CityleagueResultEventType[];
};
