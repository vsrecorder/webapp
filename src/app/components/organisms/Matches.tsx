"use client";

import { useEffect, useState } from "react";

import { MatchGetResponseType } from "@app/types/match";

async function fetchMatches(record_id: string) {
  try {
    const res = await fetch(`/api/records/${record_id}/matches`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: MatchGetResponseType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  record_id: string;
};

export default function Matches({ record_id }: Props) {
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchMatches(record_id);
        setMatches(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [record_id]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!matches || matches.length === 0) {
    return;
  }

  return (
    <div className="flex flex-col gap-2">
      {matches.map((match) => (
        <div key={match.id}>
          <div>ID: {match.id}</div>
          <div>勝敗: {match.victory_flg === true ? "⭕" : "❌"}</div>
          <div>相手のデッキ: {match.opponents_deck_info} </div>
          {match.games.map((game) => (
            <div key={game.id}>
              <div>ID: {game.id}</div>
              <div>先後: {game.go_first === true ? "先攻" : "後攻"}</div>
              <div>メモ: {match.memo} </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
