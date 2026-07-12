"use client";

import { GameType } from "@app/types/game";

type Props = {
  games: GameType[];
  // ドットの直径(px)。一覧のチップ内では小さめ、詳細では大きめに使う
  size?: number;
};

// 勝敗の推移。1ゲームごとに W(緑) / L(赤) の丸を並べて表示する。
// BO3は1対戦が2〜3ゲームあるため、スコア(2-1)よりも「どの順で勝ち負けしたか」が分かる。
export default function GameStreak({ games, size = 12 }: Props) {
  return (
    <span className="flex items-center gap-[3px]">
      {games.map((game, i) => (
        <span
          key={i}
          title={`${i + 1}本目: ${game.winnging_flg ? "勝ち" : "負け"}`}
          className={`flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-white ${
            game.winnging_flg ? "bg-success" : "bg-danger"
          }`}
          style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.54),
          }}
        >
          {game.winnging_flg ? "W" : "L"}
        </span>
      ))}
    </span>
  );
}
