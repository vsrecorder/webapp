import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayDeckCodesModal({ isOpen, onOpenChange }: Props) {
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
            <ModalHeader>バージョン一覧</ModalHeader>
            <ModalBody></ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
