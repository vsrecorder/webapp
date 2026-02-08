import { createHash } from "crypto";

import { useEffect } from "react";
import { SetStateAction, Dispatch } from "react";

import { Skeleton } from "@heroui/react";
import { Link } from "@heroui/react";
import { Image } from "@heroui/react";

import { Chip } from "@heroui/chip";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

import UpdateDeckModal from "@app/components/organisms/Deck/Modal/UpdateDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";
import DeleteDeckModal from "@app/components/organisms/Deck/Modal/DeleteDeckModal";
import ArchiveDeckModal from "@app/components/organisms/Deck/Modal/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/Modal/UnarchiveDeckModal";
import InspectDeckModal from "@app/components/organisms/Deck/Modal/InspectDeckModal";
import DisplayRecordsModal from "@app/components/organisms/Deck/Modal/DisplayRecordsModal";
import DisplayDeckCodesModal from "@app/components/organisms/Deck/Modal/DisplayDeckCodes";

import { LuExternalLink } from "react-icons/lu";

import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuFileText } from "react-icons/lu";
import { LuBookOpen } from "react-icons/lu";
import { LuBookUp } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuFlaskConical } from "react-icons/lu";
import { LuFilePen } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function ShowDeckModal({
  deck,
  setDeck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
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
    onOpen: onOpenForInspectDeckModal,
    onOpenChange: onOpenChangeForInspectDeckModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayRecordsModal,
    onOpen: onOpenForDisplayRecordsModal,
    onOpenChange: onOpenChangeForDisplayRecordsModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForDisplayDeckCodesModal,
    onOpen: onOpenForDisplayDeckCodesModal,
    onOpenChange: onOpenChangeForDisplayDeckCodesModal,
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        size={"md"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="px-3 py-3 flex items-center gap-3">
                <>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-large truncate">{deck.name}</div>
                      {/*
                      {new Date(deck.archived_at).getFullYear() === 1 && <></>}
                      */}
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

                    <div className="pb-1">
                      <Link
                        isExternal
                        underline="always"
                        href={`/decks/${deck.id}`}
                        className="text-gray-500"
                      >
                        <div className="text-2xl">
                          <LuExternalLink />
                        </div>
                      </Link>
                    </div>
                  </div>
                </>
              </ModalHeader>
              <ModalBody className="px-1 py-1 pb-3 flex flex-col gap-3">
                <div className="pl-3 flex flex-col justify-center gap-0.5">
                  <div className="text-tiny">バージョンID：{version}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-tiny">
                      デッキコード：
                      {deckcode?.code ? (
                        <Link
                          isExternal
                          underline="always"
                          href={`https://www.pokemon-card.com/deck/confirm.html/deckID/${deckcode.code}`}
                          className="text-tiny text-black"
                        >
                          {deckcode.code}
                        </Link>
                      ) : (
                        "なし"
                      )}
                    </div>

                    {deckcode?.code && (
                      <>
                        <Chip size="sm" radius="md" variant="bordered">
                          <small className="font-bold">
                            {deckcode?.private_code_flg ? <>非公開</> : <>公開</>}
                          </small>
                        </Chip>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative w-full aspect-2/1">
                  <Skeleton className="absolute inset-0 rounded-lg" />
                  {deckcode?.code ? (
                    <>
                      <Image
                        radius="sm"
                        shadow="none"
                        alt={deckcode.code}
                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                        className=""
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
                      />
                    </>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {new Date(deck.archived_at).getFullYear() === 1 ? (
                  <div className="flex items-center justify-center gap-7 mx-auto">
                    <Link
                      isExternal
                      underline="always"
                      href={`/records/create?deck_id=${deck.id}`}
                      className="text-black"
                    >
                      <div className="text-2xl">
                        <LuFilePen />
                      </div>
                    </Link>

                    <div className="text-2xl">
                      <LuFileText onClick={onOpenForDisplayRecordsModal} />
                    </div>

                    <div className="text-2xl">
                      <LuBookOpen onClick={onOpenForDisplayDeckCodesModal} />
                    </div>

                    <div className="text-2xl">
                      <LuFlaskConical onClick={onOpenForInspectDeckModal} />
                    </div>

                    <div className="text-2xl">
                      <LuBookUp onClick={onOpenForCreateDeckCodeModal} />
                    </div>

                    <div className="text-2xl text-red-500">
                      <LuFolderInput onClick={onOpenForArchiveDeckModal} />
                    </div>

                    <div className="text-2xl text-red-500">
                      <LuTrash2 onClick={onOpenForDeleteDeckModal} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-8 mx-auto">
                    <div className="text-2xl text-gray-200">
                      <LuFilePen />
                    </div>

                    <div className="text-2xl">
                      <LuFileText onClick={onOpenForDisplayRecordsModal} />
                    </div>

                    <div className="text-2xl">
                      <LuBookOpen onClick={onOpenForDisplayDeckCodesModal} />
                    </div>

                    <div className="text-2xl text-gray-200">
                      <LuFlaskConical />
                    </div>

                    <div className="text-2xl text-gray-200">
                      <LuBookUp />
                    </div>

                    <div className="text-2xl text-green-500">
                      <LuFolderOutput onClick={onOpenForUnarchiveDeckModal} />
                    </div>

                    <div className="text-2xl text-red-500">
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
        setDeck={setDeck}
        isOpen={isOpenForDeleteDeckModal}
        onOpenChange={onOpenChangeForDeleteDeckModal}
      />

      <ArchiveDeckModal
        deck={deck}
        setDeck={setDeck}
        isOpen={isOpenForArchiveDeckModal}
        onOpenChange={onOpenChangeForArchiveDeckModal}
      />

      <UnarchiveDeckModal
        deck={deck}
        setDeck={setDeck}
        isOpen={isOpenForUnarchiveDeckModal}
        onOpenChange={onOpenChangeForUnarchiveDeckModal}
      />

      <InspectDeckModal
        deckcode={deckcode}
        isOpen={isOpenForInspectDeckModal}
        onOpenChange={onOpenChangeForInspectDeckModal}
      />

      <DisplayRecordsModal
        deck={deck}
        isOpen={isOpenForDisplayRecordsModal}
        onOpenChange={onOpenChangeForDisplayRecordsModal}
      />

      <DisplayDeckCodesModal
        deck={deck}
        isOpen={isOpenForDisplayDeckCodesModal}
        onOpenChange={onOpenChangeForDisplayDeckCodesModal}
      />
    </>
  );
}
