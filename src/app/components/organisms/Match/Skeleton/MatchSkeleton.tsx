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
  enableCreateMatchModalButton: boolean;
};

export default function MatchSkeleton({ enableCreateMatchModalButton }: Props) {
  return (
    <div>
      <Card>
        <CardBody className="px-2 py-2 w-full">
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

            {enableCreateMatchModalButton && (
              <Skeleton className="h-8 w-full rounded-2xl" />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
