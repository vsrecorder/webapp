import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";

import { LuStickyNote } from "react-icons/lu";

import { MatchGetResponseType } from "@app/types/match";

type Props = {
  match: MatchGetResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayMatchMemoModal({ match, isOpen, onOpenChange }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex items-center gap-2">
              <LuStickyNote className="text-xl" />
              メモ
            </ModalHeader>
            <ModalBody className="px-3 py-1">
              {/* メモの内容（改行を保持して表示） */}
              <div className="whitespace-pre-wrap break-words text-sm">
                {match?.memo}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                onPress={onClose}
                className="font-bold"
              >
                閉じる
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
