import { useEffect, useMemo, useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Link } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType, DeckCodeCreateRequestType } from "@app/types/deck_code";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function CreateDeckCodeModal({
  deck,
  //setDeck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [newdeckcode, setNewDeckCode] = useState<string>("");
  //const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isValidedDeckCode, setIsValidedDeckCode] = useState<boolean>(true);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  /*
    デッキコードが有効かどうかチェック
  */
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

  if (!deck) {
    return;
  }

  const createNewDeckCode = async (onClose: () => void) => {
    const data: DeckCodeCreateRequestType = {
      deck_id: deck.id,
      code: newdeckcode,
      private_code_flg: true,
      //private_code_flg: isSelected,
      memo: "",
    };

    setIsDisabled(true);

    const toastId = addToast({
      title: "新しいバージョンを作成中",
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
        title: "新しいバージョンの作成が完了",
        description: "新しいバージョンを作成しました",
        color: "success",
        timeout: 3000,
      });

      setDeckCode(ret);

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "新しいバージョンの作成に失敗",
        description: (
          <>
            新しいバージョンの作成に失敗しました
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

  const currentDeckCode = useMemo(
    () => ({ code: newdeckcode }) as DeckCodeType,
    [newdeckcode],
  );

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      onOpenChange={onOpenChange}
      isDismissable={false}
      onClose={() => {
        setIsDisabled(false);
        setIsValidedDeckCode(true);

        setNewDeckCode("");
        //setIsSelected(false);
      }}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <div>
            <ModalHeader className="flex flex-col gap-1 px-3">
              新しいバージョンを作成
            </ModalHeader>
            <ModalBody className="px-3 py-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <Input
                  isRequired
                  isDisabled={isDisabled}
                  isInvalid={!isValidedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder={
                    deckcode && deckcode.code ? deckcode.code : "デッキコードを入力"
                  }
                  value={newdeckcode}
                  onChange={(e) => setNewDeckCode(e.target.value)}
                />

                {/*
                <Checkbox
                  isDisabled={newdeckcode == "" || isDisabled}
                  //isDisabled={newdeckcode == "" || !isValidedDeckCode || isDisabled}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelected}
                  onValueChange={setIsSelected}
                >
                  デッキコードを非公開にする
                </Checkbox>
                */}

                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={newdeckcode ? newdeckcode : "デッキコードなし"}
                    src={
                      isValidedDeckCode && newdeckcode
                        ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${newdeckcode}.png`
                        : deckcode
                          ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckcode.code}.png`
                          : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    className={isValidedDeckCode && newdeckcode ? "" : "grayscale"}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {}}
                  />
                </div>

                {deckcode?.code ? (
                  <div className="-translate-y-2">
                    <Link
                      isExternal
                      showAnchorIcon
                      underline="always"
                      href={`https://www.pokemon-card.com/deck/deck.html?deckID=${deckcode.code}`}
                      className="pl-1 text-tiny"
                    >
                      [{deckcode.code}] から新しいデッキコードを作成
                    </Link>
                  </div>
                ) : (
                  <div className="-translate-y-2">
                    <Link
                      isExternal
                      showAnchorIcon
                      underline="always"
                      href={`https://www.pokemon-card.com/deck/deck.html`}
                      className="pl-1 text-tiny"
                    >
                      新しいデッキコードを作成
                    </Link>
                  </div>
                )}
              </div>

              <div className="h-30 overflow-y-auto">
                {deckcode?.code && newdeckcode && isValidedDeckCode && !isDisabled ? (
                  <DeckCardDiff
                    current_deckcode={currentDeckCode}
                    previous_deckcode={deckcode}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="pb-0.5 pr-0">
                      <div className="font-bold text-tiny pb-1">追加されたカード</div>
                      <div className="pl-1 pb-1 flex flex-wrap gap-1">
                        <div>
                          <Skeleton className="h-5.5 w-20 rounded-2xl" />
                        </div>
                        <div>
                          <Skeleton className="h-5.5 w-26 rounded-2xl" />
                        </div>
                        <div>
                          <Skeleton className="h-5.5 w-18 rounded-2xl" />
                        </div>
                      </div>
                    </div>
                    <div className="pb-0.5 pr-0">
                      <div className="font-bold text-tiny pb-1">削除されたカード</div>
                      <div className="pl-1 pb-1 flex flex-wrap gap-1">
                        <div>
                          <Skeleton className="h-5.5 w-16 rounded-2xl" />
                        </div>
                        <div>
                          <Skeleton className="h-5.5 w-22 rounded-2xl" />
                        </div>
                        <div>
                          <Skeleton className="h-5.5 w-28 rounded-2xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  onClose();
                }}
                className="font-bold"
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={!isValidedDeckCode || !newdeckcode || isDisabled}
                onPress={() => {
                  createNewDeckCode(onClose);
                }}
                className="font-bold"
              >
                作成
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
