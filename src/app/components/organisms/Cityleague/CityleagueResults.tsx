"use client";

import { useEffect, useState } from "react";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

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
    return;
  }

  return (
    <div className="flex flex-col gap-3">
      {cityleagueResults.event_results.map(
        (event_result, index) =>
          index === index && (
            <div key={event_result.official_event_id}>
              <CityleagueResult event_result={event_result} />
            </div>
          ),
      )}
    </div>
  );
}
