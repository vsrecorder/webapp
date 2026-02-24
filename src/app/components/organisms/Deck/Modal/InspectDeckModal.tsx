import { useRef } from "react";

import { useState } from "react";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import InspectDeck from "@app/components/organisms/Deck/InspectDeck";

import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckcode: DeckCodeType | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function InspectDeckModal({
  deckcode,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);

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

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      isDismissable={false}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="px-1 py-3 pb-0 flex flex-col gap-1 cursor-grab"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div className="px-2">初動チェック</div>
            </ModalHeader>

            <ModalBody className="px-1">
              <div className="flex flex-col gap-5">
                <div className="pt-5 flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-tiny">
                      <>デッキコード：</>
                      {deckcode?.code ? (
                        <Snippet
                          size="sm"
                          radius="none"
                          timeout={3000}
                          disableTooltip={true}
                          hideSymbol={true}
                        >
                          {deckcode.code}
                        </Snippet>
                      ) : (
                        "なし"
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  {deckcode?.code ? (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt={deckcode.code}
                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  ) : (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt="デッキコードなし"
                        src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="px-1 pt-1">
                <InspectDeck deckcode={deckcode} />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
