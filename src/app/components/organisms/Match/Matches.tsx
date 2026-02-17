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

import { Button } from "@heroui/react";
import { Image } from "@heroui/react";
import { Card, CardBody } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import UpdateMatchModal from "@app/components/organisms/Match/Modal/UpdateMatchModal";
import CreateMatchModalButton from "@app/components/organisms/Match/CreateMatchModalButton";
import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";

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
  enableCreateMatchModalButton: boolean;
};

export default function Matches({ record, enableCreateMatchModalButton }: Props) {
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isOpen: isOpenForUpdateMatchModal,
    onOpen: onOpenForUpdateMatchModal,
    onOpenChange: onOpenChangeForUpdateMatchModal,
  } = useDisclosure();

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
    return <MatchSkeleton enableCreateMatchModalButton={enableCreateMatchModalButton} />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <>
      <UpdateMatchModal
        isOpen={isOpenForUpdateMatchModal}
        onOpenChange={onOpenChangeForUpdateMatchModal}
      />

      <div>
        <Card>
          <CardBody className="px-2 py-2 w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <Card>
                <CardBody
                  className={`px-0 py-0.5 ${matches && matches.length === 0 ? "min-h-28" : ""} w-full`}
                >
                  <div className="px-0 py-0 w-full">
                    <Table
                      isStriped
                      hideHeader
                      aria-label="対戦結果"
                      className=""
                      classNames={{
                        wrapper: "p-1.5 shadow-none overflow-x-hidden",
                        table: "",
                        th: "px-0 py-0",
                        td: "px-0 py-0",
                      }}
                    >
                      <TableHeader>
                        <TableColumn>対戦結果</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {matches && matches.length !== 0 ? (
                          matches.map((match) => (
                            <TableRow key={match.id}>
                              <TableCell>
                                <Button
                                  radius="md"
                                  variant="light"
                                  className="px-5 py-6 w-full"
                                  onPress={() => {
                                    onOpenForUpdateMatchModal();
                                  }}
                                >
                                  <div className="flex items-center gap-5 w-full">
                                    <div>{match.victory_flg === true ? "⭕" : "❌"}</div>

                                    <div className="flex items-center font-bold">
                                      {match.default_victory_flg ||
                                      match.default_defeat_flg ? (
                                        <div className="pl-1">-</div>
                                      ) : (
                                        <>{match.games[0].go_first ? "先" : "後"}</>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {match.default_victory_flg ||
                                      match.default_defeat_flg ? (
                                        <>
                                          <>
                                            <div className="flex items-center gap-1 translate-x-1 -translate-y-1 shrink-0">
                                              <Image
                                                alt="unknown"
                                                src="/unknown.png"
                                                className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-0.5"
                                              />

                                              <Image
                                                alt="unknown"
                                                src="/unknown.png"
                                                className="w-11 h-11 object-cover scale-125 origin-bottom -translate-y-0.5"
                                              />
                                            </div>
                                          </>

                                          <div className="font-bold truncate translate-x-1">
                                            {match.default_victory_flg
                                              ? "不戦勝"
                                              : "不戦敗"}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <>
                                            <div className="flex items-center gap-1 -translate-y-1 shrink-0">
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

                                          <div className="font-bold truncate">
                                            {match.opponents_deck_info}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell>
                              <div className="pt-10 text-center">
                                対戦結果がありません
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardBody>
              </Card>

              {enableCreateMatchModalButton && (
                <CreateMatchModalButton record={record} setMatches={setMatches} />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
