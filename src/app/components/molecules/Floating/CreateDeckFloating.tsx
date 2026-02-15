"use client";

import { useDisclosure } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";

type Props = {
  onCreated: () => void;
};

export default function CreateDeckFloating({ onCreated }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <LuCirclePlus
        className="lg:hidden fixed z-30 w-12 h-12 bottom-35 right-3 text-gray-600 bg-blue-300 border-0 rounded-full"
        onClick={onOpen}
      />

      <CreateDeckModal
        deck_code={""}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />
    </>
  );
}
