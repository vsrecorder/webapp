import { useEffect, useRef } from "react";
import { SetStateAction, Dispatch } from "react";

//import { Chip } from "@heroui/chip";

import Link from "next/link";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import UpdateDeckModal from "@app/components/organisms/Deck/Modal/UpdateDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";
import DeleteDeckModal from "@app/components/organisms/Deck/Modal/DeleteDeckModal";
import ArchiveDeckModal from "@app/components/organisms/Deck/Modal/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/Modal/UnarchiveDeckModal";
import InspectDeckModal from "@app/components/organisms/Deck/Modal/InspectDeckModal";
import DisplayRecordsModal from "@app/components/organisms/Deck/Modal/DisplayRecordsModal";
import DisplayDeckCodesModal from "@app/components/organisms/Deck/Modal/DisplayDeckCodes";
import DisplayDeckOpponentAnalysisModal from "@app/components/organisms/Deck/Modal/DisplayDeckOpponentAnalysisModal";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import DeckCardSummaryRow from "@app/components/organisms/Deck/DeckCardSummaryRow";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { useDeckCodes } from "@app/hooks/useDeckCodes";

import { LuExternalLink } from "react-icons/lu";
import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuFileText } from "react-icons/lu";
import { LuLayers } from "react-icons/lu";
import { LuBookPlus } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuFilePen } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";
import { LuEllipsis } from "react-icons/lu";
import { LuChartPie } from "react-icons/lu";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onRemove: (id: string) => void;
  // 一覧カードのバージョンバッジから開かれた場合、バージョン履歴を自動で開く
  autoOpenHistory: boolean;
  onAutoOpenHistoryHandled: () => void;
};

