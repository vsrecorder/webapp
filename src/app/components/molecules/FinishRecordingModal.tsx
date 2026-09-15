"use client";

import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";

/*
 * 「記録を終える」の確認。ホーム上部のカードと画面下のバーが共有する。
 *
 * 確認を挟むのは、この操作が取り消しにくいため。押すと「記録中」の表示が消え、戻す手段を
 * 画面に出していない。大会の合間に片手で触っている場面なので、隣の「対戦」と押し間違えた
 * ときの損失が大きい。
 *
 * 文面では「記録は消えない」ことを必ず伝える。「終える」を記録の削除と読む人がいる。
 *
 * 逆に「今日のあいだ出さなくなる」とは書かない。それは閉じた印を当日限りの cookie に
 * 置いているという実装の都合で、利用者から見ると「明日また出るのか」という余計な疑問に
 * なる。実際には翌日にはその記録のイベント日が今日でなくなるので、終えたかどうかに
 * 関わらず出てこない。
 */

type Props = {
  // 何を終えるのかを示す。空なら種別を問わない言い方にする
  eventTitle: string;
  isOpen: boolean;
  onOpenChange: () => void;
  // 確認されたときにだけ呼ばれる
  onConfirm: () => void;
};

export default function FinishRecordingModal({
  eventTitle,
  isOpen,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="pb-2">記録を終えますか？</ModalHeader>

            <ModalBody className="gap-2 py-0">
              <p className="text-sm text-default-600">
                {eventTitle !== "" ? (
                  <>
                    <span className="font-bold text-default-900">{eventTitle}</span>{" "}
                    を「記録中」として表示するのをやめます。
                  </>
                ) : (
                  <>この記録を「記録中」として表示するのをやめます。</>
                )}
              </p>
              <p className="text-xs text-default-400">
                記録そのものは残ります。対戦を足したいときは記録一覧から開けます。
              </p>
            </ModalBody>

            <ModalFooter className="gap-2">
              <Button variant="flat" radius="full" className="font-bold" onPress={onClose}>
                やめる
              </Button>
              <Button
                color="primary"
                radius="full"
                className="font-bold"
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                記録終了
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
