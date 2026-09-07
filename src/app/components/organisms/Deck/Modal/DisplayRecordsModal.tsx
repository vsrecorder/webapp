import { useEffect, useRef, useState } from "react";

import { Tabs, Tab } from "@heroui/react";
import { ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import Records from "@app/components/organisms/Record/Records";

import { DeckGetByIdResponseType } from "@app/types/deck";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { useModalEntered } from "@app/hooks/useModalEntered";
import { closingPassthroughClassNames } from "@app/utils/modal";
import { isZeroDate } from "@app/utils/date";

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
  const attachHeader = useModalDragToClose(onClose);
  // 既定は "すべて"。詳細ページからの戻り（再開）時のみ、遷移前のタブを復元する。
  // 通常のオープンでは常に "すべて" から始まる。
  // lazy 初期化で復元することで、保存用エフェクトとの競合を避ける。
  const [selectedKey, setSelectedKey] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "all";
    const isReopen = sessionStorage.getItem("reopenModalRecordId") !== null;
    return isReopen ? resolveRestoredTab() : "all";
  });
  /*
   * 一度でも選んだタブ。選んだタブの一覧(Records)だけをマウントし、以後は hidden で残す。
   *
   * 以前は着地(parentReady)後に4タブぶんを全部マウントしていた。一覧 API はカードの周辺情報を
   * サーバ側でまとめて取るようになった(recordListServer)ため、1タブのマウントが上流への
   * 20〜30本の取得を伴う。見ていないタブまで開くと、それが4倍になる。
   * 開いたタブだけ取れば1タブぶんで済み、一度開いたタブは残すので切り替えの体感は変わらない。
   */
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<TabKey>>(
    () => new Set<TabKey>([selectedKey]),
  );
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
      // 次に開いたときは「すべて」から始まるので、マウント済みの記憶もそこへ戻す
      // (残したままだと閉じている間も4タブぶんの一覧を抱え続ける)
      setMountedTabs(new Set<TabKey>(["all"]));
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

    const tab = key as TabKey;
    setSelectedKey(tab);
    setMountedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
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
      const archived = !isZeroDate(deck.archived_at);
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
  // あわせて、着地までは Records にスケルトンを出させ、カード一覧の実体化
  // (大きなコミット)が入場アニメーション中に走ってシートが引っかかるのを防ぐ。
  const parentReady = useModalEntered(isOpen);

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      isDismissable={false}
      onOpenChange={onOpenChange}
      onClose={() => {}}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full lg:max-w-2xl",
        closeButton: "text-xl",
        ...closingPassthroughClassNames(isOpen),
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              ref={attachHeader}
              className="relative px-3 py-3 pb-0 flex flex-col gap-1.5 cursor-grab touch-none"
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
                  // タブはヘッダーの通常フローから浮かせ、ModalBody 側の pt-12 で
                  // その分の余白を確保している。基準は fixed(ビューポート)ではなく
                  // absolute(relative なヘッダー = モーダル幅)にすること。
                  // fixed だと画面幅いっぱいに広がるため、モーダルが画面より狭くなる
                  // タブレット以上(base の sm:mx-6 / lg:max-w-2xl)ではみ出していた
                  className="absolute z-50 left-0 right-0"
                  classNames={{
                    cursor: "",
                    tab: "h-8",
                    // HeroUI 既定の overflow-x-scroll を打ち消す。実際には溢れないのに
                    // overflow を持つ要素は、iOS でその上から始まるスワイプが
                    // usePreventScroll(react-aria) に殺されるため(他モーダルのTabsと同じ対策)
                    tabList: "overflow-x-visible",
                    tabContent: "font-bold",
                  }}
                >
                  <Tab key="all" title="すべて" />
                  <Tab key="official" title="公式イベント" />
                  <Tab key="tonamel" title="Tonamel" />
                  <Tab key="unofficial" title="自由形式" />
                </Tabs>
              </div>
            </ModalHeader>
            <ModalBody
              ref={bodyRef}
              className="px-2 py-2 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
            >
              {/* 表示中のタブだけをマウントする(mountedTabs)。4タブ分を一度にマウントすると、
                  そのコミットの重さで入場アニメーションが引っかかり、一覧 API も4本走る。
                  着地(parentReady)までは holdSkeleton で実体化を待たせ、入場を妨げない。 */}
              <div hidden={selectedKey !== "all"} className="pt-12">
                {mountedTabs.has("all") && (
                  <Records
                    event_type={"all"}
                    deck_id={deck ? deck.id : ""}
                    isActive={selectedKey === "all"}
                    parentReady={parentReady}
                    holdSkeleton={!parentReady}
                    nestedInModal
                    scrollContainerRef={bodyRef}
                  />
                )}
              </div>

              <div hidden={selectedKey !== "official"} className="pt-12">
                {mountedTabs.has("official") && (
                  <Records
                    event_type={"official"}
                    deck_id={deck ? deck.id : ""}
                    isActive={selectedKey === "official"}
                    parentReady={parentReady}
                    holdSkeleton={!parentReady}
                    nestedInModal
                    scrollContainerRef={bodyRef}
                  />
                )}
              </div>

              <div hidden={selectedKey !== "tonamel"} className="pt-12">
                {mountedTabs.has("tonamel") && (
                  <Records
                    event_type={"tonamel"}
                    deck_id={deck ? deck.id : ""}
                    isActive={selectedKey === "tonamel"}
                    parentReady={parentReady}
                    holdSkeleton={!parentReady}
                    nestedInModal
                    scrollContainerRef={bodyRef}
                  />
                )}
              </div>

              <div hidden={selectedKey !== "unofficial"} className="pt-12">
                {mountedTabs.has("unofficial") && (
                  <Records
                    event_type={"unofficial"}
                    deck_id={deck ? deck.id : ""}
                    isActive={selectedKey === "unofficial"}
                    parentReady={parentReady}
                    holdSkeleton={!parentReady}
                    nestedInModal
                    scrollContainerRef={bodyRef}
                  />
                )}
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
