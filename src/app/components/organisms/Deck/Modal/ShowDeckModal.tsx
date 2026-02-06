import { useEffect } from "react";
import { SetStateAction, Dispatch } from "react";

import { Button } from "@heroui/react";

import { Link } from "@heroui/react";
import { Image } from "@heroui/react";

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
        hideCloseButton
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex items-center gap-3">
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

                  {new Date(deck.archived_at).getFullYear() === 1 ? (
                    <div className="ml-auto pr-1 text-2xl text-red-500">
                      <LuFolderInput
                        onClick={() => {
                          onOpenForArchiveDeckModal();
                        }}
                      />
                    </div>
                  ) : (
                    <div className="ml-auto pr-1 text-2xl text-green-500">
                      <LuFolderOutput
                        onClick={() => {
                          onOpenForUnarchiveDeckModal();
                        }}
                      />
                    </div>
                  )}
                </>
              </ModalHeader>
              <ModalBody className="px-2 py-1">
                <p className="text-tiny">デッキコード：</p>
                <p className="text-tiny">デッキコードの公開：</p>
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
                <Link
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href={`/decks/${deck.id}`}
                  className="text-xs"
                >
                  <span>このデッキの詳細ページを見る</span>
                </Link>
              </ModalBody>
              <ModalFooter>
                {new Date(deck.archived_at).getFullYear() === 1 ? (
                  <div className="flex items-center gap-6">
                    <div className="text-2xl">
                      <LuUpload
                        onClick={() => {
                          onOpenForCreateDeckCode();
                        }}
                      />
                    </div>
                    <Button color="default" variant="solid" onPress={onClose}>
                      閉じる
                    </Button>
                    {/*
                    <Button
                      color="default"
                      variant="solid"
                      onPress={onOpenForCreateDeckCode}
                    >
                      新しいバージョンを作成する
                    </Button>
                     */}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button color="default" variant="solid" onPress={onClose}>
                      閉じる
                    </Button>
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