export default function ShowDeckModal({
  deck,
  setDeck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
  onRemove,
  autoOpenHistory,
  onAutoOpenHistoryHandled,
}: Props) {
  const {
    isOpen: isOpenForCreateDeckCodeModal,
    onOpen: onOpenForCreateDeckCodeModal,
    onOpenChange: onOpenChangeForCreateDeckCodeModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForUpdateDeckModal,
    onOpen: onOpenForUpdateDeckModal,
    onOpenChange: onOpenChangeForUpdateDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDeleteDeckModal,
    onOpen: onOpenForDeleteDeckModal,
    onOpenChange: onOpenChangeForDeleteDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForArchiveDeckModal,
    onOpen: onOpenForArchiveDeckModal,
    onOpenChange: onOpenChangeForArchiveDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForUnarchiveDeckModal,
    onOpen: onOpenForUnarchiveDeckModal,
    onOpenChange: onOpenChangeForUnarchiveDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForInspectDeckModal,
    onOpenChange: onOpenChangeForInspectDeckModal,
    onClose: onCloseForInspectDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayRecordsModal,
    onOpen: onOpenForDisplayRecordsModal,
    onOpenChange: onOpenChangeForDisplayRecordsModal,
    onClose: onCloseForDisplayRecordsModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayDeckOpponentAnalysisModal,
    onOpen: onOpenForDisplayDeckOpponentAnalysisModal,
    onOpenChange: onOpenChangeForDisplayDeckOpponentAnalysisModal,
    onClose: onCloseForDisplayDeckOpponentAnalysisModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayDeckCodesModal,
    onOpen: onOpenForDisplayDeckCodesModal,
    onOpenChange: onOpenChangeForDisplayDeckCodesModal,
    onClose: onCloseForDisplayDeckCodesModal,
  } = useDisclosure();

  // 戻り遷移での再開時、デッキモーダルが開いたら記録一覧モーダルも一度だけ開く。
  // デッキモーダルと同時に開くと HeroUI のモーダルスタック/フォーカス管理が競合し
  // 記録一覧モーダルが開かないため、デッキモーダルの開閉アニメーション完了後に開く。
  // タイマーは ref で保持し、エフェクト再実行のクリーンアップでキャンセルされないよう
  // アンマウント時のみ解除する（依存変化で自己キャンセルしないため確実に発火する）。
  const reopenRecordsConsumedRef = useRef(false);
  const reopenRecordsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen || !deck || reopenRecordsConsumedRef.current) return;
    const flag = sessionStorage.getItem("reopenRecordsModalForDeckId");
    if (flag !== deck.id) return;
    reopenRecordsConsumedRef.current = true;
    sessionStorage.removeItem("reopenRecordsModalForDeckId");
    reopenRecordsTimerRef.current = setTimeout(() => {
      onOpenForDisplayRecordsModal();
    }, 350);
  }, [isOpen, deck, onOpenForDisplayRecordsModal]);

  useEffect(() => {
    return () => {
      if (reopenRecordsTimerRef.current) {
        clearTimeout(reopenRecordsTimerRef.current);
      }
    };
  }, []);

  // 一覧カードのバージョンバッジから開かれた場合、デッキモーダルの開閉アニメーション
  // 完了後にバージョン履歴モーダルも自動で開く（reopenRecords と同様の仕組み）。
  const autoOpenHistoryConsumedRef = useRef(false);
  const autoOpenHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen) {
      autoOpenHistoryConsumedRef.current = false;
      return;
    }
    if (!autoOpenHistory || autoOpenHistoryConsumedRef.current) return;
    autoOpenHistoryConsumedRef.current = true;
    autoOpenHistoryTimerRef.current = setTimeout(() => {
      onOpenForDisplayDeckCodesModal();
      onAutoOpenHistoryHandled();
    }, 350);
    // 関数props(onAutoOpenHistoryHandled等)は毎レンダー生成されるため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoOpenHistory]);

  useEffect(() => {
    return () => {
      if (autoOpenHistoryTimerRef.current) {
        clearTimeout(autoOpenHistoryTimerRef.current);
      }
    };
  }, []);

  // このデッキの全バージョン（デッキコード）。バージョン件数の算出に使う。
  // 通し番号やデッキコード等の表示自体は DeckCodeCard に委譲する。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;

  if (!deck) {
    return;
  }

  // archived_atがゼロ値(年が1)なら未アーカイブ
  const isArchived = new Date(deck.archived_at).getFullYear() !== 1;

  return (
    <>
      <Modal
        isOpen={isOpen}
        size="md"
        placement="center"
        isDismissable={false}
        onOpenChange={onOpenChange}
        onClose={() => {}}
        //className="h-[calc(100dvh-256px)] max-h-[calc(100dvh-256px)]"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* ヘッダーに relative を付けると「配置済み要素」となり、DOM上で先に
                  描画される絶対配置の閉じるボタン（HeroUI標準）の上にヘッダーが重なって
                  クリックを奪ってしまう。ヘッダー自体は pointer-events-none にして
                  クリックを透過させ、操作が必要な詳細リンクだけ pointer-events-auto で戻す。 */}
              <ModalHeader className="relative px-3 pt-8 pb-3 flex items-center gap-3 pointer-events-none">
                <>
                  {/* 詳細ページへの遷移導線。右上はHeroUIの閉じるボタンが占めるため左上に置く。
                      閉じるボタン（top-1 end-1・40px角）と同じラインに揃うよう、高さ40px(h-10)・
                      top-1・start-1で左右対称に配置し、中央のスプライト・デッキ名レイアウトを
                      崩さないよう絶対配置にする。 */}
                  <Link
                    href={`/decks/${deck.id}`}
                    aria-label="デッキ詳細ページを開く"
                    className="absolute inset-s-1 top-1 flex h-10 items-center gap-1 rounded-full px-2.5 text-tiny font-bold text-foreground-500 hover:bg-default-100 active:bg-default-200 pointer-events-auto"
                  >
                    <LuExternalLink className="text-base" />
                    詳細
                  </Link>
                  <div className="flex items-center justify-center w-full">
                    <div className="flex flex-col items-center gap-1 w-full min-w-0">
                      <div className="flex items-center gap-0 shrink-0">
                        <PokemonSprite id={deck.pokemon_sprites[0]?.id} size={44} />
                        <PokemonSprite id={deck.pokemon_sprites[1]?.id} size={44} />
                      </div>

                      <div className="w-full min-w-0 text-center font-bold text-large truncate">
                        {deck.name}
                      </div>
                    </div>
                  </div>
                </>
              </ModalHeader>
              <ModalBody className="px-3 py-2 pb-3 flex flex-col gap-3 overflow-y-auto">
                {/* デッキ画像を上に置き、その下にカードリスト、さらにその下にデッキコードを
                    並べる。デッキコード欄は hideCode で画像側から切り離し、カードリストの
                    下へ配置している（コード表示自体は DeckCodeCard の hideImage 版に委譲）。 */}
                <DeckCodeCard
                  deckcode={deckcode}
                  totalVersionCount={versionCount}
                  onCreateVersion={isArchived ? undefined : onOpenForCreateDeckCodeModal}
                  isArchived={isArchived}
                  hideCode
                />

                {deckcode?.code && (
                  <>
                    <div className="rounded-xl bg-default-100 p-2">
                      <DeckCardSummaryRow code={deckcode.code} />
                    </div>

                    <DeckCodeCard deckcode={deckcode} hideImage />
                  </>
                )}
              </ModalBody>
              <ModalFooter className="px-3 pt-0 pb-3 flex flex-col">
                {/* ModalFooterは既定でflex flex-row justify-endのため、明示的にflex-colへ
                    上書きしないと直下のgrid要素が中身の幅に縮んで右寄せされてしまう。
                    4列グリッドに統一し、バージョン履歴(3列分)+新バージョン(1列)を1行目、
                    残りの操作を2行目に配置する。新バージョンとその他を同じ4列目に置くことで
                    縦に一直線に揃え、バージョン管理系の操作としてのまとまりを出す。
                    デッキコード未登録の場合、バージョン履歴・新バージョンはいずれも表示しない
                    （新バージョン作成の導線はDeckCodeCard側の案内に譲る） */}
                <div className="grid grid-cols-4 gap-1.5">
                  {deckcode?.code && (
                    <>
                      <button
                        type="button"
                        onClick={onOpenForDisplayDeckCodesModal}
                        className="col-span-3 flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-1.5 active:opacity-85 transition-opacity"
                      >
                        <LuLayers className="text-base shrink-0" />
                        <span className="font-bold text-small">バージョン履歴</span>
                        <span className="ml-auto bg-white/15 rounded-full px-2 py-0.5 text-tiny font-bold shrink-0">
                          {versionCount ?? "…"}件
                        </span>
                      </button>

                      {isArchived ? (
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-50 py-1.5 text-default-300">
                          <LuBookPlus className="text-base" />
                          <span className="text-tiny font-medium">新バージョン</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenForCreateDeckCodeModal}
                          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-default-100 py-1.5 active:opacity-70"
                        >
                          <LuBookPlus className="text-base" />
                          <span className="text-tiny font-medium">新バージョン</span>
                        </button>
                      )}
                    </>
                  )}

                  {isArchived ? (
                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-50 py-2 text-default-300">
                      <LuFilePen className="text-base" />
                      <span className="text-tiny font-medium">記録する</span>
                    </div>
                  ) : (
                    <Link
                      href={`/records/create?deck_id=${deck.id}${deckcode?.id ? `&deck_code_id=${deckcode.id}` : ""}`}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 text-foreground active:opacity-70"
                    >
                      <LuFilePen className="text-base" />
                      <span className="text-tiny font-medium">記録する</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={onOpenForDisplayRecordsModal}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 active:opacity-70"
                  >
                    <LuFileText className="text-base" />
                    <span className="text-tiny font-medium">記録一覧</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenForDisplayDeckOpponentAnalysisModal}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 active:opacity-70"
                  >
                    <LuChartPie className="text-base" />
                    <span className="text-tiny font-medium">対戦分析</span>
                  </button>

                  <Dropdown placement="top">
                    <DropdownTrigger>
                      <button
                        type="button"
                        className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 text-default-500 active:opacity-70"
                      >
                        <LuEllipsis className="text-base" />
                        <span className="text-tiny font-medium">その他</span>
                      </button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="デッキの操作">
                      <DropdownItem
                        key="edit"
                        startContent={<LuSquarePen />}
                        onPress={onOpenForUpdateDeckModal}
                      >
                        デッキ情報を編集する
                      </DropdownItem>
                      <DropdownItem
                        key="archive-toggle"
                        startContent={isArchived ? <LuFolderOutput /> : <LuFolderInput />}
                        onPress={
                          isArchived
                            ? onOpenForUnarchiveDeckModal
                            : onOpenForArchiveDeckModal
                        }
                      >
                        {isArchived ? "整理を解除する" : "整理する"}
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        color="danger"
                        className="text-danger"
                        startContent={<LuTrash2 />}
                        onPress={onOpenForDeleteDeckModal}
                      >
                        このデッキを削除する
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <UpdateDeckModal
        deck={deck}
        setDeck={setDeck}
        isOpen={isOpenForUpdateDeckModal}
        onOpenChange={onOpenChangeForUpdateDeckModal}
      />

      <CreateDeckCodeModal
        deck={deck}
        setDeck={setDeck}
        deckcode={deckcode}
        setDeckCode={setDeckCode}
        isOpen={isOpenForCreateDeckCodeModal}
        onOpenChange={onOpenChangeForCreateDeckCodeModal}
      />

      <DeleteDeckModal
        deck={deck}
        isOpen={isOpenForDeleteDeckModal}
        onOpenChange={onOpenChangeForDeleteDeckModal}
        onRemove={onRemove}
      />

      <ArchiveDeckModal
        deck={deck}
        isOpen={isOpenForArchiveDeckModal}
        onOpenChange={onOpenChangeForArchiveDeckModal}
        onRemove={onRemove}
      />

      <UnarchiveDeckModal
        deck={deck}
        isOpen={isOpenForUnarchiveDeckModal}
        onOpenChange={onOpenChangeForUnarchiveDeckModal}
        onRemove={onRemove}
      />

      <InspectDeckModal
        deckcode={deckcode}
        isOpen={isOpenForInspectDeckModal}
        onOpenChange={onOpenChangeForInspectDeckModal}
        onClose={onCloseForInspectDeckModal}
      />

      <DisplayRecordsModal
        deck={deck}
        isOpen={isOpenForDisplayRecordsModal}
        onOpenChange={onOpenChangeForDisplayRecordsModal}
        onClose={onCloseForDisplayRecordsModal}
      />

      <DisplayDeckOpponentAnalysisModal
        deck={deck}
        isOpen={isOpenForDisplayDeckOpponentAnalysisModal}
        onOpenChange={onOpenChangeForDisplayDeckOpponentAnalysisModal}
        onClose={onCloseForDisplayDeckOpponentAnalysisModal}
      />

      <DisplayDeckCodesModal
        deck={deck}
        deckcode={deckcode}
        setDeckCode={setDeckCode}
        isOpen={isOpenForDisplayDeckCodesModal}
        onOpenChange={onOpenChangeForDisplayDeckCodesModal}
        onClose={onCloseForDisplayDeckCodesModal}
        onOpenCreateDeckCode={onOpenForCreateDeckCodeModal}
      />
    </>
  );
}
