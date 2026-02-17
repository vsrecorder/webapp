import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import Records from "@app/components/organisms/Record/Records";

type TabKey = "official" | "tonamel";

import { DeckGetByIdResponseType } from "@app/types/deck";

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayRecordsModal({ deck, isOpen, onOpenChange }: Props) {
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
  const [selectedKey, setSelectedKey] = useState<"official" | "tonamel">("official");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    official: 0,
    tonamel: 0,
  });

  const handleSelectionChange = (key: React.Key) => {
    // 切り替え前のスクロール位置を保存
    if (bodyRef.current) {
      scrollPositions.current[selectedKey] = bodyRef.current.scrollTop;
    }

    setSelectedKey(key as TabKey);
  };

  // タブ切り替え後にスクロール復元
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({
        top: scrollPositions.current[selectedKey],
        behavior: "auto",
      });
    }
  }, [selectedKey]);

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      isDismissable={false}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
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
              className="px-3 py-3 pb-0 flex flex-col gap-1.5 cursor-grab"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div>レコード一覧</div>

              <div className="pt-0">
                <Tabs
                  fullWidth
                  size="md"
                  selectedKey={selectedKey}
                  onSelectionChange={handleSelectionChange}
                  className="fixed z-50 left-0 right-0 pl-1 pr-1"
                  classNames={{
                    cursor: "",
                    tab: "h-8",
                    tabList: "",
                    tabContent: "font-bold",
                  }}
                >
                  <Tab key="official" title="公式イベント" />
                  <Tab key="tonamel" title="Tonamel" />
                </Tabs>
              </div>
            </ModalHeader>
            <ModalBody ref={bodyRef} className="px-2 py-2 flex flex-col overflow-y-auto">
              <div hidden={selectedKey !== "official"} className="pt-12">
                <Records event_type={"official"} deck_id={deck ? deck.id : ""} />
              </div>

              <div hidden={selectedKey !== "tonamel"} className="pt-12">
                <Records event_type={"tonamel"} deck_id={deck ? deck.id : ""} />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
