"use client";

import { useEffect, useState, useCallback } from "react";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

import { Button } from "@heroui/react";
import { Image } from "@heroui/react";

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

  const handler = useCallback(async () => {
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
  }, [record.id]);

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
    return <CreateMatchModal record={record} onCreated={handler} />;
  }

  return (
    <>
      <div className="w-full overflow-y-auto">
        <Table
          removeWrapper
          isStriped
          hideHeader
          radius="none"
          aria-label="対戦結果"
          classNames={{
            th: "px-0 py-0",
            td: "px-1 py-1",
            tr: "border border-default-300",
          }}
        >
          <TableHeader>
            <TableColumn className="">情報</TableColumn>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match.id}>
                <TableCell>
                  <Button variant="light" className="px-3 py-6 w-full">
                    <div className="flex items-center gap-3 w-full">
                      <div>{match.victory_flg === true ? "⭕" : "❌"}</div>

                      <div className="flex items-center font-bold">
                        {match.default_victory_flg || match.default_defeat_flg ? (
                          <div className="pl-1">-</div>
                        ) : (
                          <>{match.games[0].go_first ? "先" : "後"}</>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {match.default_victory_flg || match.default_defeat_flg ? (
                          <>{match.default_victory_flg ? "不戦勝" : "不戦敗"}</>
                        ) : (
                          <>
                            <div className="flex items-center gap-0 -translate-y-1 shrink-0">
                              <Image
                                alt="3_mega"
                                src="/3_mega.png"
                                className="w-11 h-11 object-cover scale-120 origin-bottom"
                              />

                              <Image
                                alt="1017_teal"
                                src="/1017_teal.png"
                                className="w-11 h-11 object-cover scale-120 origin-bottom"
                              />
                            </div>
                          </>
                        )}

                        <div className="font-bold truncate">
                          {match.opponents_deck_info}
                        </div>
                      </div>
                    </div>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateMatchModal record={record} onCreated={handler} />
    </>
  );
}
