"use client";

import { useState } from "react";
import { useEffect } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
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

import { LuCirclePlus } from "react-icons/lu";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchCreateRequestType } from "@app/types/match";
import { GameRequestType } from "@app/types/game";

type Props = {
  record: RecordGetByIdResponseType;
  onCreated: () => void;
};

export default function CreateMatchModal({ record, onCreated }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

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
  const [couldCreate, setCouldCreate] = useState(false);

  useEffect(() => {
    if (qualifyingRoundFlg && finalTournamentFlg) {
      setIsValidedFlg(false);
    } else {
      setIsValidedFlg(true);
    }
  }, [qualifyingRoundFlg, finalTournamentFlg]);

  useEffect(() => {
    if (opponentsDeckInfo === "" || isGoFirst === "-1" || isVictory === "-1") {
      setCouldCreate(false);
    } else {
      setCouldCreate(true);
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

  /*
    マッチ作成のAPIを叩く関数
    Next.jsのAPI Routesを経由してAPIを叩く
  */
  const createBO1Match = async (onClose: () => void) => {
    setCouldCreate(false);

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

    const match: MatchCreateRequestType = {
      record_id: record.id,
      deck_id: record.deck_id,
      deck_code_id: record.deck_code_id,
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
      title: "対戦結果を追加中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(match),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の追加が完了",
        description: "対戦結果を追加しました",
        color: "success",
        timeout: 3000,
      });

      onCreated();

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "対戦結果の追加に失敗",
        description: (
          <>
            対戦結果の追加に失敗しました
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
    <>
      <Button size="sm" radius="full" onPress={onOpen}>
        <div className="flex items-center gap-1">
          <span className="font-bold text-tiny">
            <LuCirclePlus />
          </span>
          <span className="font-bold">対戦結果を追加する</span>
        </div>
      </Button>

      <Modal
        isOpen={isOpen}
        size="md"
        placement="bottom"
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
          setCouldCreate(false);
        }}
        className="h-[calc(100dvh-168px)] max-h-[calc(100dvh-168px)] mt-26 my-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg px-3">対戦結果を追加</ModalHeader>
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
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex gap-2">
                              <Button
                                isDisabled={isDisabled}
                                isIconOnly
                                aria-label=""
                                variant="bordered"
                                //className="rounded-xl border-gray-400"
                                className="w-12 h-12 p-0 rounded-xl border-gray-400 overflow-hidden"
                              >
                                <Image
                                  alt="3_mega"
                                  src="/3_mega.png"
                                  className="w-full h-full object-cover scale-125 origin-bottom -translate-y-0.5"
                                />
                                {/*
                                <LuPlus className="text-lg text-gray-500" />
                                 */}
                              </Button>

                              <Button
                                isDisabled={isDisabled}
                                isIconOnly
                                aria-label=""
                                variant="bordered"
                                //className="rounded-xl border-gray-400"
                                className="w-12 h-12 p-0 rounded-xl border-gray-400 overflow-hidden"
                              >
                                <Image
                                  alt="1017_teal"
                                  src="/1017_teal.png"
                                  className="w-full h-full object-cover scale-125 origin-bottom -translate-y-0.5"
                                />
                                {/*
                                <LuPlus className="text-lg text-gray-500" />
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
                  color="primary"
                  variant="solid"
                  isDisabled={!isValidedFlg || (!isDisabled && !couldCreate)}
                  onPress={() => {
                    createBO1Match(onClose);
                  }}
                >
                  作成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
