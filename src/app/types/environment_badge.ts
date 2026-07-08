export type UserEnvironmentBadgeType = {
  environment_id: string;
  title: string;
  from_date: string;
  to_date: string;
  achieved: boolean;
  achieved_at?: string;
};

export type UserEnvironmentBadgesResponseType = {
  user_id: string;
  badges: UserEnvironmentBadgeType[];
};
