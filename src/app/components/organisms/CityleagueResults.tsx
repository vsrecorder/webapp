"use client";

import { useEffect, useState } from "react";

import { Divider } from "@heroui/react";
//import { Image } from "@heroui/react";

import CityleagueResult from "@app/components/organisms/CityleagueResult";

import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function fetchCityleagueResults(league_type: string) {
  try {
    const res = await fetch(`/api/cityleague_results?league_type=${league_type}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: CityleagueResultGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  league_type: string;
};

export default function CityleagueResults({ league_type }: Props) {
  const [cityleagueResults, setCityleagueResults] =
    useState<CityleagueResultGetResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!league_type) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchCityleagueResults(league_type);
        setCityleagueResults(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [league_type]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!cityleagueResults || cityleagueResults.count === 0) {
    return <div>データが存在しません</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {cityleagueResults.event_results.map((event_result) => (
        <div key={event_result.official_event_id}>
          <CityleagueResult event_result={event_result} />
          <div className="pt-2">
            <Divider />
          </div>
        </div>
      ))}
    </div>
  );

  /*
  return (
    <div className="flex flex-col gap-2">
      {cityleagueResults.event_results.map((event) => (
        <div key={event.official_event_id}>
          <div>cityleague_schedule_id: {event.cityleague_schedule_id}</div>
          <div>official_event_id: {event.official_event_id}</div>
          <div>date: {new Date(event.date).toLocaleString()}</div>
          <div>event_detail_result_url: {event.event_detail_result_url}</div>

          <OfficialEventInfo id={event.official_event_id} />

          {event.results.map((result) => (
            <div key={result.player_id}>
              <div>player_id: {result.player_id}</div>
              <div>player_name: {result.player_name}</div>
              <div>rank: {result.rank}</div>
              <div>point: {result.point}</div>
              <div>deck_code: {result.deck_code}</div>
              {result.deck_code ? (
                <>
                  <Image
                    alt={result.deck_code}
                    src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${result.deck_code}.jpg`}
                    shadow={"none"}
                  />
                </>
              ) : (
                <></>
              )}
            </div>
          ))}

          <div className="pt-4">
            <Divider />
          </div>
        </div>
      ))}
    </div>
  );
  */
}
