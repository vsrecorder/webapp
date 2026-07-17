import { useEffect, useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Textarea } from "@heroui/react";
//import { Checkbox } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Link } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType, DeckCodeCreateRequestType } from "@app/types/deck_code";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

const DECK_CODE_LENGTH = 20;
const DECK_CODE_CHECK_DEBOUNCE_MS = 500;

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
  const [memo, setMemo] = useState<string>("");
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

    // デッキコードは必ず20桁なので、桁数が違う時点で問い合わせるまでもなく無効
    if (newdeckcode.length !== DECK_CODE_LENGTH) {
      setIsValidedDeckCode(false);
      return;
    }

    let cancelled = false;

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
        if (!cancelled) {
          setIsValidedDeckCode(data.result === 1);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setIsValidedDeckCode(false);
        }
      }
    };

    // 入力が落ち着くまで外部APIへの問い合わせを遅らせる
    const timerId = setTimeout(checkDeckCode, DECK_CODE_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
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
      memo: memo,
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

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      // キーボード表示などで可視領域より背が高くなったとき、モーダル全体が画面から
      // はみ出さないよう base に最大高を与え、はみ出す分は body 内スクロールにする
      scrollBehavior="inside"
      // 処理中(isDisabled)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
      isKeyboardDismissDisabled={isDisabled}
      hideCloseButton={isDisabled}
      onOpenChange={() => {
        if (isDisabled) return;
        onOpenChange();
      }}
      isDismissable={false}
      onClose={() => {
        setIsDisabled(false);
        setIsValidedDeckCode(true);

        setNewDeckCode("");
        setMemo("");
        //setIsSelected(false);
      }}
      classNames={{
        // scrollBehavior="inside" 既定の max-h(100%-8rem) は特にキーボード表示中に
        // 窮屈なため、余白を 3rem まで縮めてモーダルを大きく使う
        base: "sm:max-w-full max-h-[calc(100%-3rem)]",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {/* ヘッダー/ボディ/フッターは base(flex-col) の直下に置く。
            div で包むと body の高さ制約が効かず、内部スクロールが機能しない */}
        {(onClose) => (
          <>
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
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
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

              {deckcode?.code ? (
                // 差分未表示(中身が溢れない)ときに overflow-y-auto を付けたままにすると、
                // この領域に指を置いたスワイプが iOS で殺されモーダルがスクロールできなくなる
                <div
                  className={
                    newdeckcode && isValidedDeckCode ? "h-30 overflow-y-auto" : "h-30"
                  }
                >
                  {newdeckcode && isValidedDeckCode ? (
                    <DeckCardDiff
                      current_code={newdeckcode}
                      previous_code={deckcode.code}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="pb-0.5 pr-0">
                        <div className="font-bold text-tiny pb-1">追加されたカード</div>
                        <div className="pl-1 pb-1 flex flex-wrap gap-1">
                          <div className="h-5.5" />
                        </div>
                      </div>
                      <div className="pb-0.5 pr-0">
                        <div className="font-bold text-tiny pb-1">削除されたカード</div>
                        <div className="pl-1 pb-1 flex flex-wrap gap-1">
                          <div className="h-5.5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <></>
              )}

              <Textarea
                size="md"
                isDisabled={isDisabled}
                label="メモ"
                placeholder="このバージョンのメモを残そう"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
              />
            </ModalBody>
            <ModalFooter className="pt-3 pb-3 ">
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
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
