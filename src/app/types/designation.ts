export type DesignationType = {
  id: string;
  tier: number;
  code: string;
  emoji: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
};

export type DesignationLadderItemType = DesignationType & {
  achieved: boolean;
  current_value: number;
};

export type UserDesignationType = {
  user_id: string;
  season: string;
  current: DesignationType | null;
  ladder: DesignationLadderItemType[];
};
