export type GameType = {
  id: string;
  created_at: Date;
  match_id: string;
  user_id: string;
  go_first: boolean;
  winnging_flg: boolean;
  your_prize_cards: number;
  opponents_prize_cards: number;
  memo: string;
};
