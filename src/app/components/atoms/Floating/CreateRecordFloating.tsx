"use client";

import { Button } from "@heroui/react";
import { LuPlus } from "react-icons/lu";
import { useRouter } from "next/navigation";

type Props = {
  eventType: "official" | "tonamel" | "unofficial";
};

export default function CreateRecordFloating({ eventType }: Props) {
  const router = useRouter();

  return (
    <Button
      isIconOnly
      aria-label="記事を作成する"
      radius="full"
      size="lg"
      color="primary"
      className="lg:hidden fixed z-30 bottom-35 right-3 shadow-lg active:scale-95 transition-all duration-200"
      onPress={() => router.push(`/records/create?event_type=${eventType}`)}
    >
      <LuPlus className="w-5 h-5" />
    </Button>
  );
}
