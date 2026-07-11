// 自由形式イベント(公式イベントやTonamel以外でユーザが任意に管理するイベント)
export type UnofficialEventType = {
  id: string;
  user_id: string;
  title: string;
  date: string;
};

export type UnofficialEventCreateRequestType = {
  title: string;
  date: string;
};

export type UnofficialEventGetByIdResponseType = UnofficialEventType;

export type UnofficialEventCreateResponseType = UnofficialEventType;
