import { SetStateAction, Dispatch } from "react";
import { useEffect, useState } from "react";

import { addToast, closeToast } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import {
  RecordGetByIdResponseType,
  RecordUpdateRequestType,
  RecordUpdateResponseType,
} from "@app/types/record";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
};

export default function UpdateUsedDeckModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
}: Props) {
  const [tcgMeisterURL, setTCGMeisterURL] = useState<string>(
    record.tcg_meister_url ?? "",
  );
  const [isDisabled, setIsDisabled] = useState(false);
  const [couldChangeTCGMeisterURL, setCouldChangeTCGMeisterURL] = useState(false);
  const [isInvalidTCGMeisterURL, setIsInvalidTCGMeisterURL] = useState(false);

  useEffect(() => {
    if (tcgMeisterURL != "") {
      // 入力された値がTCGマイスターのURLか確認
      if (
        tcgMeisterURL.substring(0, 23) == "https://tcg.sfc-jpn.jp/" ||
        tcgMeisterURL.substring(0, 22) == "http://tcg.sfc-jpn.jp/"
      ) {
        // URLに変更があるか
        if (tcgMeisterURL == record.tcg_meister_url) {
          setIsInvalidTCGMeisterURL(false);
          setCouldChangeTCGMeisterURL(false);
        } else {
          setIsInvalidTCGMeisterURL(false);
          setCouldChangeTCGMeisterURL(true);
        }
      } else {
        setIsInvalidTCGMeisterURL(true);
        setCouldChangeTCGMeisterURL(false);
      }
    } else {
      if (tcgMeisterURL != record.tcg_meister_url) {
        setIsInvalidTCGMeisterURL(false);
        setCouldChangeTCGMeisterURL(true);
      } else {
        setIsInvalidTCGMeisterURL(false);
        setCouldChangeTCGMeisterURL(false);
      }
    }
  }, [tcgMeisterURL, record.tcg_meister_url]);

  /*
   *
   * レコードを更新する関数
   *
   */
  async function updateRecord(onClose: () => void) {
    setIsDisabled(true);

    const toastId = addToast({
      title: "変更中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    const data: RecordUpdateRequestType = {
      official_event_id: record.official_event_id,
      tonamel_event_id: record.tonamel_event_id,
      friend_id: record.friend_id,
      deck_id: record.deck_id,
      deck_code_id: record.deck_code_id,
      private_flg: record.private_flg,
      tcg_meister_url: tcgMeisterURL,
      memo: record.memo,
    };

    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      const ret: RecordUpdateResponseType = await res.json();

      addToast({
        title: "変更完了",
        description: "変更しました",
        color: "success",
        timeout: 3000,
      });

      setRecord((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          tcg_meister_url: ret.tcg_meister_url,
        };
      });

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "変更失敗",
        description: (
          <>
            変更に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={() => {
        setIsDisabled(false);
        setCouldChangeTCGMeisterURL(false);
        setIsInvalidTCGMeisterURL(false);
      }}
      isDismissable={!isDisabled}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>TCGマイスターのURLを編集</ModalHeader>
            <ModalBody>
              <Input
                isDisabled={isDisabled}
                isInvalid={isInvalidTCGMeisterURL}
                errorMessage="TCGマイスターのリンクを入力してください"
                size="md"
                radius="md"
                type="text"
                label=""
                labelPlacement="outside"
                placeholder="https://tcg.sfc-jpn.jp/tour.asp?tid=XXXXXX"
                value={tcgMeisterURL}
                onChange={(e) => setTCGMeisterURL(e.target.value)}
              />

              {record.tcg_meister_url ? (
                <HeroLink
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href={record.tcg_meister_url}
                  className="text-tiny"
                >
                  {record.tcg_meister_url}
                </HeroLink>
              ) : (
                <></>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isDisabled}
                onPress={onClose}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="success"
                variant="solid"
                isDisabled={isDisabled || !couldChangeTCGMeisterURL}
                onPress={() => {
                  updateRecord(onClose);
                }}
                className="font-bold"
              >
                変更
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
