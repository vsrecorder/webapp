import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckcode: DeckCodeType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function InspectDeckModal({ isOpen, onOpenChange }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      onOpenChange={onOpenChange}
      onClose={() => {}}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>初動チェック</ModalHeader>
            <ModalBody></ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
