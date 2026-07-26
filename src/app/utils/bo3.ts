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

// BO3の対戦全体の結果。両者引き分け(ダブルドロー)は BO3 でのみ発生する。
export type BO3Result = "win" | "lose" | "draw" | "incomplete";

// 1ゲーム分の入力(先攻/後攻・勝敗)が揃っているか
const isGameFilled = (g: GameInput) => g.goFirst !== "-1" && g.victory !== "-1";

// 1・2本目が1勝1敗で並んでいるか。
// この場合のみ「3本目を行う」か「時間切れで両者引き分け」のどちらかになる。
export const isOneOne = (games: GameInput[]) =>
  games[0].victory !== "-1" &&
  games[1].victory !== "-1" &&
  games[0].victory !== games[1].victory;

// 1勝1敗のあと3本目の勝敗が入力されているか(入力されていなければ引き分け扱い)。
// 3本目は勝敗が決着に直結するため、先攻/後攻が未選択でも「行われた」とみなす。
const hasThirdGame = (games: GameInput[]) =>
  isOneOne(games) && games[2].victory !== "-1";

// 3本目の入力欄を表示すべきか(1勝1敗のときのみ。ただし入力は任意=引き分けも選べる)
export const needsThirdGame = (games: GameInput[]) => isOneOne(games);

// 実際に登録するゲームを返す。
// 2-0/0-2 → 2件、2-1 → 3件、1勝1敗で時間切れ(引き分け) → 2件。
export const submittedGames = (games: GameInput[]) =>
  hasThirdGame(games) ? games.slice(0, 3) : games.slice(0, 2);

// BO3の対戦全体の結果を導出する。
// 2勝で勝ち / 2敗で負け / 1勝1敗のまま3本目なしなら両者引き分け。
export const bo3Result = (games: GameInput[]): BO3Result => {
  // 1・2本目は先攻/後攻・勝敗の両方が入力されている必要がある
  if (!isGameFilled(games[0]) || !isGameFilled(games[1])) return "incomplete";

  const wins = submittedGames(games).filter((g) => g.victory === "1").length;
  const losses = submittedGames(games).filter((g) => g.victory === "0").length;

  if (wins >= 2) return "win";
  if (losses >= 2) return "lose";
  // 1勝1敗で3本目が入力されていない → 両者引き分け
  return "draw";
};

// BO3の対戦全体の勝敗(2本先取した側が勝ち)。引き分け/未確定は false。
export const bo3VictoryFlg = (games: GameInput[]) => bo3Result(games) === "win";

// 両者引き分け(ダブルドロー)か
export const bo3DrawFlg = (games: GameInput[]) => bo3Result(games) === "draw";

// 登録に必要なゲームがすべて入力され、結果が確定しているか。
// 対戦結果の表示(bo3Result)は勝敗だけで反映するが、登録するには
// 送信対象の各ゲームに先攻/後攻・勝敗の両方が入力されている必要がある。
// (3本目も勝敗だけでなく先攻/後攻の入力を必須にする)
export const isBO3GamesFilled = (games: GameInput[]) =>
  bo3Result(games) !== "incomplete" && submittedGames(games).every(isGameFilled);

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
