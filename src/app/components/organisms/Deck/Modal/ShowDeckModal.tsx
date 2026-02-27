import { createHash } from "crypto";

import { useState } from "react";
import { useEffect } from "react";
import { SetStateAction, Dispatch } from "react";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";
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

import UpdateDeckModal from "@app/components/organisms/Deck/Modal/UpdateDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";
import DeleteDeckModal from "@app/components/organisms/Deck/Modal/DeleteDeckModal";
import ArchiveDeckModal from "@app/components/organisms/Deck/Modal/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/Modal/UnarchiveDeckModal";
import InspectDeckModal from "@app/components/organisms/Deck/Modal/InspectDeckModal";
import DisplayRecordsModal from "@app/components/organisms/Deck/Modal/DisplayRecordsModal";
import DisplayDeckCodesModal from "@app/components/organisms/Deck/Modal/DisplayDeckCodes";

import DeckCardSummaryRow from "@app/components/organisms/Deck/DeckCardSummaryRow";

//import { LuExternalLink } from "react-icons/lu";
import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuFileText } from "react-icons/lu";
import { LuBook } from "react-icons/lu";
import { LuBookPlus } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuFlaskConical } from "react-icons/lu";
import { LuFilePen } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";

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
};

export default function ShowDeckModal({
  deck,
  setDeck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
  onRemove,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);

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
    onOpen: onOpenForInspectDeckModal,
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

  const version =
    deckcode && deckcode.id
      ? createHash("sha1").update(deckcode.id).digest("hex").slice(0, 8)
      : "なし";

  useEffect(() => {
    if (!deckcode?.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode?.code]);

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
        hideCloseButton
        onOpenChange={onOpenChange}
        onClose={() => {}}
        //className="h-[calc(100dvh-256px)] max-h-[calc(100dvh-256px)]"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
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
                            alt={deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                            className="w-11 h-11 object-contain scale-150 origin-bottom"
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
                            alt={deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}
                            src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                            className="w-11 h-11 object-contain scale-150 origin-bottom"
                          />
                        ) : (
                          <Image
                            alt="unknown"
                            src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                            className="w-11 h-11 object-contain scale-150 origin-bottom"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-3/4">
                        <div className="font-bold text-large truncate">{deck.name}</div>
                        <div className="pb-2.5">
                          <div className="text-lg">
                            <LuSquarePen
                              onClick={() => {
                                onOpenForUpdateDeckModal();
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/*
                    <div className="pb-1">
                      <Link href={`/decks/${deck.id}`} className="text-gray-400">
                        <div className="text-xl">
                          <LuExternalLink />
                        </div>
                      </Link>
                    </div>
                    */}
                  </div>
                </>
              </ModalHeader>
              <ModalBody className="px-1 py-1 pb-3 flex flex-col gap-3 overflow-y-auto">
                <div className="pl-3 flex flex-col justify-center gap-3">
                  <div className="font-bold text-tiny">バージョンID：{version}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-tiny">
                      <>デッキコード：</>
                      {deckcode?.code ? (
                        <Snippet
                          size="sm"
                          radius="none"
                          timeout={3000}
                          disableTooltip={true}
                          hideSymbol={true}
                        >
                          {deckcode.code}
                        </Snippet>
                      ) : (
                        "なし"
                      )}
                    </div>

                    {/*
                    {deckcode?.code && (
                      <>
                        <Chip size="sm" radius="md" variant="bordered">
                          <small className="font-bold">
                            {deckcode?.private_code_flg ? <>非公開</> : <>公開</>}
                          </small>
                        </Chip>
                      </>
                    )}
                    */}
                  </div>
                </div>

                <div className="relative w-full aspect-2/1">
                  {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
                  {deckcode?.code ? (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt={deckcode.code}
                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  ) : (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt="デッキコードなし"
                        src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                        className=""
                        onLoad={() => setImageLoaded(true)}
                      />
                    </>
                  )}
                </div>

                <div className="px-1 overflow-y-auto">
                  {deckcode && <DeckCardSummaryRow deckcode={deckcode} />}
                </div>
              </ModalBody>
              <ModalFooter className="px-1 pt-0">
                {isArchived ? (
                  <div className="flex items-center gap-8 mx-auto overflow-x-auto">
                    <Link
                      href={`/records/create?deck_id=${deck.id}`}
                      className="text-black"
                    >
                      <div className="text-2xl cursor-pointer">
                        <LuFilePen />
                      </div>
                    </Link>

                    <div className="text-2xl cursor-pointer">
                      <LuFileText onClick={onOpenForDisplayRecordsModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuBook onClick={onOpenForDisplayDeckCodesModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuFlaskConical onClick={onOpenForInspectDeckModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuBookPlus onClick={onOpenForCreateDeckCodeModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuFolderInput onClick={onOpenForArchiveDeckModal} />
                    </div>

                    <div className="text-2xl text-red-500 cursor-pointer">
                      <LuTrash2 onClick={onOpenForDeleteDeckModal} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-8 mx-auto">
                    <div className="text-2xl text-gray-200">
                      <LuFilePen />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuFileText onClick={onOpenForDisplayRecordsModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuBook onClick={onOpenForDisplayDeckCodesModal} />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuFlaskConical onClick={onOpenForInspectDeckModal} />
                    </div>

                    <div className="text-2xl text-gray-200">
                      <LuBookPlus />
                    </div>

                    <div className="text-2xl cursor-pointer">
                      <LuFolderOutput onClick={onOpenForUnarchiveDeckModal} />
                    </div>

                    <div className="text-2xl text-red-500 cursor-pointer">
                      <LuTrash2 onClick={onOpenForDeleteDeckModal} />
                    </div>
                  </div>
                )}
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
        setDeckCode={setDeckCode}
        isOpen={isOpenForDisplayDeckCodesModal}
        onOpenChange={onOpenChangeForDisplayDeckCodesModal}
        onClose={onCloseForDisplayDeckCodesModal}
      />
    </>
  );
}
