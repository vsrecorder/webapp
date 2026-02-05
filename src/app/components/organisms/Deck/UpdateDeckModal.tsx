import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";

type Props = {
  deckname: string;
  setDeckName: Dispatch<SetStateAction<string>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateDeckModal({
  deckname,
  setDeckName,
  isOpen,
  onOpenChange,
}: Props) {
  const [newDeckName, setNewDeckName] = useState<string>(deckname);

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement={"center"}
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      classNames={{
        base: "sm:max-w-full md:max-w-lg",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <div>
            <ModalHeader className="flex flex-col gap-1 px-3">デッキ名を変更</ModalHeader>
            <ModalBody className="px-3 py-1">
              <Input
                //isInvalid={!isValidedDeckName}
                //errorMessage="有効なデッキコードを入力してください"
                type="text"
                label="デッキ名"
                labelPlacement="outside"
                placeholder={deckname}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={() => {
                  setNewDeckName(deckname);
                  onClose();
                }}
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={newDeckName === "" || newDeckName === deckname}
                onPress={() => {
                  setDeckName(newDeckName);
                  onClose();
                }}
              >
                更新
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
