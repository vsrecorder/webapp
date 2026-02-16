import { useRef } from "react";

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
      className="z-20 h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full",
        //base: "sm:max-w-full touch-none",
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
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              {/* 両端配置 */}
              <div className="flex items-center justify-between w-full">
                {/* 左側 */}
                <div>対戦結果</div>

                {/* 右側 */}
                <div>
                  <Link href={`/records/${record.data.id}`} className="text-gray-500">
                    <div className="text-xl -translate-y-3">
                      <LuExternalLink />
                    </div>
                  </Link>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="px-3 overflow-y-auto">
              <Matches record={record.data} />
            </ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
