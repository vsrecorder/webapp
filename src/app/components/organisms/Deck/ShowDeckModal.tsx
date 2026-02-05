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

import UpdateDeckModal from "@app/components/organisms/Deck/UpdateDeckModal";
import CreateDeckCodeModal from "@app/components/organisms/Deck/CreateDeckCodeModal";
import ArchiveDeckModal from "@app/components/organisms/Deck/ArchiveDeckModal";
import UnarchiveDeckModal from "@app/components/organisms/Deck/UnarchiveDeckModal";

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
          {() => (
            <>
              <ModalHeader className="px-3 flex items-center gap-2">
                <>
                  <div className="truncate">{deck.name}</div>
                  <div className="text-lg">
                    <LuSquarePen
                      onClick={() => {
                        onOpenForUpdateDeckModal();
                      }}
                    />
                  </div>

                  {new Date(deck.archived_at).getFullYear() === 1 && (
                    <div className="ml-auto">
                      <Button
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          onOpenForArchiveDeckModal();
                        }}
                      >
                        アーカイブする
                      </Button>
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
                  <Button
                    color="default"
                    variant="solid"
                    onPress={onOpenForCreateDeckCode}
                  >
                    新しいバージョンを作成する
                  </Button>
                ) : (
                  <Button
                    color="danger"
                    variant="solid"
                    onPress={() => {
                      onOpenForUnarchiveDeckModal();
                    }}
                  >
                    利用中に変更する
                  </Button>
                )}

                {/*
                <Button color="default" variant="solid" onPress={onClose}>
                  閉じる
                </Button>
                 */}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
