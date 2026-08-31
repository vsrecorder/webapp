import { OfficialEventType } from "@app/types/official_event";
import { ShopType } from "@app/types/shop";

export type UserGymType = {
  shop: ShopType;
  created_at: string;
};

export type UserGymGetResponseType = {
  // limit は1ユーザが登録できる上限(上流の usecase.MaxUserGymsPerUser)。
  // 「あと何枠空いているか」は件数との差で出し、フロント側に数字を持たない。
  limit: number;
  count: number;
  user_gyms: UserGymType[];
};

export type UserGymCreateRequestType = {
  shop_id: number;
};

export type UserGymCreateResponseType = UserGymType;

// Myジムと、その店舗で期間内に開催される公式イベントをまとめて返す。
export type UserGymOfficialEventGetResponseType = {
  start_date: string;
  end_date: string;
  limit: number;
  user_gyms: UserGymType[];
  count: number;
  official_events: OfficialEventType[];
};
