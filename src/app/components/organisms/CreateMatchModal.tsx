"use client";

import { useSWRConfig } from "swr";

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

import { LuCirclePlus } from "react-icons/lu";

import { DeckCreateRequestType } from "@app/types/deck";

export default function CreateMatchModal() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [deckname, setDeckName] = useState<string>("");
  const [deckcode, setDeckCode] = useState<string>("");
  const [isSelectedPrivateCode, setIsSelectedPrivateCode] = useState<boolean>(false);
  const [isValidatedDeckCode, setIsValidatedDeckCode] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(true);

  const { mutate } = useSWRConfig();

  /*
    入力項目のチェック
    - デッキ名
    - デッキコード
      - 有効なデッキコードかどうか
  */
  useEffect(() => {
    if (deckname != "" && deckcode != "" && isValidatedDeckCode) {
      setIsInvalid(false);
    } else {
      setIsInvalid(true);
    }
  }, [deckname, deckcode, isValidatedDeckCode]);

  /*
    デッキコードが有効かどうかチェック
  */
  useEffect(() => {
    if (!deckcode) {
      setIsValidatedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setIsValidatedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidatedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [deckcode]);

  /*
    マッチ作成のAPIを叩く関数
    Next.jsのAPI Routesを経由してAPIを叩く
  */
  const createDeck = async () => {
    const deck: DeckCreateRequestType = {
      name: deckname,
      private_flg: false,
      deck_code: deckcode,
      private_deck_code_flg: isSelectedPrivateCode,
    };

    const toastId = addToast({
      title: "デッキ作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      mutate(`/api/decks/all`);

      addToast({
        title: "デッキ作成完了",
        description: "デッキを作成しました",
        color: "success",
        timeout: 3000,
      });
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキ作成失敗",
        description: (
          <>
            デッキの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };

  return (
    <>
      <Button size="sm" radius="full" onPress={onOpen}>
        <div className="flex items-center gap-1">
          <span className="text-xs">
            <LuCirclePlus />
          </span>
          <span className="text-xs">対戦結果を追加する</span>
        </div>
      </Button>

      <Modal
        isOpen={isOpen}
        size="md"
        placement="bottom"
        //hideCloseButton
        onOpenChange={onOpenChange}
        onClose={() => {
          setDeckName("");
          setDeckCode("");
          setIsSelectedPrivateCode(false);
        }}
        className="h-[calc(100dvh-192px)] max-h-[calc(100dvh-192px)] mt-26 my-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-lg px-3">対戦結果を追加</ModalHeader>
              <ModalBody className="px-3 py-0 overflow-y-auto">
                <Tabs fullWidth size="sm" className="left-0 right-0 pl-1 pr-1 font-bold">
                  <Tab key="bo1" title="BO1">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Switch size="md">不戦勝</Switch>
                        <Switch size="md">不戦敗</Switch>
                      </div>

                      <CheckboxGroup
                        defaultValue={[]}
                        size="sm"
                        label="予選 / トーナメント"
                        classNames={{
                          base: "",
                          wrapper: "flex flex-row gap-4",
                        }}
                      >
                        <Checkbox value="qualifying_round">予選</Checkbox>
                        <Checkbox value="final_tournament">トーナメント</Checkbox>
                      </CheckboxGroup>

                      <Input
                        isRequired
                        type="text"
                        label="相手のデッキ"
                        labelPlacement="outside"
                        placeholder="例）メガルカリオ"
                        value={deckname}
                        onChange={(e) => setDeckName(e.target.value)}
                      />

                      <RadioGroup
                        size="sm"
                        label="先攻 / 後攻"
                        classNames={{
                          base: "",
                          wrapper: "flex flex-row gap-4",
                        }}
                      >
                        <Radio value="head">先攻</Radio>
                        <Radio value="tail">後攻</Radio>
                      </RadioGroup>

                      <RadioGroup
                        size="sm"
                        label="勝敗"
                        classNames={{
                          base: "",
                          wrapper: "flex flex-row gap-4",
                        }}
                      >
                        <Radio value="win">勝利</Radio>
                        <Radio value="lose">敗北</Radio>
                      </RadioGroup>

                      <div className="flex items-center gap-5">
                        <NumberInput
                          isRequired
                          className="max-w-xs"
                          defaultValue={1024}
                          label="your_prizes"
                          placeholder="Enter the amount"
                        />
                        <NumberInput
                          isRequired
                          className="max-w-xs"
                          defaultValue={1024}
                          label="oppoments_prizes"
                          placeholder="Enter the amount"
                        />
                      </div>

                      <Textarea
                        size="sm"
                        className="w-full"
                        label="Description"
                        placeholder="Enter your description"
                      />
                    </div>
                  </Tab>
                  <Tab key="bo3" title="BO3" isDisabled></Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  onPress={() => {
                    setDeckName("");
                    setDeckCode("");
                    setIsSelectedPrivateCode(false);
                    onClose();
                  }}
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={isInvalid}
                  onPress={() => {
                    createDeck();
                    setDeckName("");
                    setDeckCode("");
                    setIsSelectedPrivateCode(false);
                    onClose();
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
