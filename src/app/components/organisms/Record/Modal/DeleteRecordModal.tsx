import { useState, SetStateAction, Dispatch } from "react";

import { ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import { RecordGetByIdResponseType } from "@app/types/record";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";
import { navigateAfterModalClose } from "@app/utils/modalHistory";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  // 削除完了後に別ページへ移りたいときの遷移処理(記録詳細ページ → 記録一覧など)。
  // 渡された場合は setRecord(null) を行わない。遷移が終わるまでの一瞬、
  // 中身の消えたページが見えてしまうため。
  onDeleted?: () => void;
};

export default function DeleteRecordModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
  onDeleted,
}: Props) {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const deleteRecord = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "記録を削除中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "記録の削除が完了",
        description: "記録を削除しました",
        color: "success",
        timeout: 3000,
      });

      // 記録の削除は称号のtierを下げ、ストリークの連続週数も減らしうる(どちらも永続化せず
      // 都度ライブ判定するため)。サーバはこのDELETEの中で称号喪失・ランクダウンの通知を作り、
      // 連続週数が届かなくなったストリーク通知を取り消すので、ポーリング(60秒)を待たず
      // その場で通知ベルを再取得させる。
      triggerNotificationsRefresh();

      onClose();
      setIsSelected(false);
      setIsDisabled(false);

      if (onDeleted) {
        // 閉じる操作で巻き戻る履歴(useCloseModalOnBack が積んだ戻り先)が
        // 落ち着いてから遷移する。先に遷移させると打ち消されて元のページに残る。
        navigateAfterModalClose(onDeleted);
      } else {
        // 一覧のカードから開いた場合。カード自身を消して、削除済みの記録を残さない
        setRecord(null);
      }
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "記録の削除に失敗",
        description: (
          <>
            記録の削除に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
      setIsSelected(false);
      setIsDisabled(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
      isDismissable={!isDisabled}
      // 処理中はESCキーでも閉じられないようにする
      isKeyboardDismissDisabled={isDisabled}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3 flex items-center gap-2">
              この記録を削除しますか？
            </ModalHeader>
            <ModalBody className="px-2 py-1">
              <Alert color="danger">
                <Checkbox
                  name="delete-record-confirm"
                  size={"sm"}
                  color="danger"
                  isDisabled={isDisabled}
                  isSelected={isSelected}
                  defaultSelected={false}
                  onValueChange={setIsSelected}
                >
                  削除する
                </Checkbox>
              </Alert>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={() => {
                  onClose();
                  setIsSelected(false);
                  setIsDisabled(false);
                }}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="danger"
                variant="solid"
                isDisabled={isDisabled || !isSelected}
                onPress={() => {
                  deleteRecord(onClose);
                }}
                className="text-white font-bold"
              >
                削除
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
