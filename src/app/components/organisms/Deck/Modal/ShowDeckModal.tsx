import { createHash } from "crypto";

import { useEffect } from "react";
import { SetStateAction, Dispatch } from "react";

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
import ArchiveDeckModal from "@app/components/organisms/Deck/Modal/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/Modal/UnarchiveDeckModal";

import { LuFolderInput } from "react-icons/lu";
import { LuFolderOutput } from "react-icons/lu";
import { LuUpload } from "react-icons/lu";
import { LuTrash2 } from "react-icons/lu";
import { LuExternalLink } from "react-icons/lu";
import { LuFlaskConical } from "react-icons/lu";
import { LuChartColumn } from "react-icons/lu";
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
    isOpen: isOpenForCreateDeckCode,
    onOpen: onOpenForCreateDeckCode,
    onOpenChange: onOpenChangeForCreateDeckCode,
  } = useDisclosure();

  const {
    isOpen: isOpenForUpdateDeckModal,
    onOpen: onOpenForUpdateDeckModal,
    onOpenChange: onOpenChangeForUpdateDeckModal,
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
        isOpen={isOpenForCreateDeckCode}
        onOpenChange={onOpenChangeForCreateDeckCode}
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

      <Modal
        isOpen={isOpen}
        size={"md"}
        placement={"center"}
        //hideCloseButton
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="px-3 py-3 flex items-center gap-3">
                <>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-large truncate">{deck.name}</div>
                    <div className="text-xl">
                      <LuSquarePen
                        onClick={() => {
                          onOpenForUpdateDeckModal();
                        }}
                      />
                    </div>
                  </div>
                </>
              </ModalHeader>
              <ModalBody className="px-1 py-1 flex flex-col gap-3">
                <div className="pl-3 flex flex-col justify-center gap-0.5">
                  <div className="text-tiny">バージョンID：{version}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-tiny">デッキコード：{deckcode?.code}</div>
                    <Chip size="sm" radius="md" variant="bordered">
                      <small className="font-bold">
                        {deckcode?.private_code_flg ? <>非公開</> : <>公開</>}
                      </small>
                    </Chip>
                  </div>
                </div>

                {deckcode ? (
                  <>
                    <Image
                      radius="sm"
                      shadow="none"
                      alt={deckcode.code}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                    />
                  </>
                ) : (
                  <>
                    <Image
                      radius="sm"
                      shadow="none"
                      alt="デッキコードなし"
                      src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                    />
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {new Date(deck.archived_at).getFullYear() === 1 ? (
                  <div className="flex items-center justify-center gap-8 mx-auto">
                    <div className="text-2xl text-gray-200">
                      <LuFilePen />
                    </div>

                    <div className="text-2xl">
                      <LuUpload
                        onClick={() => {
                          onOpenForCreateDeckCode();
                        }}
                      />
                    </div>

                    <div className="text-2xl text-gray-200">
                      <LuChartColumn />
                    </div>

                    <div className="text-2xl text-gray-200">
                      <LuFlaskConical />
                    </div>

                    <Link
                      isExternal
                      underline="always"
                      href={`/decks/${deck.id}`}
                      className="text-black"
                    >
                      <div className="text-2xl">
                        <LuExternalLink />
                      </div>
                    </Link>

                    <div className="text-2xl text-red-500">
                      <LuFolderInput
                        onClick={() => {
                          onOpenForArchiveDeckModal();
                        }}
                      />
                    </div>

                    <div className="text-2xl text-red-500">
                      <LuTrash2 />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-8 mx-auto">
                    <div className="text-2xl">
                      <LuFolderOutput
                        onClick={() => {
                          onOpenForUnarchiveDeckModal();
                        }}
                      />
                    </div>

                    <div className="text-2xl text-red-500">
                      <LuTrash2 />
                    </div>
                  </div>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
