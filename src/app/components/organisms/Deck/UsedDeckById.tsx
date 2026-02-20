"use client";

import { SetStateAction, Dispatch } from "react";

import { useEffect, useState } from "react";

import { useDisclosure } from "@heroui/react";

import UpdateUsedDeckModal from "@app/components/organisms/Deck/Modal/UpdateUsedDeckModal";
import UsedDeckCard from "@app/components/organisms/Deck/UsedDeckCard";
import { DeckCardSkeleton } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";

import { RecordType } from "@app/types/record";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/${id}`, {
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

async function fetchDeckCodeById(id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${id}`, {
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
  record: RecordType;
  setRecords: Dispatch<SetStateAction<RecordType[]>>;
  deck_id: string;
  deck_code_id: string;
  enableShowDeckModal: boolean;
};

export default function UsedDeckById({
  record,
  setRecords,
  deck_id,
  deck_code_id,
  enableShowDeckModal,
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  const {
    isOpen: isOpenForUpdateUsedDeckModal,
    onOpen: onOpenForUpdateUsedDeckModal,
    onOpenChange: onOpenChangeForUpdateUsedDeckModal,
  } = useDisclosure();

  useEffect(() => {
    if (!deck_id) {
      setLoading1(false);
      setLoading2(false);
      return;
    }

    const fetchDeckData = async () => {
      setLoading1(true);

      try {
        const data = await fetchDeckById(deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError1("デッキデータの取得に失敗しました");
      } finally {
        setLoading1(false);
      }
    };

    const fetchDeckCodesData = async () => {
      setLoading2(true);

      try {
        const data = await fetchDeckCodeById(deck_code_id);
        setDeckCode(data);
      } catch (err) {
        console.log(err);
        setError2("デッキコードデータの取得に失敗しました");
      } finally {
        setLoading2(false);
      }
    };

    if (deck_id) {
      fetchDeckData();
    } else {
      setLoading1(false);
    }

    if (deck_code_id) {
      fetchDeckCodesData();
    } else {
      setLoading2(false);
    }
  }, [deck_id, deck_code_id]);

  if (loading1 || loading2) {
    return <DeckCardSkeleton />;
  }

  if (error1 || error2) {
    return (
      <div className="text-red-500">
        {error1}
        <br />
        {error2}
      </div>
    );
  }

  return (
    <>
      <UpdateUsedDeckModal
        record={record}
        setRecords={setRecords}
        isOpen={isOpenForUpdateUsedDeckModal}
        onOpenChange={onOpenChangeForUpdateUsedDeckModal}
      />

      <div onClick={onOpenForUpdateUsedDeckModal}>
        <UsedDeckCard
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          enableShowDeckModal={enableShowDeckModal}
        />
      </div>
    </>
  );
}
