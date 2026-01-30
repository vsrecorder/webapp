"use client";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import Link from "next/link";

import { RecordType } from "@app/types/record";

type Props = {
  record: RecordType;
};

export default function Record({ record }: Props) {
  return (
    <Link color="foreground" href={`/records/${record.data.id}`}>
      <Card shadow="sm" className="py-3">
        <CardHeader className="pb-0 pt-0 flex-col items-start gap-0">
          <p className="font-bold">{record.data.id}</p>
          <p className="font-bold text-tiny">
            {new Date(record.data.created_at).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </p>
        </CardHeader>
        <CardBody className="py-2">
          <Image alt="ジムバトル" src="/gym.png" radius="none" className="w-2/5" />
        </CardBody>
      </Card>
    </Link>
  );
}
