import { ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import DeckOpponentAnalysisPanel from "@app/components/organisms/Deck/DeckOpponentAnalysisPanel";

import { DeckGetByIdResponseType } from "@app/types/deck";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { useModalEntered } from "@app/hooks/useModalEntered";
import { closingPassthroughClassNames } from "@app/utils/modal";

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function DisplayDeckOpponentAnalysisModal({
  deck,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const attachHeader = useModalDragToClose(onClose);

  // 入場アニメーションが着地するまでチャート・凡例の実体化を遅らせる
  // (着地前に大きなコミットが走るとシートの動きが止まるため)。
  const entered = useModalEntered(isOpen);

  if (!deck) {
    return null;
  }

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
              className="px-3 py-3 flex flex-col gap-1.5 cursor-grab touch-none"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div>対戦相手の分析</div>
            </ModalHeader>
            <ModalBody className="px-2 pt-2 pb-6 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
              <DeckOpponentAnalysisPanel deckId={deck.id} inModal holdSkeleton={!entered} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
