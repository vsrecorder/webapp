import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateMatchModal({ isOpen, onOpenChange }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
      //isDismissable={}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>対戦結果を編集</ModalHeader>
            <ModalBody></ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
