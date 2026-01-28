"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";

import { Link } from "@heroui/react";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  event_result: CityleagueResultType;
};

export default function CityleagueResult({ event_result }: Props) {
  const [event, setEvent] = useState<OfficialEventGetByIdResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event_result.official_event_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchOfficialEventById(event_result.official_event_id);
        setEvent(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [event_result.official_event_id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!event) {
    return <div>データが存在しません</div>;
  }

  return (
    <Card className="py-3">
      <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
        <small className="text-default-500">{event.title}</small>
        <p className="font-bold text-tiny">
          {new Date(event.date).toLocaleString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
        <div className="font-bold text-medium">{event.shop_name}</div>
        <div className="flex flex-wrap items-start gap-1 pt-0.5">
          <Chip size="sm" radius="md">
            <small className="font-bold">{event.prefecture_name}</small>
          </Chip>
          <Chip size="sm" radius="md">
            <small className="font-bold">{event.league_title}リーグ</small>
          </Chip>
          <Chip size="sm" radius="md">
            <small className="font-bold">{event.environment_title}</small>
          </Chip>
        </div>
      </CardHeader>
      <CardBody className="py-3 gap-1">
        <Card shadow="sm" className="py-3">
          <CardHeader className="pb-0 pt-0 flex-col items-start gap-0.5">
            <p className="text-tiny">
              {event_result.results[0].rank === 1 ? "優勝" : ""}
            </p>
            <p className="text-tiny">
              プレイヤー名: {event_result.results[0].player_name}
            </p>
            <p className="text-tiny">プレイヤーID: {event_result.results[0].player_id}</p>
            <p className="text-tiny">
              デッキコード:{" "}
              {event_result.results[0].deck_code
                ? event_result.results[0].deck_code
                : "なし"}
            </p>
          </CardHeader>
          <CardBody className="py-2">
            {event_result.results[0].deck_code ? (
              <>
                <Image
                  radius="none"
                  shadow="none"
                  alt={event_result.results[0].deck_code}
                  src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${event_result.results[0].deck_code}.jpg`}
                />
              </>
            ) : (
              <>
                <Image
                  radius="none"
                  shadow="none"
                  alt={event_result.results[0].deck_code}
                  src={"https://www.pokemon-card.com/deck/deckView.php/deckID/"}
                />
              </>
            )}
          </CardBody>
        </Card>
        <Link
          isExternal
          showAnchorIcon
          underline="always"
          href={event_result.event_detail_result_url}
          className="text-xs"
        >
          <span>このイベントの結果を見る</span>
        </Link>
      </CardBody>
    </Card>
  );
}
