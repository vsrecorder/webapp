"use client";

import { RecordType } from "@app/types/record";

import Link from "next/link";

export default function Record(record: RecordType) {
  return (
    <Link color="foreground" href={`/records/${record.data.id}`}>
      <div className="rounded border p-3">
        <div key={record.data.id}>
          <p className="font-medium">レコードID:</p>
          <p>{record.data.id}</p>
          <p className="text-sm text-gray-500">
            作成日: {new Date(record.data.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
