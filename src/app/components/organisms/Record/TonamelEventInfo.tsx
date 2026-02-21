import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { LuLayers } from "react-icons/lu";

import TonamelEventInfoSkeleton from "@app/components/organisms/Record/Skeleton/TonamelEventInfoSkeleton";

import { RecordGetByIdResponseType } from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";

async function fetchTonamelEventById(id: string) {
  try {
    const res = await fetch(`/api/tonamel_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: TonamelEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

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

type Props = {
  record: RecordGetByIdResponseType;
};

export default function TonamelEventInfo({ record }: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);

  const [tonamelEvent, setTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [loadingTonamelEvent, setLoadingTonamelEvent] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record.tonamel_event_id) {
      setLoadingTonamelEvent(false);
      return;
    }

    setLoadingTonamelEvent(true);

    const fetchData = async () => {
      try {
        setLoadingTonamelEvent(true);

        const data = await fetchTonamelEventById(record.tonamel_event_id);

        setTonamelEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingTonamelEvent(false);
      }
    };

    fetchData();
  }, [record.tonamel_event_id]);

  useEffect(() => {
    if (!record.deck_id) {
      setLoadingDeck(false);
      return;
    }

    setLoadingDeck(true);

    const fetchData = async () => {
      try {
        setLoadingDeck(true);
        const data = await fetchDeckById(record.deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoadingDeck(false);
      }
    };

    fetchData();
  }, [record.deck_id]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loadingTonamelEvent || !tonamelEvent) {
    return <TonamelEventInfoSkeleton />;
  }

  const date = new Date(record.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      <div className="">
        <Card shadow="sm" className="py-3 w-full">
          <CardHeader className="px-5 pb-0 pt-0 flex flex-col items-start  justify-center gap-1.5">
            <div className="flex items-center gap-3 w-full">
              <div className="font-bold text-tiny">{date}</div>

              <div className="text-tiny truncate min-w-0">
                {loadingDeck && !deck ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <div className="flex items-center gap-1">
                    <LuLayers className="text-gray-500" />

                    <div className="truncate w-full min-w-0">
                      {deck ? deck.name : "なし"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="font-bold truncate w-full min-w-0">
              {loadingTonamelEvent ? <Skeleton className="" /> : tonamelEvent.title}
            </div>
          </CardHeader>
          <CardBody className="px-7 py-3 pt-5">
            <div className="relative w-full flex justify-center">
              <Image
                alt={tonamelEvent.title}
                src={tonamelEvent.image}
                radius="none"
                className="h-36 w-[256px] object-contain"
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
