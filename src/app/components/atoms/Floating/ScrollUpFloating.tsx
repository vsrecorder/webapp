"use client";

import { Button } from "@heroui/react";
import { LuArrowUp } from "react-icons/lu";

export default function ScrollUpFloating() {
  return (
    <Button
      isIconOnly
      aria-label="ページトップへ戻る"
      radius="full"
      size="lg"
      variant="flat"
      className="lg:hidden fixed z-30 bottom-20 right-3 shadow-lg bg-default-100/80 backdrop-blur-sm hover:bg-default-200 active:scale-95 transition-all duration-200"
      onPress={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <LuArrowUp className="w-5 h-5 text-default-600" />
    </Button>
  );
}
