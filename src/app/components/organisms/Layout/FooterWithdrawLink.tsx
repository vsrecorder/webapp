"use client";

import { useDisclosure } from "@heroui/react";

import WithdrawModal from "@app/components/organisms/User/Modal/WithdrawModal";

type Props = {
  userId: string;
};

export default function FooterWithdrawLink({ userId }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="text-left text-[11px] text-neutral-700 hover:text-neutral-500 transition-colors duration-150"
      >
        退会する
      </button>

      <WithdrawModal userId={userId} isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
}
