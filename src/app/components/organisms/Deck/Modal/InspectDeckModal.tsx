import { useState } from "react";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import InspectDeck from "@app/components/organisms/Deck/InspectDeck";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";

import { DeckCodeType } from "@app/types/deck_code";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { closingPassthroughClassNames } from "@app/utils/modal";

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

  const attachHeader = useModalDragToClose(onClose);

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      isDismissable={false}
      onOpenChange={onOpenChange}
      onClose={() => {}}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full lg:max-w-2xl",
        closeButton: "text-xl",
        ...closingPassthroughClassNames(isOpen),
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              ref={attachHeader}
              className="px-1 py-3 pb-0 flex flex-col gap-1 cursor-grab touch-none"
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

                {deckcode?.code ? (
                  // デッキ画像の表示・タップ全画面表示は共通コンポーネントに委譲する
                  <ZoomableDeckImage code={deckcode.code} />
                ) : (
                  <div className="relative w-full aspect-2/1">
                    {!imageLoaded && (
                      <Skeleton className="absolute inset-0 rounded-lg" />
                    )}
                    <Image
                      radius="sm"
                      shadow="none"
                      alt="デッキコードなし"
                      src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                      className=""
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                )}
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
