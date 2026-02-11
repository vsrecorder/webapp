import { useRef } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayRecordsModal({ isOpen, onOpenChange }: Props) {
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
      onOpenChange();
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
              className="px-3 py-3 flex flex-col gap-1 cursor-grab"
            >
              <div className="mx-auto h-1 w-15 rounded-full bg-default-300" />
              <div>レコード一覧</div>
            </ModalHeader>
            <ModalBody></ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
