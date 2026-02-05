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

import { addToast, closeToast } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

import UpdateDeckModal from "@app/components/organisms/Deck/UpdateDeckModal";

import { LuSquarePen } from "react-icons/lu";

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  deckname: string;
  setDeckName: Dispatch<SetStateAction<string>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function ShowDeckModal({
  deck,
  setDeck,
  deckcode,
  //setDeckCode,
  deckname,
  setDeckName,
  isOpen,
  onOpenChange,
}: Props) {
  const {
    //isOpen: isOpenForCreateDeckCode,
    onOpen: onOpenForCreateDeckCode,
    //onOpenChange: onOpenChangeForCreateDeckCode,
  } = useDisclosure();

  const {
    isOpen: isOpenForUpdateDeckModal,
    onOpen: onOpenForUpdateDeckModal,
    onOpenChange: onOpenChangeForUpdateDeckModal,
  } = useDisclosure();

  /*
    デッキアーカイブ化のAPIを叩く関数
    Next.jsのAPI Routesを経由してAPIを叩く
  */
  const archiveDeck = async () => {
    const toastId = addToast({
      title: "デッキをアーカイブ中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck?.id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアーカイブが完了",
        description: "デッキをアーカイブしました",
        color: "success",
        timeout: 3000,
      });

      setDeck(null);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアーカイブに失敗",
        description: (
          <>
            デッキのアーカイブに失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };

  const unarchiveDeck = async () => {
    const toastId = addToast({
      title: "デッキをアンアーカイブ中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/decks/${deck?.id}/unarchive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアンアーカイブが完了",
        description: "デッキをアンアーカイブしました",
        color: "success",
        timeout: 3000,
      });

      setDeck(null);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキのアンアーカイブに失敗",
        description: (
          <>
            デッキのアンアーカイブに失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };

  return (
    <>
      <UpdateDeckModal
        deckname={deckname}
        setDeckName={setDeckName}
        isOpen={isOpenForUpdateDeckModal}
        onOpenChange={onOpenChangeForUpdateDeckModal}
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
              <ModalHeader className="px-3 flex items-center gap-2">
                <>
                  {deckname}
                  <LuSquarePen
                    onClick={() => {
                      onOpenForUpdateDeckModal();
                    }}
                  />
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
                  href={`/decks/${deck?.id}`}
                  className="text-xs"
                >
                  <span>このデッキの詳細ページを見る</span>
                </Link>
              </ModalBody>
              <ModalFooter>
                {deck?.archived_at ? (
                  <Button
                    color="danger"
                    variant="solid"
                    onPress={() => {
                      unarchiveDeck();
                      onClose();
                    }}
                  >
                    アンアーカイブ
                  </Button>
                ) : (
                  <>
                    <Button
                      color="default"
                      variant="solid"
                      onPress={onOpenForCreateDeckCode}
                    >
                      新しいバージョンを作成する
                    </Button>
                    <Button
                      color="danger"
                      variant="solid"
                      onPress={() => {
                        archiveDeck();
                        onClose();
                      }}
                    >
                      アーカイブ
                    </Button>
                  </>
                )}

                <Button color="default" variant="solid" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
