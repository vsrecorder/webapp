// BO3(2本先取)の対戦結果を扱うためのロジック。
//
// 対戦結果の作成モーダルと更新モーダルで同じ判定を使うため、ここに集約する。
// (同じ判定を両方に書くと、片方だけ直されて仕様が食い違う)

import { GameType } from "@app/types/game";

// BO3の1ゲーム分の入力値。goFirst/victory は未選択を "-1" で表す
export type GameInput = {
  goFirst: string;
  victory: string;
  yourPrizeCards: number;
  opponentsPrizeCards: number;
};

export const newGameInput = (): GameInput => ({
  goFirst: "-1",
  victory: "-1",
  yourPrizeCards: 0,
  opponentsPrizeCards: 0,
});

export const newGameInputs = (): GameInput[] => [
  newGameInput(),
  newGameInput(),
  newGameInput(),
];

// BO3で3本目まで行うのは1・2本目が1勝1敗で並んだ場合のみ。
// 2-0/0-2で決着した場合は2ゲームで確定する。
export const needsThirdGame = (games: GameInput[]) =>
  games[0].victory !== "-1" &&
  games[1].victory !== "-1" &&
  games[0].victory !== games[1].victory;

// 実際に登録するゲーム(2本先取で決着した時点まで)を返す
export const submittedGames = (games: GameInput[]) =>
  needsThirdGame(games) ? games.slice(0, 3) : games.slice(0, 2);

// BO3の対戦全体の勝敗(2本先取した側が勝ち)
export const bo3VictoryFlg = (games: GameInput[]) =>
  submittedGames(games).filter((g) => g.victory === "1").length >= 2;

// 登録に必要なゲームがすべて入力されているか
export const isBO3GamesFilled = (games: GameInput[]) => {
  if (games[0].victory === "-1" || games[1].victory === "-1") return false;
  return submittedGames(games).every(
    (g) => g.goFirst !== "-1" && g.victory !== "-1",
  );
};

// 登録済みのゲーム(APIレスポンス)を編集用の入力値に変換する。
// 常に3ゲーム分の配列を返し、足りない分は未入力で埋める。
export const toGameInputs = (games: GameType[] | null | undefined): GameInput[] => {
  const inputs = newGameInputs();

  (games ?? []).slice(0, 3).forEach((game, i) => {
    inputs[i] = {
      goFirst: game.go_first ? "1" : "0",
      victory: game.winnging_flg ? "1" : "0",
      yourPrizeCards: game.your_prize_cards ?? 0,
      opponentsPrizeCards: game.opponents_prize_cards ?? 0,
    };
  });

  return inputs;
};

// 登録済みのゲームからゲームスコア(勝ち数 - 負け数)を求める。一覧/詳細の表示に使う
export const gameScore = (games: GameType[] | null | undefined) => {
  const list = games ?? [];
  const wins = list.filter((g) => g.winnging_flg).length;

  return { wins, losses: list.length - wins };
};
