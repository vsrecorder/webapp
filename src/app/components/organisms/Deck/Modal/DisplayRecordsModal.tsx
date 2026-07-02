import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import Records from "@app/components/organisms/Record/Records";

import { DeckGetByIdResponseType } from "@app/types/deck";

type TabKey = "all" | "official" | "tonamel" | "unofficial";

// 記録一覧ページと同様に、選択タブを sessionStorage に保存・復元する。
// 詳細ページから戻った際、遷移前に選択していたタブを復元するために使う。
const SELECTED_TAB_STORAGE_KEY = "deckRecordsModalSelectedTab";

function resolveRestoredTab(): TabKey {
  const savedTab =
    typeof window !== "undefined"
      ? sessionStorage.getItem(SELECTED_TAB_STORAGE_KEY)
      : null;
  if (savedTab === "official" || savedTab === "tonamel" || savedTab === "unofficial") {
    return savedTab;
  }
  return "all";
}

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function DisplayRecordsModal({
  deck,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
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
      onClose();
    }
  };
  // 既定は "すべて"。詳細ページからの戻り（再開）時のみ、遷移前のタブを復元する。
  // 通常のオープンでは常に "すべて" から始まる。
  // lazy 初期化で復元することで、保存用エフェクトとの競合を避ける。
  const [selectedKey, setSelectedKey] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "all";
    const isReopen = sessionStorage.getItem("reopenModalRecordId") !== null;
    return isReopen ? resolveRestoredTab() : "all";
  });
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // 現在の選択タブを保存しておき、次回の再開時に遷移前のタブを復元できるようにする。
  // 既定の "すべて" のままでも保存されるため、戻り時に誤って別タブへ復元されない。
  useEffect(() => {
    sessionStorage.setItem(SELECTED_TAB_STORAGE_KEY, selectedKey);
  }, [selectedKey]);

  // モーダルを閉じたとき（開→閉の遷移時）に既定の "すべて" へ戻す。
  // DisplayRecordsModal は閉じても再マウントされず state が残るため、
  // これがないと再開で復元したタブが次回の通常オープンにも引き継がれてしまう。
  // 初期マウント時の isOpen=false で誤ってリセットしないよう、前回値で遷移のみ検知する。
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      setSelectedKey("all");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // タブごとのスクロール位置を保存
  const scrollPositions = useRef<Record<TabKey, number>>({
    all: 0,
    official: 0,
    tonamel: 0,
    unofficial: 0,
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

  // このモーダルが開いている間だけ「デッキの記録一覧モーダル内にいる」ことを記録する。
  // 記録カードから詳細ページへ遷移した際、DisplayRecordModal がこの値を読み取り、
  // 戻り遷移でデッキモーダル＋記録一覧モーダルを再開するための deck.id を保存する。
  useEffect(() => {
    if (isOpen && deck) {
      sessionStorage.setItem("activeDeckRecordsModalDeckId", deck.id);
      // アーカイブ済みデッキかどうかも記録する（archived_at がゼロ値=未アーカイブ）。
      // 戻り時にデッキページのタブ（利用中/アーカイブ済み）を切り替えるために使う。
      const archived = new Date(deck.archived_at).getFullYear() !== 1;
      sessionStorage.setItem("activeDeckRecordsModalArchived", archived ? "1" : "0");
    } else {
      sessionStorage.removeItem("activeDeckRecordsModalDeckId");
      sessionStorage.removeItem("activeDeckRecordsModalArchived");
    }

    return () => {
      sessionStorage.removeItem("activeDeckRecordsModalDeckId");
      sessionStorage.removeItem("activeDeckRecordsModalArchived");
    };
  }, [isOpen, deck]);

  // このモーダルの開閉アニメーション完了を表すフラグ。
  // 再開時に記録カードのモーダルを開く際、このモーダルがまだアニメーション中だと
  // HeroUI（react-aria）のフォーカス管理と競合して記録カードのモーダルが
  // 表示されないため、アニメーション完了後（parentReady=true）まで待ってから開く。
  const [parentReady, setParentReady] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setParentReady(false);
      return;
    }
    const timer = setTimeout(() => setParentReady(true), 400);
    return () => clearTimeout(timer);
  }, [isOpen]);

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
        base: "sm:max-w-full lg:max-w-2xl",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="px-3 py-3 pb-0 flex flex-col gap-1.5 cursor-grab touch-none"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div>記録一覧</div>

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
                  <Tab key="all" title="すべて" />
                  <Tab key="official" title="公式イベント" />
                  <Tab key="tonamel" title="Tonamel" />
                  <Tab key="unofficial" title="記入形式" />
                </Tabs>
              </div>
            </ModalHeader>
            <ModalBody
              ref={bodyRef}
              className="px-2 py-2 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
            >
              <div hidden={selectedKey !== "all"} className="pt-12">
                <Records
                  event_type={"all"}
                  deck_id={deck ? deck.id : ""}
                  isActive={selectedKey === "all"}
                  parentReady={parentReady}
                  nestedInModal
                  scrollContainerRef={bodyRef}
                />
              </div>

              <div hidden={selectedKey !== "official"} className="pt-12">
                <Records
                  event_type={"official"}
                  deck_id={deck ? deck.id : ""}
                  isActive={selectedKey === "official"}
                  parentReady={parentReady}
                  nestedInModal
                  scrollContainerRef={bodyRef}
                />
              </div>

              <div hidden={selectedKey !== "tonamel"} className="pt-12">
                <Records
                  event_type={"tonamel"}
                  deck_id={deck ? deck.id : ""}
                  isActive={selectedKey === "tonamel"}
                  parentReady={parentReady}
                  nestedInModal
                  scrollContainerRef={bodyRef}
                />
              </div>

              <div hidden={selectedKey !== "unofficial"} className="pt-12">
                <Records
                  event_type={"unofficial"}
                  deck_id={deck ? deck.id : ""}
                  isActive={selectedKey === "unofficial"}
                  parentReady={parentReady}
                  nestedInModal
                  scrollContainerRef={bodyRef}
                />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
