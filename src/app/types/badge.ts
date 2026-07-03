export type BadgeDefinitionType = {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string;
  icon_key: string;
  criteria_type: string;
  criteria_value: number;
};

export type UserBadgeType = BadgeDefinitionType & {
  achieved: boolean;
  achieved_at?: string;
  current_value: number;
};

export type UserBadgesType = {
  user_id: string;
  season: string;
  badges: UserBadgeType[];
};
