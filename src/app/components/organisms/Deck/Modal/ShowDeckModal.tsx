import { useEffect, useRef } from "react";
import { SetStateAction, Dispatch } from "react";

import { Image } from "@heroui/react";
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

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import DeckCardSummaryRow from "@app/components/organisms/Deck/DeckCardSummaryRow";
import { spriteScaleClass } from "@app/utils/sprite";
import { useDeckCodes, getDeckCodeVersionNumber } from "@app/hooks/useDeckCodes";

//import { LuExternalLink } from "react-icons/lu";
import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuFileText } from "react-icons/lu";
import { LuLayers } from "react-icons/lu";
import { LuBookPlus } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuFilePen } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";
import { LuEllipsis } from "react-icons/lu";

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
  const versionNumber = getDeckCodeVersionNumber(deckcodes, deckcode?.id);

  if (!deck) {
    return;
  }

  const isArchived = new Date(deck.archived_at).getFullYear() === 1;

  return (
    <>
      <Modal
        isOpen={isOpen}
        size="md"
        placement="center"
        //hideCloseButton
        onOpenChange={onOpenChange}
        onClose={() => {}}
        //className="h-[calc(100dvh-256px)] max-h-[calc(100dvh-256px)]"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="px-3 py-3 flex items-center gap-3">
                <>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1 w-full">
                      <div
                        onClick={onOpenForUpdateDeckModal}
                        className="flex items-center gap-0 shrink-0"
                      >
                        {deck.pokemon_sprites[0] ? (
                          <Image
                            alt={deck.pokemon_sprites[0].id}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                            className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[0].id)} origin-bottom`}
                          />
                        ) : (
                          <Image
                            alt="unknown"
                            src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                            className="w-11 h-11 object-contain scale-150 origin-bottom"
                          />
                        )}

                        {deck.pokemon_sprites[1] ? (
                          <Image
                            alt={deck.pokemon_sprites[1].id}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                            className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[1].id)} origin-bottom`}
                          />
                        ) : (
                          <Image
                            alt="unknown"
                            src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                            className="w-11 h-11 object-contain scale-150 origin-bottom"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full">
                        <div className="font-bold text-large truncate">{deck.name}</div>
                        <button
                          type="button"
                          onClick={onOpenForUpdateDeckModal}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-default-100 text-default-500 active:opacity-70 shrink-0"
                        >
                          <LuSquarePen className="text-sm" />
                        </button>
                      </div>
                    </div>
                    {/*
                    <div className="pb-1">
                      <Link href={`/decks/${deck.id}`} className="text-default-400">
                        <div className="text-xl">
                          <LuExternalLink />
                        </div>
                      </Link>
                    </div>
                    */}
                  </div>
                </>
              </ModalHeader>
              <ModalBody className="px-3 py-2 pb-3 flex flex-col gap-3 overflow-y-auto">
                {/* 一覧カードと同じ情報パネル+画像を共有し、表示内容のズレを防ぐ */}
                <DeckCodeCard
                  deckcode={deckcode}
                  versionNumber={versionNumber}
                  totalVersionCount={versionCount}
                  onCreateVersion={onOpenForCreateDeckCodeModal}
                />

                {deckcode?.code && (
                  <div className="rounded-xl bg-default-100 p-2">
                    <DeckCardSummaryRow code={deckcode.code} />
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="px-3 pt-1 pb-3 flex flex-col gap-2">
                {/* バージョン履歴（主要アクション）。デッキコード未登録＝バージョンが存在しないため非表示 */}
                {deckcode?.code && (
                  <button
                    type="button"
                    onClick={onOpenForDisplayDeckCodesModal}
                    className="flex items-center gap-2 w-full bg-primary text-white rounded-xl px-4 py-2.5 active:opacity-85 transition-opacity"
                  >
                    <LuLayers className="text-base shrink-0" />
                    <span className="font-bold text-small">バージョン履歴</span>
                    <span className="ml-auto bg-white/15 rounded-full px-2 py-0.5 text-tiny font-bold shrink-0">
                      {versionCount ?? "…"}件
                    </span>
                  </button>
                )}

                {/* その他の操作 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {isArchived ? (
                    <Link
                      href={`/records/create?deck_id=${deck.id}${deckcode?.id ? `&deck_code_id=${deckcode.id}` : ""}`}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 text-foreground active:opacity-70"
                    >
                      <LuFilePen className="text-base" />
                      <span className="text-tiny font-medium">記録する</span>
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-50 py-2 text-default-300">
                      <LuFilePen className="text-base" />
                      <span className="text-tiny font-medium">記録する</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onOpenForDisplayRecordsModal}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 active:opacity-70"
                  >
                    <LuFileText className="text-base" />
                    <span className="text-tiny font-medium">対戦記録</span>
                  </button>

                  {isArchived ? (
                    <button
                      type="button"
                      onClick={onOpenForCreateDeckCodeModal}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-100 py-2 active:opacity-70"
                    >
                      <LuBookPlus className="text-base" />
                      <span className="text-tiny font-medium">新バージョン</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-default-50 py-2 text-default-300">
                      <LuBookPlus className="text-base" />
                      <span className="text-tiny font-medium">新バージョン</span>
                    </div>
                  )}

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
                        key="archive-toggle"
                        startContent={
                          isArchived ? <LuFolderInput /> : <LuFolderOutput />
                        }
                        onPress={
                          isArchived
                            ? onOpenForArchiveDeckModal
                            : onOpenForUnarchiveDeckModal
                        }
                      >
                        {isArchived ? "整理する" : "整理を解除する"}
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
