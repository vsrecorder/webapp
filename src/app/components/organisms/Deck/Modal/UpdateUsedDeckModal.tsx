import { createHash } from "crypto";

import useSWR from "swr";

import WindowedSelect from "react-windowed-select";
import Select from "react-select";

import { SetStateAction, Dispatch } from "react";
import { useEffect, useState } from "react";

import { addToast, closeToast } from "@heroui/react";
import { Image } from "@heroui/react";
import { Button } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { CgSearch } from "react-icons/cg";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { RecordGetByIdResponseType } from "@app/types/record";
import { RecordUpdateRequestType, RecordUpdateResponseType } from "@app/types/record";

import { DeckGetAllType, DeckData } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

async function fetcherForDeck(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: DeckGetAllType = await res.json();

  return ret;
}

type DeckOption = {
  label: string;
  value: string;
  id: string;
  created_at: string;
  name: string;
  private_flg: boolean;
  latest_deck_code: DeckCodeType;
};

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const charCode = match.charCodeAt(0);

    // 「ヴ」はひらがなの「ゔ」（\u3094）へ、それ以外は一律 -0x60
    return String.fromCharCode(charCode === 0x30f4 ? 0x3094 : charCode - 0x60);
  });
}

function convertToDeckOption(data: DeckData): DeckOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    label: data.name + " - " + katakanaToHiragana(data.name),
    value: data.id,
    id: data.id,
    created_at: created_at,
    name: data.name,
    private_flg: data.private_flg,
    latest_deck_code: data.latest_deck_code,
  };
}

async function fetcherForDeckCode(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const ret: DeckCodeType[] = await res.json();

  return ret;
}

type DeckCodeOption = {
  label: string;
  value: string;
  id: string;
  deck_id: string;
  created_at: string;
  code: string;
  private_code_flg: boolean;
};

function convertToDeckCodeOption(data: DeckCodeType): DeckCodeOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    label: createHash("sha1").update(data.id).digest("hex").slice(0, 8),
    value: data.id,
    id: data.id,
    deck_id: data.deck_id,
    created_at: created_at,
    code: data.code,
    private_code_flg: data.private_code_flg,
  };
}

