import { toPng } from "html-to-image";

import { useRef } from "react";

import { SetStateAction, Dispatch } from "react";

import Link from "next/link";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { Button } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";

import { LuImageDown } from "react-icons/lu";
import { LuExternalLink } from "react-icons/lu";

//import RecordById from "@app/components/organisms/Record/RecordById";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import TonamelEventInfo from "@app/components/organisms/Record/TonamelEventInfo";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";
import TweetButton from "@app/components/organisms/Record/TweetButton";

import DeleteRecordModal from "@app/components/organisms/Record/Modal/DeleteRecordModal";

import { RecordGetByIdResponseType } from "@app/types/record";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

export default function DisplayRecordModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const {
    isOpen: isOpenForDeleteRecordModal,
    onOpen: onOpenForDeleteRecordModal,
    onOpenChange: onOpenChangeForDeleteRecordModal,
  } = useDisclosure();

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    // 下方向に30px以上スワイプしたら閉じる
    if (diff > 30) {
      startY.current = null;
      onClose();
    }
  };

  const eventCardRef = useRef<HTMLDivElement>(null);

  const handleSavingEventCardImage = async () => {
    const toastId = addToast({
      title: "画像をダウンロード中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    if (!eventCardRef.current) {
      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });

      return;
    }

    try {
      const dataUrl = await toPng(eventCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff", // 透過防止
      });

      const link = document.createElement("a");
      link.download = `${record.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.log(e);

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });

      return;
    }

    if (toastId) {
      closeToast(toastId);
    }

    addToast({
      title: "画像のダウンロードが完了",
      description: "画像をダウンロードしました",
      color: "success",
      timeout: 3000,
    });
  };

  const deckCardRef = useRef<HTMLDivElement>(null);

  const handleSavingDeckCardImage = async () => {
    const toastId = addToast({
      title: "画像をダウンロード中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    if (!deckCardRef.current) {
      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });
      return;
    }

    try {
      const dataUrl = await toPng(deckCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff", // 透過防止
      });

      const link = document.createElement("a");
      link.download = `${record.deck_id}_${record.deck_code_id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });

      return;
    }

    if (toastId) {
      closeToast(toastId);
    }

    addToast({
      title: "画像のダウンロードが完了",
      description: "画像をダウンロードしました",
      color: "success",
      timeout: 3000,
    });
  };

  return (
    <>
      <DeleteRecordModal
        record={record}
        setRecord={setRecord}
        isOpen={isOpenForDeleteRecordModal}
        onOpenChange={onOpenChangeForDeleteRecordModal}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => {}}
        onOpenChange={onOpenChange}
        size="md"
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        className="z-20 h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none overscroll-contain"
        classNames={{
          base: "sm:max-w-full",
          closeButton: "text-2xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div>レコード情報</div>

                  {/* 右側 */}
                  <div>
                    <Link href={`/records/${record.id}`} className="text-gray-500">
                      <div className="text-xl -translate-y-3">
                        <LuExternalLink />
                      </div>
                    </Link>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="px-3 pb-6 gap-9 overflow-y-auto">
                <div className="flex flex-col gap-3">
                  <div className="pb-0 flex items-center justify-center gap-1.5">
                    <div className="font-bold underline">参加したイベント</div>

                    {/* 公式イベントのみ画像の保存が可能 */}
                    {/* TonamelはCORSによって画像の保存が不可能 */}
                    {record.official_event_id !== 0 && (
                      <LuImageDown
                        onClick={handleSavingEventCardImage}
                        className="text-lg -translate-y-1"
                      />
                    )}
                  </div>

                  <div ref={eventCardRef} className="p-1 flex flex-col gap-3 bg-white">
                    {
                      // 公式イベントの場合
                      record.official_event_id !== 0 ? (
                        <OfficialEventInfo
                          record={record}
                          setRecord={setRecord}
                          enableEditTCGMeisterURL={false}
                        />
                      ) : // Tonamelの場合
                      record.tonamel_event_id !== "" ? (
                        <TonamelEventInfo record={record} />
                      ) : (
                        <></>
                      )
                    }

                    <div className="flex flex-col gap-3">
                      <Matches
                        record={record}
                        enableCreateMatchModalButton={false}
                        enableUpdateMatchModalButton={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="pb-0 flex items-center justify-center gap-1.5">
                    <div className="font-bold underline">使用したデッキ</div>
                    <LuImageDown
                      onClick={handleSavingDeckCardImage}
                      className="text-lg -translate-y-1"
                    />
                  </div>

                  <div ref={deckCardRef} className="p-1 bg-white">
                    <UsedDeckById
                      record={record}
                      setRecord={setRecord}
                      enableShowDeckModal={false}
                      enableUpdateUsedDeckModal={false}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 w-full">
                  <div className="w-full">
                    <TweetButton record={record} />
                  </div>

                  <div className="w-full">
                    <Button
                      color="danger"
                      onPress={() => {
                        onOpenForDeleteRecordModal();
                      }}
                      className="font-bold w-full"
                    >
                      このレコードを削除する
                    </Button>
                  </div>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
