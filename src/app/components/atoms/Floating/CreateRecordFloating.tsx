"use client";

import { Button } from "@heroui/react";
import { LuPlus } from "react-icons/lu";
import { useRouter } from "next/navigation";

type Props = {
  eventType: "all" | "official" | "tonamel" | "unofficial";
};

export default function CreateRecordFloating({ eventType }: Props) {
  const router = useRouter();

  // すべてタブからの作成は種別を確定できないため公式イベントの作成画面へ誘導する。
  const createEventType = eventType === "all" ? "official" : eventType;

  return (
    <Button
      isIconOnly
      aria-label="記事を作成する"
      radius="full"
      size="lg"
      color="primary"
      className="lg:hidden fixed z-30 bottom-36 right-3 shadow-lg active:scale-95 transition-all duration-200"
      onPress={() => router.push(`/records/create?event_type=${createEventType}`)}
    >
      <LuPlus className="w-5 h-5" />
    </Button>
  );
}
