"use client";

import { useEffect, useState } from "react";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";
import { CityleagueResultType } from "@app/types/cityleague_result";

async function fetchCityleagueResultByOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/cityleague_results/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: CityleagueResultType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: number;
};

export default function CityleagueResultByOfficialEventId({ id }: Props) {
  const [cityleagueResult, setCityleagueResult] = useState<CityleagueResultType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchCityleagueResultByOfficialEventById(id);
        setCityleagueResult(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!cityleagueResult || cityleagueResult.results.length === 0) {
    return;
  }

  return (
    <div className="flex flex-col gap-2">
      {cityleagueResult.results.map((result) => (
        <div key={result.player_id}>
          <CityleagueResultCard result={result} />
        </div>
      ))}
    </div>
  );
}