type Props = {
  record: RecordGetByIdResponseType | null;
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
  const [selectedDeckOption, setSelectedDeckOption] = useState<DeckOption | null>(null);
  const [selectedDeckCodeOption, setSelectedDeckCodeOption] =
    useState<DeckCodeOption | null>(null);

  const [imageLoadedForDeck, setImageLoadedForDeck] = useState(false);
  const [imageLoadedForDeckCode, setImageLoadedForDeckCode] = useState(false);

  const [isLoadingDeckOptions, setIsLoadingDeckOptions] = useState<boolean>(true);
  const [isLoadingDeckCodeOptions, setIsLoadingDeckCodeOptions] = useState<boolean>(true);

  const [isDeckChangedByUser, setIsDeckChangedByUser] = useState(false);

  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  /*
    recordにdeck_idとdeck_code_idがある場合、
    deck_idのDeckとdeck_code_idのDeckCodeを取得し、
    選択しているデッキ/バージョンとして指定
  */
  useEffect(() => {
    if (!isOpen || !record) {
      setIsLoadingDeckOptions(false);
      setIsLoadingDeckCodeOptions(false);
      return;
    }

    const setSelectedDeck = async () => {
      setIsLoadingDeckOptions(true);

      try {
        const res = await fetch(`/api/decks/${record.deck_id}`, {
          cache: "no-store",
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const ret: DeckData = await res.json();

        setSelectedDeckOption(convertToDeckOption(ret));

        setImageLoadedForDeck(false);
        return ret;
      } catch (error) {
        setSelectedDeckOption(null);
        console.error(error);
      } finally {
        setIsLoadingDeckOptions(false);
      }
    };

    const setSelectedDeckCode = async () => {
      setIsLoadingDeckCodeOptions(true);

      try {
        const res = await fetch(`/api/deckcodes/${record.deck_code_id}`, {
          cache: "no-store",
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const ret: DeckCodeType = await res.json();

        setSelectedDeckCodeOption(convertToDeckCodeOption(ret));

        setImageLoadedForDeckCode(false);
        return ret;
      } catch (error) {
        setSelectedDeckCodeOption(null);
        console.error(error);
      } finally {
        setIsLoadingDeckCodeOptions(false);
      }
    };

    if (record.deck_id) {
      setSelectedDeck();
    } else {
      setIsLoadingDeckOptions(false);
    }

    if (record.deck_code_id) {
      setSelectedDeckCode();
    } else {
      setIsLoadingDeckCodeOptions(false);
    }
  }, [isOpen, record]);

  /*
   *
   * デッキ選択のデータを取得
   *
   */
  const deckOptions: DeckOption[] = [];
  let deckOptionsMessage = "デッキがありません";
  {
    const { data, error, isLoading } = useSWR<DeckGetAllType, Error>(
      `/api/decks/all`,
      fetcherForDeck,
    );

    if (error) {
      deckOptionsMessage = "エラーが発生しました";
    }

    if (isLoading) {
      deckOptionsMessage = "検索中...";
    }

    data?.map((deck: DeckData) => {
      deckOptions.push(convertToDeckOption(deck));
    });

    if (data?.length == 0) {
      deckOptionsMessage = "デッキがありません";
    }
  }

  /*
   *
   * バージョン(デッキコード)選択のデータを取得
   *
   * 選択されたデッキが変更されるたびに実施される
   *
   */
  const deckcodeOptions: DeckCodeOption[] = [];
  let deckcodeOptionsMessage = "バージョンがありません";
  const {
    data: deckcodeData,
    error: deckcodeError,
    isLoading: deckcodeLoading,
  } = useSWR<DeckCodeType[], Error>(
    selectedDeckOption ? `/api/decks/${selectedDeckOption.id}/deckcodes` : null,
    fetcherForDeckCode,
  );

  if (deckcodeError) {
    deckcodeOptionsMessage = "エラーが発生しました";
  }

  if (deckcodeLoading) {
    deckcodeOptionsMessage = "検索中...";
  }

  deckcodeData?.forEach((deckcode: DeckCodeType) => {
    deckcodeOptions.push(convertToDeckCodeOption(deckcode));
  });

  if (deckcodeData?.length === 0) {
    deckcodeOptionsMessage = "対象のデッキにバージョンがありません";
  }

  /*
   *
   * recordのdeck_id/deck_code_idと選択されたデッキ/バージョンが
   * 同じである場合は変更できないようにする
   *
   */
  useEffect(() => {
    // レコードに設定されている使用されたデッキがない場合
    if (!record?.deck_id) {
      // 選択されたデッキとデッキコードがある場合
      if (selectedDeckOption && selectedDeckCodeOption) {
        setIsDisabled(false);
      } else {
        setIsDisabled(true);
      }

      // レコードに設定されている使用されたデッキコードがない場合
    } else if (!record.deck_code_id) {
      // レコードに設定されている使用されたデッキと選択したデッキが異なる場合
      if (record.deck_id !== selectedDeckOption?.id) {
        setIsDisabled(false);
      } else {
        // 選択されたデッキコードがある場合
        if (selectedDeckCodeOption?.id) {
          setIsDisabled(false);
        } else {
          setIsDisabled(true);
        }
      }

      // 選択されたデッキがない場合
      if (!selectedDeckOption) {
        setIsDisabled(true);
      }

      // レコードに設定されている使用されたデッキとデッキコードが
      // 選択されたデッキとデッキコードと同じ場合
    } else if (
      record.deck_id === selectedDeckOption?.id &&
      record.deck_code_id === selectedDeckCodeOption?.id
    ) {
      setIsDisabled(true);

      // 選択されたデッキがない場合
    } else if (!selectedDeckOption) {
      setIsDisabled(true);
      // 選択されたデッキコードがない場合
    } else if (!selectedDeckCodeOption) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  }, [record?.deck_id, record?.deck_code_id, selectedDeckOption, selectedDeckCodeOption]);

  /*
   *
   * バージョン(デッキコード)選択のデータが変更された場合、
   * 最新のデッキコードのデータを選択されたバージョンとして設定する
   *
   */
  useEffect(() => {
    setIsLoadingDeckCodeOptions(true);

    if (!deckcodeData || deckcodeData.length === 0) {
      setSelectedDeckCodeOption(null);

      setImageLoadedForDeckCode(false);
      setIsLoadingDeckCodeOptions(false);

      return;
    }

    // ユーザによるデッキ選択の操作が行われる前は実行されないようにする
    if (isDeckChangedByUser) {
      // 最新のデッキコードのデータを選択されたバージョンとして設定する
      setSelectedDeckCodeOption(convertToDeckCodeOption(deckcodeData[0]));
      // 初期化
      setIsDeckChangedByUser(false);
    }

    setImageLoadedForDeckCode(false);
    setIsLoadingDeckCodeOptions(false);
  }, [deckcodeData, isDeckChangedByUser]);

  /*
   *
   * レコードを更新する関数
   *
   */
  async function updateRecord(deckId: string, deckcodeId: string, onClose: () => void) {
    setIsUpdating(true);

    const toastId = addToast({
      title: "変更中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    const data: RecordUpdateRequestType = {
      official_event_id: record ? record.official_event_id : 0,
      tonamel_event_id: record ? record.tonamel_event_id : "",
      friend_id: record ? record.friend_id : "",
      deck_id: deckId,
      deck_code_id: deckcodeId,
      private_flg: record ? record.private_flg : true,
      tcg_meister_url: record ? record.tcg_meister_url : "",
      memo: record ? record.memo : "",
    };

    try {
      const res = await fetch(`/api/records/${record?.id}`, {
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
          deck_id: ret.deck_id,
          deck_code_id: ret.deck_code_id,
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

  if (!record) {
    return;
  }

  return (
    <Modal
      isOpen={isOpen}
      size={"md"}
      placement="center"
      onOpenChange={onOpenChange}
      isDismissable={false}
      onClose={() => {
        setSelectedDeckOption(null);
        setSelectedDeckCodeOption(null);

        setImageLoadedForDeck(false);
        setImageLoadedForDeckCode(false);

        setIsLoadingDeckOptions(true);
        setIsLoadingDeckCodeOptions(true);

        setIsDeckChangedByUser(false);
        setIsDisabled(false);
        setIsUpdating(false);
      }}
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-2xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-3">使用したデッキを編集</ModalHeader>
            <ModalBody className="px-3 py-1">
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">デッキ名</label>
                    <div>
                      <WindowedSelect
                        windowThreshold={50}
                        minMenuHeight={330}
                        maxMenuHeight={330}
                        placeholder={
                          <div className="flex items-center gap-2">
                            <div className="text-xl">
                              <CgSearch />
                            </div>
                            <span className="text-sm">デッキ名</span>
                          </div>
                        }
                        isLoading={isLoadingDeckOptions}
                        isDisabled={isLoadingDeckOptions}
                        isClearable={true}
                        isSearchable={true}
                        noOptionsMessage={() => deckOptionsMessage}
                        options={deckOptions}
                        value={selectedDeckOption}
                        onChange={(option) => {
                          setSelectedDeckCodeOption(null);
                          setIsDeckChangedByUser(true);
                          setSelectedDeckOption(option as DeckOption);
                          setImageLoadedForDeck(false);
                          setIsLoadingDeckCodeOptions(true);
                        }}
                        menuPosition="fixed"
                        menuPlacement="bottom"
                        menuShouldBlockScroll={true}
                        menuShouldScrollIntoView={true}
                        formatOptionLabel={(option, { context }) => {
                          const opt = option as DeckOption;
                          if (context === "menu") {
                            return (
                              <div className="text-sm truncate border-1 p-2">
                                <div className="grid">
                                  <span className="truncate">
                                    登録日：{opt.created_at}
                                  </span>

                                  <span className="truncate">デッキ名：{opt.name}</span>

                                  <span className="pt-1">
                                    <div className="relative w-full aspect-2/1">
                                      {!imageLoadedForDeck && (
                                        <Skeleton className="absolute inset-0 rounded-lg" />
                                      )}
                                      <Image
                                        radius="none"
                                        shadow="none"
                                        alt={opt.latest_deck_code.code}
                                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${opt.latest_deck_code.code}.jpg`}
                                        className=""
                                        onLoad={() => setImageLoadedForDeck(true)}
                                      />
                                    </div>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="text-sm truncate">
                              <span>{opt.name}</span>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="pb-3 flex flex-col gap-1.5">
                    <label className="text-sm font-medium">バージョン</label>
                    <div>
                      <Select
                        minMenuHeight={270}
                        maxMenuHeight={270}
                        placeholder={
                          <div className="flex items-center gap-2">
                            <span className="text-sm">バージョン</span>
                          </div>
                        }
                        isLoading={isLoadingDeckCodeOptions}
                        isDisabled={isLoadingDeckCodeOptions}
                        isClearable={true}
                        isSearchable={false}
                        noOptionsMessage={() => deckcodeOptionsMessage}
                        options={deckcodeOptions}
                        value={selectedDeckCodeOption}
                        onChange={(option) => {
                          setSelectedDeckCodeOption(option);

                          setImageLoadedForDeckCode(false);
                        }}
                        menuPosition="fixed"
                        menuPlacement="bottom"
                        menuShouldScrollIntoView={true}
                        formatOptionLabel={(option, { context }) => {
                          if (context === "menu") {
                            return (
                              <div className="text-sm truncate border-1 p-2">
                                <div className="grid">
                                  <span className="truncate">
                                    作成日：{option.created_at}
                                  </span>
                                  <span className="truncate">
                                    バージョン：
                                    {createHash("sha1")
                                      .update(option.id)
                                      .digest("hex")
                                      .slice(0, 8)}
                                  </span>
                                  <span className="truncate">
                                    デッキコード：{option.code}
                                  </span>
                                  <span className="pt-1">
                                    <div className="relative w-full aspect-2/1">
                                      {!imageLoadedForDeckCode && (
                                        <Skeleton className="absolute inset-0 rounded-lg" />
                                      )}
                                      <Image
                                        radius="none"
                                        shadow="none"
                                        alt={option.code}
                                        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${option.code}.jpg`}
                                        className=""
                                        onLoad={() => setImageLoadedForDeckCode(true)}
                                      />
                                    </div>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="text-sm truncate">
                              <span>
                                バージョン：
                                {createHash("sha1")
                                  .update(option.id)
                                  .digest("hex")
                                  .slice(0, 8)}
                              </span>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative w-full aspect-2/1">
                    {!imageLoadedForDeckCode && (
                      <Skeleton className="absolute inset-0 rounded-lg" />
                    )}
                    <Image
                      radius="sm"
                      shadow="none"
                      alt={
                        selectedDeckCodeOption
                          ? selectedDeckCodeOption.code
                          : "デッキコードなし"
                      }
                      src={
                        selectedDeckCodeOption
                          ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${selectedDeckCodeOption.code}.jpg`
                          : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                      }
                      className="z-0"
                      //onLoad={() => {}}
                      onError={() => {}}
                    />
                  </div>
                </div>
              </>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="solid"
                isDisabled={isUpdating}
                onPress={onClose}
                className="font-bold"
              >
                戻る
              </Button>
              <Button
                color="success"
                variant="solid"
                isDisabled={
                  isUpdating ||
                  isDisabled ||
                  isLoadingDeckOptions ||
                  isLoadingDeckCodeOptions
                }
                onPress={() => {
                  updateRecord(
                    selectedDeckOption ? selectedDeckOption.id : "",
                    selectedDeckCodeOption ? selectedDeckCodeOption.id : "",
                    onClose,
                  );
                }}
                className="text-white font-bold"
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
