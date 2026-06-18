"use client";

import { Button, useDisclosure } from "@heroui/react";
import { LuPlus } from "react-icons/lu";

import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";

type Props = {
  onCreated: () => void;
};

export default function CreateDeckFloating({ onCreated }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button
        isIconOnly
        aria-label="デッキを作成する"
        radius="full"
        size="lg"
        color="primary"
        className="lg:hidden fixed z-30 bottom-35 right-3 shadow-lg active:scale-95 transition-all duration-200"
        onPress={onOpen}
      >
        <LuPlus className="w-5 h-5" />
      </Button>

      <CreateDeckModal
        deck_code={""}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />
    </>
  );
}
