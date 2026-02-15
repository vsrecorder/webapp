"use client";

import { useEffect, useState } from "react";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

import CreateMatchModal from "@app/components/organisms/CreateMatchModal";

import { RecordGetByIdResponseType } from "@app/types/record";
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
  record: RecordGetByIdResponseType;
};

export default function Matches({ record }: Props) {
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchMatches(record.id);
        setMatches(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [record]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!matches || matches.length === 0) {
    return <CreateMatchModal record={record} />;
  }

  return (
    <>
      <Table
        isStriped
        hideHeader
        //align="center"
        aria-label="対戦結果"
        classNames={{
          th: "px-0 py-4",
          td: "px-0 py-4",
        }}
      >
        <TableHeader>
          <TableColumn>勝ち/負け</TableColumn>
          <TableColumn>先攻/後攻</TableColumn>
          <TableColumn>相手のデッキ</TableColumn>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell>{match.victory_flg === true ? "　⭕" : "　❌"}</TableCell>
              <TableCell>
                {match.default_victory_flg || match.default_defeat_flg ? (
                  <>-</>
                ) : (
                  <>{match.games[0].go_first ? "先" : "後"}</>
                )}
              </TableCell>
              <TableCell>
                {match.default_victory_flg || match.default_defeat_flg ? (
                  <>{match.default_victory_flg ? "不戦勝" : "不戦敗"}</>
                ) : (
                  <>{match.opponents_deck_info}</>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateMatchModal record={record} />
    </>
  );
}
