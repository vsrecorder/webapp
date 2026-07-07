export type UserPlayerType = {
  id: string;
  created_at: string;
  user_id: string;
  player_id: string;
  locked_until: string;
  // ランキング履歴が未登録(連携直後等)の場合は null
  champion_ship_point: number | null;
  ranking_date: string | null;
};

export type UserPlayerGetResponseType = UserPlayerType;

export type UserPlayerCreateRequestType = {
  player_id: string;
  challenge_token: string;
};

export type UserPlayerCreateResponseType = UserPlayerType;

export type UserPlayerVerifyRequestType = {
  player_id: string;
};

export type UserPlayerOwnershipChallengeType = {
  token: string;
  avatar_id: number;
  avatar_title: string;
  avatar_image_url: string;
  avatar_detail: string;
  expires_at: string;
};

export type UserPlayerVerifyResponseType = {
  player_id: string;
  nickname: string;
  avatar_image: string;
  current_league: string;
  prefecture: string;
  challenge: UserPlayerOwnershipChallengeType;
};
