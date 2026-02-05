"use client";

import { useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/ShowDeckModal";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckData: DeckGetByIdResponseType;
  deckcodeData: DeckCodeType | null;
};

export default function DeckCard({ deckData, deckcodeData }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);
  const [deckname, setDeckName] = useState<string>(deckData.name);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  if (deck) {
    return (
      <>
        <div className="w-full" onClick={() => onOpen()}>
          <Card className="pt-3 w-full">
            <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
              <div className="flex flex-col gap-1">
                <div className="font-bold text-medium pb-1">{deckname}</div>
                <div className="text-tiny">
                  作成日：
                  {new Date(deck.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-2 py-2">
              <DeckCodeCard deckcode={deckcode} />
            </CardBody>
          </Card>
        </div>

        <ShowDeckModal
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          deckname={deckname}
          setDeckName={setDeckName}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      </>
    );
  } else {
    return <></>;
  }
}

/*
  const [newdeckcode, setNewDeckCode] = useState<string>("");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isValidedDeckCode, setIsValidedDeckCode] = useState<boolean>(true);
*/

/*
    デッキコードが有効かどうかチェック
  */
/*
  useEffect(() => {
    if (!newdeckcode) {
      setIsValidedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", newdeckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        setIsValidedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [newdeckcode]);
  */

/*
  const createNewDeckCode = async () => {
    const data: DeckCodeCreateRequestType = {
      deck_id: deck_id,
      code: newdeckcode,
      private_code_flg: isSelected,
      memo: "",
    };

    const toastId = addToast({
      title: "デッキコードを作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成が完了",
        description: "デッキコードを作成しました",
        color: "success",
        timeout: 3000,
      });

      setDeckCode(ret);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成に失敗",
        description: (
          <>
            デッキコードの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };
  */

/*
      <Modal
        isOpen={isCreateVersionOpen}
        size={"sm"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onCreateVersionOpenChange}
        onClose={() => {
          setNewDeckCode("");
          setIsSelected(false);
        }}
        classNames={{
          base: "sm:max-w-full md:max-w-lg",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <div>
              <ModalHeader className="flex flex-col gap-1 px-3">
                新しいバージョンを作成
              </ModalHeader>
              <ModalBody className="px-3 py-1">
                <Input
                  //isDisabled={isDisabled}
                  isInvalid={!isValidedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="例）"
                  value={newdeckcode}
                  onChange={(e) => setNewDeckCode(e.target.value)}
                />

                <Checkbox
                  isDisabled={newdeckcode == "" || !isValidedDeckCode}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelected}
                  onValueChange={setIsSelected}
                >
                  デッキコードを非公開にする
                </Checkbox>

                <Image
                  className="relative z-0"
                  radius="sm"
                  shadow="none"
                  alt={newdeckcode ? newdeckcode : "デッキコードなし"}
                  src={
                    isValidedDeckCode
                      ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${newdeckcode}.jpg`
                      : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                  }
                  onLoad={() => {}}
                  onError={() => {}}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={() => {
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => {
                    createNewDeckCode();
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Register
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>
 */

/*
  const [newdeckcode, setNewDeckCode] = useState<string>("");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isValidedDeckCode, setIsValidedDeckCode] = useState<boolean>(true);
*/

/*
    デッキコードが有効かどうかチェック
  */
/*
  useEffect(() => {
    if (!newdeckcode) {
      setIsValidedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", newdeckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        setIsValidedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [newdeckcode]);
  */

/*
  const createNewDeckCode = async () => {
    const data: DeckCodeCreateRequestType = {
      deck_id: deck_id,
      code: newdeckcode,
      private_code_flg: isSelected,
      memo: "",
    };

    const toastId = addToast({
      title: "デッキコードを作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成が完了",
        description: "デッキコードを作成しました",
        color: "success",
        timeout: 3000,
      });

      setDeckCode(ret);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成に失敗",
        description: (
          <>
            デッキコードの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };



        <Modal
        isOpen={isCreateVersionOpen}
        size={"sm"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onCreateVersionOpenChange}
        onClose={() => {
          setNewDeckCode("");
          setIsSelected(false);
        }}
        classNames={{
          base: "sm:max-w-full md:max-w-lg",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <div>
              <ModalHeader className="flex flex-col gap-1 px-3">
                新しいバージョンを作成
              </ModalHeader>
              <ModalBody className="px-3 py-1">
                <Input
                  //isDisabled={isDisabled}
                  isInvalid={!isValidedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="例）"
                  value={newdeckcode}
                  onChange={(e) => setNewDeckCode(e.target.value)}
                />

                <Checkbox
                  isDisabled={newdeckcode == "" || !isValidedDeckCode}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelected}
                  onValueChange={setIsSelected}
                >
                  デッキコードを非公開にする
                </Checkbox>

                <Image
                  className="relative z-0"
                  radius="sm"
                  shadow="none"
                  alt={newdeckcode ? newdeckcode : "デッキコードなし"}
                  src={
                    isValidedDeckCode
                      ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${newdeckcode}.jpg`
                      : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                  }
                  onLoad={() => {}}
                  onError={() => {}}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={() => {
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => {
                    createNewDeckCode();
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Register
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>
  */
