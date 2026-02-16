"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";

import { Card, CardBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { Skeleton } from "@heroui/react";

type Props = {
  enableCreateMatchModal: boolean;
};

export default function MatchSkeleton({ enableCreateMatchModal }: Props) {
  return (
    <div>
      <Card>
        <CardBody className="px-3 py-1.5 w-full">
          <div className="flex flex-col gap-1.5 w-full">
            <Card>
              <CardBody className="px-0 py-0.5 min-h-42 w-full">
                <div className="px-0 py-0 w-full">
                  <Table
                    isStriped
                    hideHeader
                    aria-label="対戦結果"
                    className=""
                    classNames={{
                      wrapper: "p-1.5 shadow-none",
                      table: "",
                      th: "px-0 py-0",
                      td: "px-0 py-0",
                    }}
                  >
                    <TableHeader>
                      <TableColumn>対戦結果</TableColumn>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Button
                            radius="md"
                            variant="light"
                            className="px-0 py-6 w-full"
                          >
                            <Skeleton className="w-full h-full" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>
                          <Button
                            radius="md"
                            variant="light"
                            className="px-0 py-6 w-full"
                          >
                            <Skeleton className="w-full h-full" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>
                          <Button
                            radius="md"
                            variant="light"
                            className="px-0 py-6 w-full"
                          >
                            <Skeleton className="w-full h-full" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardBody>
            </Card>

            {enableCreateMatchModal && <Skeleton className="h-8 w-full rounded-2xl" />}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/*
export function MatchSkeleton({ enableCreateMatchModal }: Props) {
  return (
    <Card>
      <CardBody className="px-3 py-1.5 w-full">
        <div className="flex flex-col gap-1.5 w-full">
          <Card>
            <CardBody className="px-0 py-0.5 min-h-42 w-full">
              <div className="px-0 py-0 w-full">
                <Table
                  isStriped
                  hideHeader
                  aria-label="対戦結果"
                  className=""
                  classNames={{
                    wrapper: "p-1.5 shadow-none",
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
                              className="px-6 py-6 w-full"
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

                                <div className="flex items-center gap-0.5">
                                  {match.default_victory_flg ||
                                  match.default_defeat_flg ? (
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
                      ))
                    ) : (
                      <>
                        <TableRow>
                          <TableCell className="text-tiny text-center">
                            対戦結果がありません
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>

          {enableCreateMatchModal && <Skeleton className="h-5.5 w-24 rounded-2xl" />}
        </div>
      </CardBody>
    </Card>
  );
}

*/
