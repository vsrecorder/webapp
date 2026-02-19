"use client";

import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import { SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Switch } from "@heroui/react";
import { Input } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { Tabs, Tab } from "@heroui/react";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { RadioGroup, Radio } from "@heroui/react";
import { NumberInput } from "@heroui/react";
import { Textarea } from "@heroui/react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import { MatchGetResponseType } from "@app/types/match";
import { MatchUpdateRequestType, MatchUpdateResponseType } from "@app/types/match";
import { GameRequestType } from "@app/types/game";

type Props = {
  match: MatchGetResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function UpdateMatchModal({
  match,
  setMatches,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const [qualifyingRoundFlg, setQualifyingRoundFlg] = useState(false);
  const [finalTournamentFlg, setFinalTournamentFlg] = useState(false);
  const [isValidedFlg, setIsValidedFlg] = useState(true);

  const [opponentsDeckInfo, setOpponentsDeckInfo] = useState<string>("");

  const [isGoFirst, setIsGoFirst] = useState("-1");
  const [isVictory, setIsVictory] = useState("-1");

  const [isDefaultVictory, setIsDefaultVictory] = useState(false);
  const [isDefaultDefeat, setIsDefaultDefeat] = useState(false);

  const [yourPrizeCards, setYourPrizeCards] = useState(0);
  const [opponentsPrizeCards, setOpponentsPrizeCards] = useState(0);

  const [memo, setMemo] = useState("");

  const [isDisabled, setIsDisabled] = useState(false);
  const [couldUpdateFlg, setCouldUpdateFlg] = useState(false);

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    // 下方向に30px以上スワイプしたら閉じる
    if (diff > 30) {
      startY.current = null;
      onClose();
    }
  };

  useEffect(() => {
    if (!match || !isOpen) return;

    setQualifyingRoundFlg(match.qualifying_round_flg ?? false);
    setFinalTournamentFlg(match.final_tournament_flg ?? false);
    setOpponentsDeckInfo(match.opponents_deck_info ?? "");

    setIsGoFirst(match.games?.[0]?.go_first ? "1" : "0");
    setIsVictory(match.victory_flg ? "1" : "0");

    setIsDefaultVictory(match.default_victory_flg ?? false);
    setIsDefaultDefeat(match.default_defeat_flg ?? false);

    setYourPrizeCards(match.games?.[0]?.your_prize_cards ?? 0);
    setOpponentsPrizeCards(match.games?.[0]?.opponents_prize_cards ?? 0);

    setMemo(match.memo ?? "");
  }, [match, isOpen]);

  useEffect(() => {
    if (qualifyingRoundFlg && finalTournamentFlg) {
      setIsValidedFlg(false);
    } else {
      setIsValidedFlg(true);
    }
  }, [qualifyingRoundFlg, finalTournamentFlg]);

  useEffect(() => {
    if (opponentsDeckInfo === "" || isGoFirst === "-1" || isVictory === "-1") {
      setCouldUpdateFlg(false);
    } else {
      setCouldUpdateFlg(true);
    }
  }, [opponentsDeckInfo, isGoFirst, isVictory]);

  useEffect(() => {
    // 不戦勝/不戦敗が選択された場合
    if (isDefaultVictory || isDefaultDefeat) {
      setIsDisabled(true);

      setOpponentsDeckInfo("");

      setIsGoFirst("-1");
      setIsVictory("-1");

      setYourPrizeCards(0);
      setOpponentsPrizeCards(0);

      if (isDefaultVictory) {
        setIsVictory("1");
      } else {
        setIsVictory("0");
      }

      // どちらかが戻された場合
    } else if (!isDefaultVictory && !isDefaultDefeat) {
      setIsDisabled(false);

      setIsVictory("-1");
    }
  }, [isDefaultVictory, isDefaultDefeat]);

  const updateBO1Match = async (onClose: () => void) => {
    setCouldUpdateFlg(false);

    let games: GameRequestType[] = [];

    if (isGoFirst === "-1" || isVictory === "-1") {
      if (!(isDefaultVictory || isDefaultDefeat)) {
        addToast({
          title: "エラーが発生しました",
          description: <>エラーが発生しました</>,
          color: "danger",
          timeout: 5000,
        });

        onClose();

        return;
      }
    }

    if (!isDefaultVictory && !isDefaultDefeat) {
      const game: GameRequestType = {
        go_first: isGoFirst === "1",
        winnging_flg: isVictory === "1",
        your_prize_cards: yourPrizeCards,
        opponents_prize_cards: opponentsPrizeCards,
        memo: "",
      };

      games = [game];
    }

    const data: MatchUpdateRequestType = {
      record_id: match?.record_id ?? "",
      deck_id: match?.deck_id ?? "",
      deck_code_id: match?.deck_code_id ?? "",
      opponents_user_id: "",
      bo3_flg: false,
      qualifying_round_flg: qualifyingRoundFlg,
      final_tournament_flg: finalTournamentFlg,
      default_victory_flg: isDefaultVictory,
      default_defeat_flg: isDefaultDefeat,
      victory_flg: isVictory === "1",
      opponents_deck_info: opponentsDeckInfo,
      memo: memo,
      games: games,
    };

    const toastId = addToast({
      title: "対戦結果を更新中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/matches/${match?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: MatchUpdateResponseType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の更新が完了",
        description: "対戦結果を更新しました",
        color: "success",
        timeout: 3000,
      });

      setMatches((prev) => {
        if (!prev) return [ret];

        return prev.map((m) => (m.id === ret.id ? ret : m));
      });

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の更新に失敗",
        description: (
          <>
            対戦結果の更新に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  return (
    <Modal
      size="md"
      placement="bottom"
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={() => {
        setQualifyingRoundFlg(false);
        setFinalTournamentFlg(false);

        setOpponentsDeckInfo("");

        setIsGoFirst("-1");
        setIsVictory("-1");

        setIsDefaultVictory(false);
        setIsDefaultDefeat(false);

        setYourPrizeCards(0);
        setOpponentsPrizeCards(0);

        setMemo("");

        setIsDisabled(false);
        setCouldUpdateFlg(false);
      }}
      hideCloseButton
      className="h-[calc(100dvh-168px)] max-h-[calc(100dvh-168px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="px-3 py-3 flex flex-col gap-1 cursor-grab"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />
              <div>対戦結果を編集</div>
            </ModalHeader>
            <ModalBody className="flex flex-col gap-0 px-1 py-1 overflow-y-auto">
              <Tabs fullWidth size="sm" className="left-0 right-0 pl-1 pr-1 font-bold">
                <Tab key="bo1" title="BO1">
                  <div className="flex flex-col gap-3 pt-0">
                    <Card shadow="md" className="w-full">
                      <CardHeader className="pb-0 text-tiny">
                        予選/トーナメント
                      </CardHeader>
                      <CardBody className="">
                        <CheckboxGroup
                          size="md"
                          label=""
                          isInvalid={!isValidedFlg}
                          errorMessage=""
                          orientation="horizontal"
                          classNames={{
                            base: "",
                            wrapper: "flex items-center justify-center gap-21 mx-auto",
                          }}
                        >
                          <Checkbox
                            value="qualifying_round"
                            isSelected={qualifyingRoundFlg}
                            onChange={(e) => {
                              setQualifyingRoundFlg(e.target.checked);
                            }}
                          >
                            予選
                          </Checkbox>
                          <Checkbox
                            value="final_tournament"
                            isSelected={finalTournamentFlg}
                            onChange={(e) => {
                              setFinalTournamentFlg(e.target.checked);
                            }}
                          >
                            トーナメント
                          </Checkbox>
                        </CheckboxGroup>
                      </CardBody>
                    </Card>

                    <Card shadow="md" className="w-full">
                      <CardHeader className="pb-0 text-tiny">
                        <label className="flex items-center gap-1">
                          相手のデッキ
                          <span className="text-red-500 text-sm">*</span>
                        </label>
                      </CardHeader>
                      <CardBody className="flex items-center">
                        <div className="pl-1 flex items-center gap-3 w-full">
                          <div className="flex gap-1.5">
                            <Button
                              isDisabled={isDisabled}
                              isIconOnly
                              aria-label=""
                              variant="bordered"
                              //className="rounded-xl border-gray-400"
                              className="w-11 h-11 p-0 rounded-xl border-gray-400 overflow-hidden"
                            >
                              <Image
                                alt="unknown"
                                src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                className="w-full h-full object-cover scale-150 origin-bottom -translate-y-0.5"
                              />
                              {/*
                                <Image
                                  alt="unknown"
                                  src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                  className="w-full h-full object-cover scale-125 origin-bottom -translate-y-0.5"
                                />
                                 */}
                            </Button>

                            <Button
                              isDisabled={isDisabled}
                              isIconOnly
                              aria-label=""
                              variant="bordered"
                              //className="rounded-xl border-gray-400"
                              className="w-11 h-11 p-0 rounded-xl border-gray-400 overflow-hidden"
                            >
                              <Image
                                alt="unknown"
                                src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                className="w-full h-full object-cover scale-150 origin-bottom -translate-y-0.5"
                              />
                              {/*
                                <Image
                                  alt="unknown"
                                  src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                                  className="w-full h-full object-cover scale-125 origin-bottom -translate-y-0.5"
                                />
                                 */}
                            </Button>
                          </div>

                          <Input
                            isDisabled={isDisabled}
                            size="md"
                            radius="md"
                            type="text"
                            label=""
                            labelPlacement="outside"
                            placeholder="例）メガルカリオ"
                            value={opponentsDeckInfo}
                            onChange={(e) => setOpponentsDeckInfo(e.target.value)}
                          />
                        </div>
                      </CardBody>
                    </Card>

                    <div className="flex items-center gap-6">
                      <Card shadow="md" className="w-full">
                        <CardHeader className="pb-0 text-tiny">
                          <label className="flex items-center gap-1">
                            先攻/後攻
                            <span className="text-red-500 text-sm">*</span>
                          </label>
                        </CardHeader>
                        <CardBody className="">
                          <RadioGroup
                            isRequired
                            isDisabled={isDisabled}
                            size="md"
                            label=""
                            orientation="horizontal"
                            value={isGoFirst}
                            onValueChange={setIsGoFirst}
                            classNames={{
                              base: "items-center",
                              wrapper: "flex items-center gap-6",
                            }}
                          >
                            <Radio value="1">先攻</Radio>
                            <Radio value="0">後攻</Radio>
                          </RadioGroup>
                        </CardBody>
                      </Card>

                      <Card shadow="md" className="w-full">
                        <CardHeader className="pb-0 text-tiny">
                          <label className="flex items-center gap-1">
                            勝ち/負け
                            <span className="text-red-500 text-sm">*</span>
                          </label>
                        </CardHeader>
                        <CardBody className="">
                          <RadioGroup
                            isRequired
                            isDisabled={isDisabled}
                            size="md"
                            label=""
                            orientation="horizontal"
                            value={isVictory}
                            onValueChange={setIsVictory}
                            classNames={{
                              base: "items-center",
                              wrapper: "flex items-center gap-6",
                            }}
                          >
                            <Radio value="1">勝ち</Radio>
                            <Radio value="0">負け</Radio>
                          </RadioGroup>
                        </CardBody>
                      </Card>
                    </div>

                    <div className="flex items-center gap-5">
                      <NumberInput
                        label="自分"
                        placeholder=""
                        isDisabled={isDisabled}
                        minValue={0}
                        maxValue={6}
                        defaultValue={0}
                        value={yourPrizeCards}
                        onValueChange={setYourPrizeCards}
                        className=""
                      />

                      <span className="font-bold text-2xl">-</span>

                      <NumberInput
                        label="相手"
                        placeholder=""
                        isDisabled={isDisabled}
                        minValue={0}
                        maxValue={6}
                        defaultValue={0}
                        value={opponentsPrizeCards}
                        onValueChange={setOpponentsPrizeCards}
                        className=""
                      />
                    </div>

                    <Textarea
                      size="md"
                      className=""
                      label="対戦メモ"
                      placeholder="対戦のメモを残そう"
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setMemo(inputValue);
                      }}
                    />
                  </div>
                </Tab>
                <Tab key="bo3" title="BO3" isDisabled></Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter className="flex items-center">
              <div className="w-full">
                <div className="flex items-center gap-6">
                  <Switch
                    size="md"
                    isDisabled={isDisabled && isDefaultDefeat}
                    isSelected={isDefaultVictory}
                    onValueChange={setIsDefaultVictory}
                  >
                    不戦勝
                  </Switch>
                  <Switch
                    size="md"
                    isDisabled={isDisabled && isDefaultVictory}
                    isSelected={isDefaultDefeat}
                    onValueChange={setIsDefaultDefeat}
                  >
                    不戦敗
                  </Switch>
                </div>
              </div>
              <Button
                color="success"
                variant="solid"
                isDisabled={!isValidedFlg || (!isDisabled && !couldUpdateFlg)}
                onPress={() => {
                  updateBO1Match(onClose);
                }}
                className="font-bold"
              >
                更新
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
