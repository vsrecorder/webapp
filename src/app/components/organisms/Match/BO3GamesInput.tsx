"use client";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { RadioGroup, Radio } from "@heroui/react";
import { NumberInput } from "@heroui/react";

import {
  GameInput,
  needsThirdGame,
  submittedGames,
  bo3VictoryFlg,
  isBO3GamesFilled,
} from "@app/utils/bo3";

type Props = {
  games: GameInput[];
  onChange: (index: number, patch: Partial<GameInput>) => void;
  isDisabled: boolean;
};

// BO3(2本先取)のゲーム入力欄。
// 対戦結果の作成モーダルと更新モーダルで共用する。
export default function BO3GamesInput({ games, onChange, isDisabled }: Props) {
  // 1・2本目が2-0/0-2で決着した場合は3本目を入力しない
  const isDecidedInTwoGames = !needsThirdGame(games);
  const isFirstTwoFilled = games[0].victory !== "-1" && games[1].victory !== "-1";

  const decided = submittedGames(games);
  const wins = decided.filter((g) => g.victory === "1").length;
  const losses = decided.filter((g) => g.victory === "0").length;
  const isVictory = bo3VictoryFlg(games);
  const isFilled = isBO3GamesFilled(games);

  // 3本目が入力できない理由。2-0で決着したのか、まだ1・2本目が未入力なのか
  const thirdGameNote = isFirstTwoFilled
    ? `${wins} - ${losses} で決着したため不要`
    : "1・2本目を入力してください";

  const renderGame = (index: number) => {
    const game = games[index];

    return (
      <Card shadow="none" className="w-full border border-default-200">
        <CardBody className="flex flex-col gap-2 py-2">
          <span className="w-fit rounded-md bg-default-200 px-1.5 py-0.5 text-[10px] font-bold text-default-600">
            {index + 1}本目
          </span>

          <div className="flex items-center justify-between gap-2">
            <RadioGroup
              isRequired
              isDisabled={isDisabled}
              size="sm"
              label=""
              orientation="horizontal"
              value={game.goFirst}
              onValueChange={(value) => onChange(index, { goFirst: value })}
              classNames={{ wrapper: "flex items-center gap-3" }}
            >
              <Radio value="1">先攻</Radio>
              <Radio value="0">後攻</Radio>
            </RadioGroup>

            <RadioGroup
              isRequired
              isDisabled={isDisabled}
              size="sm"
              label=""
              orientation="horizontal"
              value={game.victory}
              onValueChange={(value) => onChange(index, { victory: value })}
              classNames={{ wrapper: "flex items-center gap-3" }}
            >
              <Radio value="1">勝ち</Radio>
              <Radio value="0">負け</Radio>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-3">
            <NumberInput
              size="sm"
              label="自分"
              isDisabled={isDisabled}
              minValue={0}
              maxValue={6}
              value={game.yourPrizeCards}
              onValueChange={(value) => onChange(index, { yourPrizeCards: value })}
            />

            <span className="text-lg font-bold">-</span>

            <NumberInput
              size="sm"
              label="相手"
              isDisabled={isDisabled}
              minValue={0}
              maxValue={6}
              value={game.opponentsPrizeCards}
              onValueChange={(value) =>
                onChange(index, { opponentsPrizeCards: value })
              }
            />
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <>
      <Card shadow="md" className="w-full">
        <CardHeader className="pb-0 text-tiny">
          <label className="flex items-center gap-1">
            ゲームごとの結果
            <span className="text-red-500 text-sm">*</span>
          </label>
        </CardHeader>
        <CardBody className="flex flex-col gap-1.5">
          {renderGame(0)}
          {renderGame(1)}

          {/* 3本目は1勝1敗で並んだときのみ入力する */}
          {isDecidedInTwoGames ? (
            <Card
              shadow="none"
              className="w-full border border-dashed border-default-200 bg-default-50 opacity-60"
            >
              <CardBody className="py-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-default-200 px-1.5 py-0.5 text-[10px] font-bold text-default-600">
                    3本目
                  </span>
                  <span className="text-[10px] text-default-500">{thirdGameNote}</span>
                </div>
              </CardBody>
            </Card>
          ) : (
            renderGame(2)
          )}
        </CardBody>
      </Card>

      {/* 対戦全体の勝敗はゲームの勝敗から自動で決まる（ユーザーには選ばせない） */}
      <Card
        shadow="none"
        className={`w-full ${
          !isFilled ? "bg-default-100" : isVictory ? "bg-success/15" : "bg-danger/15"
        }`}
      >
        <CardBody className="py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-default-600">対戦結果</span>

            {isFilled ? (
              <>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    isVictory ? "text-success" : "text-danger"
                  }`}
                >
                  {wins} - {losses}
                </span>
                <span
                  className={`text-sm font-bold ${
                    isVictory ? "text-success" : "text-danger"
                  }`}
                >
                  {isVictory ? "勝ち" : "負け"}
                </span>
              </>
            ) : (
              <span className="text-xs text-default-500">
                ゲームの勝敗を入力してください
              </span>
            )}

            <span className="ml-auto text-[10px] text-default-500">自動で判定</span>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
