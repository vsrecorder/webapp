import { SetStateAction, Dispatch } from "react";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CreateMatchModal from "@app/components/organisms/Match/Modal/CreateMatchModal";
import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

type Props = {
  record: RecordGetByIdResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  // 横幅いっぱい＋縦を高めにして表示するか(戦績カード内のパネル下部で使用)
  fullWidth?: boolean;
};

export default function CreateMatchModalButton({
  record,
  setMatches,
  fullWidth = false,
}: Props) {
  const {
    isOpen: isOpenForCreateMatchModal,
    onOpen: onOpenForCreateMatchModal,
    onOpenChange: onOpenChangeForCreateMatchModal,
    onClose: onCloseForCreateMatchModal,
  } = useDisclosure();

  return (
    <>
      <Button
        size="sm"
        radius="full"
        fullWidth={fullWidth}
        className={fullWidth ? "h-10" : ""}
        onPress={onOpenForCreateMatchModal}
      >
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${fullWidth ? "text-sm" : "text-tiny"}`}>
            <LuCirclePlus />
          </span>
          <span className={`font-bold ${fullWidth ? "text-sm" : ""}`}>
            対戦結果を追加する
          </span>
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
