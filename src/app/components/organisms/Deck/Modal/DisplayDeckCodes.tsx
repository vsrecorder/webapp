import { useRef } from "react";

import { useEffect, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckCodesByDeckId(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}/deckcodes`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  deck: DeckGetByIdResponseType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function DisplayDeckCodesModal({ deck, isOpen, onOpenChange }: Props) {
  const startY = useRef<number | null>(null);
  const [deckcodes, setDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    // 下方向に30px以上スワイプしたら閉じる
    if (diff > 30) {
      startY.current = null;
      onOpenChange();
    }
  };

  useEffect(() => {
    if (!isOpen || !deck || !deck.id || !deck.latest_deck_code.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchDeckCodesData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCodesByDeckId(deck.id);
        setDeckCodes(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchDeckCodesData();
  }, [isOpen, deck]);

  if (!deck) {
    return;
  }

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {}}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知エリア */}
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="flex flex-col gap-1 cursor-grab"
            >
              <div className="mx-auto h-1 w-15 rounded-full bg-default-300" />
              <div>バージョン一覧</div>
            </ModalHeader>
            <ModalBody className="overflow-y-auto">
              <>
                {loading ? (
                  <>読み込み中</>
                ) : !error ? (
                  <>
                    {deckcodes?.map((deckcode) => (
                      <div key={deckcode.id}>{deckcode.code}</div>
                    ))}
                  </>
                ) : (
                  <>{error}</>
                )}
              </>
            </ModalBody>
            <ModalFooter></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
