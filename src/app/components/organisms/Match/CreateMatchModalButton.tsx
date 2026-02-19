import { SetStateAction, Dispatch } from "react";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CreateMatchModal from "@app/components/organisms/Match/Modal/CreateMatchModal";
import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

type Props = {
  record: RecordGetByIdResponseType;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
};

export default function CreateMatchModalButton({ record, setMatches }: Props) {
  const {
    isOpen: isOpenForCreateMatchModal,
    onOpen: onOpenForCreateMatchModal,
    onOpenChange: onOpenChangeForCreateMatchModal,
    onClose: onCloseForCreateMatchModal,
  } = useDisclosure();

  return (
    <>
      <Button size="sm" radius="full" onPress={onOpenForCreateMatchModal}>
        <div className="flex items-center gap-1">
          <span className="font-bold text-tiny">
            <LuCirclePlus />
          </span>
          <span className="font-bold">対戦結果を追加する</span>
        </div>
      </Button>

      <CreateMatchModal
        record={record}
        setMatches={setMatches}
        isOpen={isOpenForCreateMatchModal}
        onOpenChange={onOpenChangeForCreateMatchModal}
        onClose={onCloseForCreateMatchModal}
      />
    </>
  );
}
