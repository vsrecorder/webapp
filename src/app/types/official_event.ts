export type OfficialEventResponseType = {
  type_id: number;
  league_type: number;
  start_date: Date;
  end_date: Date;
  count: number;
  official_events: OfficialEventType[];
};

export type OfficialEventType = {
  id: number;
  title: string;
  address: string;
  venue: string;
  date: Date;
  started_at: Date;
  ended_at: Date;
  type_name: string;
  league_title: string;
  regulation_title: string;
  csp_flg: boolean;
  capacity: number;
  shop_id: number;
  shop_name: string;
  prefecture_id: number;
  prefecture_name: string;
  environment_id: string;
  environment_title: string;
};

export type OfficialEventGetByIdResponseType = OfficialEventType;
