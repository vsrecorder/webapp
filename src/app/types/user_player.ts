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
