"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Image,
  Skeleton,
  Link,
  addToast,
  closeToast,
} from "@heroui/react";
import { LuLayers } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import { DeckCreateRequestType, DeckCreateResponseType } from "@app/types/deck";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

const DECK_CODE_LENGTH = 20;
const DECK_CODE_CHECK_DEBOUNCE_MS = 500;

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
};

// 施策A-2 クイックスタート: デッキコードとデッキ名を入力してデッキを作成し、
// そのまま「デッキ選択済み」の簡素化フォーム(/records/quick)へ遷移する。
// 既存の CreateDeckModal と違い、デッキコード・デッキ名を両方とも必須にし、
// 作成後に一覧へ戻らず記録作成へ直行する点がクイックスタートの肝。
export default function DeckCodeQuickStartModal({ isOpen, onOpenChange }: Props) {
  const router = useRouter();

  const [deckName, setDeckName] = useState("");
  const [deckCode, setDeckCode] = useState("");
  const [isValidatedDeckCode, setIsValidatedDeckCode] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // デッキコードは20桁固定。桁数が違えば即無効、20桁なら外部APIで有効性を確認する。
  useEffect(() => {
    setImageLoaded(false);

    if (deckCode.length !== DECK_CODE_LENGTH) {
      setIsValidatedDeckCode(false);
      return;
    }

    let cancelled = false;

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", deckCode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!cancelled) {
          setIsValidatedDeckCode(data.result === 1);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setIsValidatedDeckCode(false);
        }
      }
    };

    const timerId = setTimeout(checkDeckCode, DECK_CODE_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [deckCode]);

  // デッキコード(20桁・有効)とデッキ名の両方が揃って初めて「始める」を押せる
  const canSubmit =
    deckName.trim() !== "" &&
    deckCode.length === DECK_CODE_LENGTH &&
    isValidatedDeckCode &&
    !isDisabled;

  const resetState = () => {
    setDeckName("");
    setDeckCode("");
    setIsValidatedDeckCode(false);
    setIsDisabled(false);
    setImageLoaded(false);
  };

  const startWithDeckCode = async () => {
    if (!canSubmit) return;

    setIsDisabled(true);

    const toastId = addToast({
      title: "デッキを登録中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const deck: DeckCreateRequestType = {
        name: deckName.trim(),
        private_flg: true,
        deck_code: deckCode,
        private_deck_code_flg: true,
        pokemon_sprites: [],
      };

      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deck),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const created: DeckCreateResponseType = await res.json();

      if (toastId) closeToast(toastId);

      sendGAEvent("event", "cta_quickstart_deck_created", {});
      triggerNotificationsRefresh();

      // 作成したデッキを選択済みにして、そのまま簡素化フォームへ直行する。
      const params = new URLSearchParams({
        deck_id: created.id,
        deck_code_id: created.latest_deck_code?.id ?? "",
        deck_name: created.name,
      });
      router.push(`/records/quick?${params.toString()}`);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) closeToast(toastId);
      addToast({
        title: "デッキ登録に失敗",
        description: (
          <>
            デッキの登録に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      setIsDisabled(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      placement="center"
      scrollBehavior="inside"
      isDismissable={false}
      isKeyboardDismissDisabled={isDisabled}
      hideCloseButton={isDisabled}
      onOpenChange={() => {
        if (isDisabled) return;
        onOpenChange();
      }}
      onClose={resetState}
      classNames={{
        base: "sm:max-w-full max-h-[calc(100%-3rem)]",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-lg px-3">デッキ登録から始める</ModalHeader>
            <ModalBody className="px-3 py-1 gap-3">
              <Input
                isRequired
                isDisabled={isDisabled}
                type="text"
                label="デッキ名"
                labelPlacement="outside"
                placeholder="デッキ名を入力"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />

              <Input
                isRequired
                isDisabled={isDisabled}
                isInvalid={deckCode !== "" && !isValidatedDeckCode}
                errorMessage="有効なデッキコード(20桁)を入力してください"
                type="text"
                label="デッキコード"
                labelPlacement="outside"
                placeholder="デッキコードを貼り付け"
                value={deckCode}
                onChange={(e) => setDeckCode(e.target.value)}
              />

              {deckCode ? (
                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  <Image
                    radius="sm"
                    shadow="none"
                    alt={deckCode}
                    src={
                      isValidatedDeckCode
                        ? `https://www.pokemon-card.com/deck/deckView.php/deckID/${deckCode}.png`
                        : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                    }
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {}}
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuLayers className="text-xl text-primary" />
                  </div>
                  <div className="font-bold text-tiny text-primary">
                    公式サイトの20桁のデッキコードを貼り付け
                  </div>
                  <div className="text-tiny text-default-400 text-center">
                    貼り付けると、ここにデッキ画像が表示されます。
                  </div>
                </div>
              )}

              <div className="-translate-y-1">
                <Link
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href="https://www.pokemon-card.com/deck/"
                  className="text-xs"
                >
                  <span>トレーナーズウェブサイトでデッキを構築する</span>
                </Link>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={onClose}
                className="font-bold"
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={!canSubmit}
                isLoading={isDisabled}
                onPress={startWithDeckCode}
                className="font-bold"
              >
                始める
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
