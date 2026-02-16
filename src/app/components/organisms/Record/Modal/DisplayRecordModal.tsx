import { useRef } from "react";

import Link from "next/link";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import { LuExternalLink } from "react-icons/lu";

//import RecordById from "@app/components/organisms/Record/RecordById";

import OfficialEventRecord from "@app/components/organisms/Record/OfficialEventRecord";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

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
      onClose={() => {}}
      onOpenChange={onOpenChange}
      size="md"
      placement="bottom"
      hideCloseButton
      isDismissable={false}
      className="z-20 h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none overscroll-contain"
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
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              {/* 両端配置 */}
              <div className="flex items-center justify-between w-full">
                {/* 左側 */}
                <div>レコード情報</div>

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
            <ModalBody className="px-1.5 gap-9 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <div className="pb-0 flex flex-col items-center justify-center gap-0">
                  <div className="font-bold underline">イベント情報</div>
                </div>

                {record.data.official_event_id !== 0 ? (
                  <OfficialEventRecord record={record} enableDisplayRecordModal={false} />
                ) : (
                  // TODO: Tonamelの場合
                  <></>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="pb-0 flex flex-col items-center justify-center gap-0">
                  <div className="font-bold underline">対戦結果</div>
                </div>
                <Matches record={record.data} enableCreateMatchModal={false} />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="pb-0 flex flex-col items-center justify-center gap-0">
                  <div className="font-bold underline">使用したデッキ</div>
                </div>
                <UsedDeckById
                  deck_id={record.data.deck_id}
                  deck_code_id={record.data.deck_code_id}
                />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
