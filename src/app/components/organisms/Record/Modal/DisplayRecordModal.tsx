import Link from "next/link";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { LuExternalLink } from "react-icons/lu";

import Matches from "@app/components/organisms/Matches";

import { RecordType } from "@app/types/record";

type Props = {
  record: RecordType;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayRecordModal({ record, isOpen, onOpenChange }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      //hideCloseButton
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
            <ModalHeader>
              <div>対戦結果</div>
            </ModalHeader>
            <ModalBody className="overflow-y-auto">
              <Link href={`/records/${record.data.id}`} className="text-gray-500">
                <div className="text-2xl">
                  <LuExternalLink />
                </div>
              </Link>

              <Matches record={record.data} />
            </ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
