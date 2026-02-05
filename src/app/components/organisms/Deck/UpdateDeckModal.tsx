import { useState, SetStateAction, Dispatch } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateDeckModal({ deck, setDeck, isOpen, onOpenChange }: Props) {
  const [newDeckName, setNewDeckName] = useState<string>(deck ? deck.name : "");

  if (!deck) {
    return;
  }

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement={"center"}
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              デッキ情報を更新
            </ModalHeader>
            <ModalBody className="px-3 py-1">
              <Input
                isRequired
                //isInvalid={!isValidedDeckName}
                //errorMessage="有効なデッキコードを入力してください"
                type="text"
                label="デッキ名"
                labelPlacement="outside"
                placeholder={deck.name}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={() => {
                  setNewDeckName(deck.name);
                  onClose();
                }}
              >
                閉じる
              </Button>
              <Button
                color="primary"
                variant="solid"
                isDisabled={newDeckName === "" || newDeckName === deck.name}
                onPress={() => {
                  deck.name = newDeckName;
                  setDeck(deck);
                  onClose();
                }}
              >
                更新
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
