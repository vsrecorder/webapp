"use client";

import { ReactNode } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { NumberInput } from "@heroui/react";
import { Button } from "@heroui/react";

import ChoiceButtonGroup from "@app/components/molecules/ChoiceButtonGroup";
import {
  GameInput,
  newGameInput,
  needsThirdGame,
  submittedGames,
  bo3Result,
  isBO3GamesFilled,
} from "@app/utils/bo3";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

type Props = {
  games: GameInput[];
  onChange: (index: number, patch: Partial<GameInput>) => void;
  isDisabled: boolean;
};

// BO3(2本先取)のゲーム入力欄。
// 対戦結果の作成モーダルと更新モーダルで共用する。
export default function BO3GamesInput({ games, onChange, isDisabled }: Props) {
  // 1勝1敗のときのみ3本目を入力できる(入力は任意。空欄なら両者引き分け)。
  const isOneOneState = needsThirdGame(games);
  const isFirstTwoFilled = games[0].victory !== "-1" && games[1].victory !== "-1";

  const decided = submittedGames(games);
  const wins = decided.filter((g) => g.victory === "1").length;
  const losses = decided.filter((g) => g.victory === "0").length;
  const result = bo3Result(games);
  // 勝敗だけで対戦結果が確定しているか(表示用)。isFilled は登録可否(先攻/後攻も必要)。
  const isDecided = result !== "incomplete";
  const isFilled = isBO3GamesFilled(games);

  // 2-0/0-2で決着した場合、3本目は畳んで理由を表示する
  const thirdGameLockedNote = isFirstTwoFilled
    ? `${wins} - ${losses} で決着したため不要`
    : "1・2本目を入力してください";

  // 結果表示の色。勝ち=緑 / 負け=赤 / 引き分け=グレー(ニュートラル)。
  const resultColorClass =
    result === "win"
      ? "text-success"
      : result === "lose"
        ? "text-danger"
        : "text-default-600";

  const resultBgClass = !isDecided
    ? "bg-default-100"
    : result === "win"
      ? "bg-success/15"
      : result === "lose"
        ? "bg-danger/15"
        : "bg-default-200/60";

  const resultLabel = result === "win" ? "勝利" : result === "lose" ? "敗北" : "引き分け";

  // 対戦結果の表記。両者引き分けのときのみ「1分」を添える。
  // 例) 2勝0敗（勝利） / 0勝2敗（敗北） / 1勝1敗1分（引き分け）
  const drawSuffix = result === "draw" ? "1分" : "";
  const resultText = `${wins}勝${losses}敗${drawSuffix}（${resultLabel}）`;

  // 3本目に何か入力されているか(ラジオ式のボタンは選択解除できないため、
  // 引き分けに戻すにはこのフラグを見てクリアボタンを出す)。
  const thirdGame = games[2];
  const isThirdGameEntered =
    thirdGame.goFirst !== "-1" ||
    thirdGame.victory !== "-1" ||
    thirdGame.yourPrizeCards > 0 ||
    thirdGame.opponentsPrizeCards > 0;

  // 3本目の入力をクリアして両者引き分け(1勝1敗のまま)に戻す
  const clearThirdGame = () => onChange(2, newGameInput());

  // topSlot は「N本目」ラベルの右側(勝ち/負けラジオの上部)に差し込む要素。
  // 3本目の「引き分けに戻す」ボタンをここに置く。
  const renderGame = (index: number, topSlot?: ReactNode) => {
    const game = games[index];

    return (
      <Card shadow="none" className="w-full border border-default-200">
        <CardBody className="overflow-visible flex flex-col gap-2 py-2">
          {/* min-h を固定し、「引き分けに戻す」ボタンの表示/非表示で行の高さが
              変わって下の要素がずれないようにする */}
          <div className="flex min-h-[24px] items-center justify-between gap-2">
            <span className="w-fit rounded-md bg-default-200 px-1.5 py-0.5 text-[10px] font-bold text-default-600">
              {index + 1}本目
            </span>
            {topSlot}
          </div>

          <div className="flex items-center justify-between gap-2">
            <ChoiceButtonGroup
              className="flex-1 min-w-0"
              size="sm"
              value={game.goFirst}
              onChange={(value) => onChange(index, { goFirst: value })}
              isDisabled={isDisabled}
              options={[
                { value: "1", label: "先攻", color: "secondary" },
                { value: "0", label: "後攻", color: "secondary" },
              ]}
            />

            <ChoiceButtonGroup
              className="flex-1 min-w-0"
              size="sm"
              value={game.victory}
              onChange={(value) => onChange(index, { victory: value })}
              isDisabled={isDisabled}
              options={[
                { value: "1", label: "勝ち", color: "success" },
                { value: "0", label: "負け", color: "danger" },
              ]}
            />
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
              onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
            />

            <span className="text-lg font-bold">-</span>

            <NumberInput
              size="sm"
              label="相手"
              isDisabled={isDisabled}
              minValue={0}
              maxValue={6}
              value={game.opponentsPrizeCards}
              onValueChange={(value) => onChange(index, { opponentsPrizeCards: value })}
              onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
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
        <CardBody className="overflow-visible flex flex-col gap-1.5">
          {renderGame(0)}
          {renderGame(1)}

          {/* 3本目は1勝1敗のときのみ入力できる。入力は任意で、空欄なら両者引き分け。
              勝敗を選んでしまっても、クリアすれば両者引き分けに戻せる。 */}
          {isOneOneState ? (
            <>
              {renderGame(
                2,
                isThirdGameEntered && (
                  <Button
                    size="sm"
                    variant="light"
                    radius="lg"
                    isDisabled={isDisabled}
                    onPress={clearThirdGame}
                    className="h-6 shrink-0 px-2 text-[10px] font-bold text-default-500"
                  >
                    引き分けに戻す
                  </Button>
                ),
              )}
              <span className="px-1 text-[10px] text-default-500">
                3本目を行わず時間切れになった場合は空欄のままにすると「引き分け」になります
              </span>
            </>
          ) : (
            <Card
              shadow="none"
              className="w-full border border-dashed border-default-200 bg-default-50 opacity-60"
            >
              <CardBody className="overflow-visible py-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-default-200 px-1.5 py-0.5 text-[10px] font-bold text-default-600">
                    3本目
                  </span>
                  <span className="text-[10px] text-default-500">
                    {thirdGameLockedNote}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}
        </CardBody>
      </Card>

      {/* 対戦全体の結果はゲームの勝敗から自動で決まる（ユーザーには選ばせない）。
          中央に大きく表示する。 */}
      <Card shadow="none" className={`w-full ${resultBgClass}`}>
        <CardBody className="overflow-visible py-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[10px] font-bold text-default-500">
              対戦結果 ・ 自動で判定
            </span>

            {isDecided ? (
              <>
                <span
                  className={`text-xl font-bold tabular-nums text-balance ${resultColorClass}`}
                >
                  {resultText}
                </span>
                {/* 結果は確定しているが、登録には各ゲームの先攻/後攻の入力も必要 */}
                {!isFilled && (
                  <span className="text-[10px] font-bold text-warning">
                    先攻/後攻も入力すると登録できます
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-default-500">
                ゲームの勝敗を入力してください
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
