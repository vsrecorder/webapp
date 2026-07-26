"use client";

import { GameType } from "@app/types/game";

type Props = {
  games: GameType[];
  // ドットの直径(px)。一覧のチップ内では小さめ、詳細では大きめに使う
  size?: number;
  // 両者引き分け(BO3のみ)。true のとき推移の末尾に「D」ドットを付ける。
  // 引き分けは1勝1敗のまま時間切れになった状態で、各ゲーム自体は W/L のため、
  // 対戦全体が引き分けだったことは末尾のドットで示す。
  isDraw?: boolean;
};

// 勝敗の推移。1ゲームごとに W(緑) / L(赤) の丸を並べて表示する。
// BO3は1対戦が2〜3ゲームあるため、スコア(2-1)よりも「どの順で勝ち負けしたか」が分かる。
export default function GameStreak({ games, size = 12, isDraw = false }: Props) {
  return (
    <span className="flex items-center gap-0.75">
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

      {isDraw && (
        <span
          title="引き分け"
          className="flex shrink-0 items-center justify-center rounded-full bg-default-400 font-bold leading-none text-white"
          style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.54),
          }}
        >
          D
        </span>
      )}
    </span>
  );
}
