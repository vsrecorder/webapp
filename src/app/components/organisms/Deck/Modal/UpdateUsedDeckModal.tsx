import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { RecordType } from "@app/types/record";

type Props = {
  record: RecordType;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateUsedDeckModal({ record, isOpen, onOpenChange }: Props) {
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
            <ModalHeader>使用したデッキを編集</ModalHeader>
            <ModalBody>{record.data.id}</ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
