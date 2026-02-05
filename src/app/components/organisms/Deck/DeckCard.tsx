"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";

import { Input } from "@heroui/react";
import { Checkbox } from "@heroui/react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { Skeleton } from "@heroui/react";

import { Link } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { LuSquarePen } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType, DeckCodeCreateRequestType } from "@app/types/deck_code";

async function fetchDeckById(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckCodeById(deck_code_id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${deck_code_id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  isArchived: boolean;
  deck_id: string;
  deck_code_id: string;
};

export default function DeckCard({ isArchived, deck_id, deck_code_id }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newdeckcode, setNewDeckCode] = useState<string>("");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isValidedDeckCode, setIsValidedDeckCode] = useState<boolean>(true);

  const {
    isOpen: isCreateVersionOpen,
    onOpen: onCreateVersionOpen,
    onOpenChange: onCreateVersionOpenChange,
  } = useDisclosure();

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    if (!deck_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckById(deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    const fetchDeckCodeData = async () => {
      try {
        if (deck_code_id) {
          setLoading(true);
          const data = await fetchDeckCodeById(deck_code_id);
          setDeckCode(data);
        }
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckData();
    fetchDeckCodeData();
  }, [deck_id, deck_code_id]);

  /*
    デッキコードが有効かどうかチェック
  */
  useEffect(() => {
    if (!newdeckcode) {
      setIsValidedDeckCode(true);
      return;
    }

    const checkDeckCode = async () => {
      try {
        const formData = new FormData();
        formData.append("deckID", newdeckcode);

        const res = await fetch("https://www.pokemon-card.com/deck/deckIDCheck.php", {
          method: "POST",
          headers: {},
          body: formData,
        });

        const data = await res.json();
        setIsValidedDeckCode(data.result === 1);
      } catch (error) {
        console.error(error);
        setIsValidedDeckCode(false);
      }
    };

    checkDeckCode();
  }, [newdeckcode]);

  const createNewDeckCode = async () => {
    const data: DeckCodeCreateRequestType = {
      deck_id: deck_id,
      code: newdeckcode,
      private_code_flg: isSelected,
      memo: "",
    };

    const toastId = addToast({
      title: "デッキコードを作成中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成が完了",
        description: "デッキコードを作成しました",
        color: "success",
        timeout: 3000,
      });

      setDeckCode(ret);
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "デッキコードの作成に失敗",
        description: (
          <>
            デッキコードの作成に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });
    }
  };

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
      const res = await fetch(`/api/decks/${deck_id}/archive`, {
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
      const res = await fetch(`/api/decks/${deck_id}/unarchive`, {
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

  if (loading) {
    return (
      <Card className="pt-3">
        <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-medium pb-1">
              <Skeleton className="h-6 w-44" />
            </div>
            <div className="text-tiny">
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-2 py-2">
          <div>
            <DeckCodeCard deckcode={deckcode} />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!deck) {
    return;
  }

  return (
    <>
      <div onClick={() => onOpen()}>
        <Card className="pt-3">
          <CardHeader className="pb-0 pt-0 px-3 flex flex-col items-start gap-1">
            <div className="flex flex-col gap-1">
              <div className="font-bold text-medium pb-1">{deck.name}</div>
              <div className="text-tiny">
                作成日：
                {new Date(deck.created_at).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-2 py-2">
            <DeckCodeCard deckcode={deckcode} />
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isOpen}
        size={"md"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onOpenChange}
        classNames={{
          base: "sm:max-w-full md:max-w-lg",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex items-center gap-2">
                <>
                  {deck.name}
                  <LuSquarePen onClick={() => {}} />
                </>
              </ModalHeader>
              <ModalBody className="px-2 py-1">
                <p className="text-tiny">{deckcode?.code}</p>
                <p className="text-tiny">
                  {deckcode?.private_code_flg === true
                    ? "デッキコード非公開"
                    : "デッキコード公開"}
                </p>
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
                {isArchived ? (
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
                    <Button color="default" variant="solid" onPress={onCreateVersionOpen}>
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

      <Modal
        isOpen={isCreateVersionOpen}
        size={"sm"}
        placement={"center"}
        hideCloseButton
        onOpenChange={onCreateVersionOpenChange}
        onClose={() => {
          setNewDeckCode("");
          setIsSelected(false);
        }}
        classNames={{
          base: "sm:max-w-full md:max-w-lg",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <div>
              <ModalHeader className="flex flex-col gap-1 px-3">
                新しいバージョンを作成
              </ModalHeader>
              <ModalBody className="px-3 py-1">
                <Input
                  //isDisabled={isDisabled}
                  isInvalid={!isValidedDeckCode}
                  errorMessage="有効なデッキコードを入力してください"
                  type="text"
                  label="デッキコード"
                  labelPlacement="outside"
                  placeholder="例）"
                  value={newdeckcode}
                  onChange={(e) => setNewDeckCode(e.target.value)}
                />

                <Checkbox
                  isDisabled={newdeckcode == "" || !isValidedDeckCode}
                  defaultSelected={false}
                  size={"sm"}
                  isSelected={isSelected}
                  onValueChange={setIsSelected}
                >
                  デッキコードを非公開にする
                </Checkbox>

                <Image
                  className="relative z-0"
                  radius="sm"
                  shadow="none"
                  alt={newdeckcode ? newdeckcode : "デッキコードなし"}
                  src={
                    isValidedDeckCode
                      ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${newdeckcode}.jpg`
                      : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                  }
                  onLoad={() => {}}
                  onError={() => {}}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={() => {
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => {
                    createNewDeckCode();
                    setNewDeckCode("");
                    setIsSelected(false);
                    onClose();
                  }}
                >
                  Register
                </Button>
              </ModalFooter>
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
