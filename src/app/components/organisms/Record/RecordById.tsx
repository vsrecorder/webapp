"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";

import { Spinner } from "@heroui/spinner";

import DisplayRecordById from "@app/components/organisms/Record//DisplayRecordById";

import { RecordGetByIdResponseType } from "@app/types/record";

async function fetchRecordById(id: string) {
  try {
    const res = await fetch(`/api/records/` + id, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: RecordGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: string;
};

export default function RecordById({ id }: Props) {
  const [record, setRecord] = useState<RecordGetByIdResponseType>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const record = await fetchRecordById(id);
        setRecord(record);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (status === "loading") {
    return (
      <div className="pt-30 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  } else if (status == "unauthenticated") {
    return;
  }

  if (loading) {
    return (
      <div className="pt-30 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-15 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!record || !session) {
    return;
  }

  if (record.user_id !== session.user.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-sm text-center">このレコードは非公開に設定されています</div>
      </div>
    );
  }

  return (
    <>
      <DisplayRecordById recordData={record} />
    </>
  );
}
