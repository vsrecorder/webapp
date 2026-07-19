import useSWR from "swr";

import WindowedSelect from "react-windowed-select";
import Select from "react-select";
import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";

import { SetStateAction, Dispatch } from "react";
import { useEffect, useRef, useState } from "react";

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
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { triggerNotificationsRefresh } from "@app/utils/notificationEvents";

// 失敗レスポンスのボディをそのまま返すと、選択肢を組み立てるmap/forEachがレンダー中に
// 例外になりページ全体が落ちる。取得できなかったことはSWRのerrorとして扱う。
async function fetcherForDeck(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

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
  pokemon_sprites: DeckPokemonSpriteType[];
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
    pokemon_sprites: data.pokemon_sprites ?? [],
  };
}

// デッキの先頭2匹のポケモンスプライトを表示する。
// スプライトが未設定のスロットは unknown 画像で補完し、記録作成画面と同じ見た目を踏襲する。
function DeckSprites({
  sprites,
  size = 36,
}: {
  sprites: DeckPokemonSpriteType[];
  size?: number;
}) {
  const slots = [getDeckSpriteBySlot(sprites, 1), getDeckSpriteBySlot(sprites, 2)];

  return (
    <div className="flex items-center gap-0 shrink-0">
      {slots.map((sprite, i) => (
        <PokemonSprite key={i} id={sprite?.id} size={size} />
      ))}
    </div>
  );
}

async function fetcherForDeckCode(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

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

// versionNumber: 作成日時の昇順で数えた通し番号（1が初回）。
// 一覧取得前で不明な場合は null を渡すと、後続の補正処理で更新される。
function convertToDeckCodeOption(
  data: DeckCodeType,
  versionNumber: number | null,
): DeckCodeOption {
  const created_at = new Date(data.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return {
    label: versionNumber !== null ? String(versionNumber) : "",
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
  // react-select をダークモードに追従させるテーマ
  const reactSelectTheme = useReactSelectTheme();

  // セレクターを閉じたときにフォーカスを引き受けるための要素
  // フォーカストラップを満たしつつキーボードを閉じるために使用
  const focusSinkRef = useRef<HTMLDivElement>(null);

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

        // 通し番号(バージョン)を求めるため、同じデッキの全バージョンを取得する
        let versionNumber: number | null = null;
        try {
          const list = await fetcherForDeckCode(`/api/decks/${ret.deck_id}/deckcodes`);
          const index = list.findIndex((dc) => dc.id === ret.id);
          if (index !== -1) versionNumber = list.length - index;
        } catch (error) {
          console.error(error);
        }

        setSelectedDeckCodeOption(convertToDeckCodeOption(ret, versionNumber));

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

  deckcodeData?.forEach((deckcode: DeckCodeType, index: number) => {
    deckcodeOptions.push(convertToDeckCodeOption(deckcode, deckcodeData.length - index));
  });

  if (deckcodeData?.length === 0) {
    deckcodeOptionsMessage = "対象のデッキにバージョンがありません";
  }

  /*
   *
   * deck_code_idから単体取得した直後は通し番号が不明(label: "")のため、
   * 一覧(deckcodeData)が揃い次第、正しいバージョン番号に補正する
   *
   */
  useEffect(() => {
    if (!deckcodeData) return;

    setSelectedDeckCodeOption((prev) => {
      if (!prev || prev.label !== "") return prev;

      const index = deckcodeData.findIndex((dc) => dc.id === prev.id);
      if (index === -1) return prev;

      return { ...prev, label: String(deckcodeData.length - index) };
    });
  }, [deckcodeData]);

  /*
   *
   * recordのdeck_id/deck_code_idと選択されたデッキ/バージョンが
   * 同じである場合は変更できないようにする
   *
   */
  useEffect(() => {
    // デッキが未選択、またはバージョンの取得中は変更不可
    if (!selectedDeckOption || deckcodeLoading) {
      setIsDisabled(true);
      return;
    }

    // 選択されたデッキにバージョンが存在するにも関わらず、
    // バージョンが選択されていない場合は変更不可
    // (バージョンが存在しないデッキの場合は未選択のままでよい)
    if (deckcodeOptions.length > 0 && !selectedDeckCodeOption) {
      setIsDisabled(true);
      return;
    }

    // 記録に設定されている使用デッキ/バージョンと選択内容が
    // 同じ場合は変更不可
    const isSameDeck = record?.deck_id === selectedDeckOption.id;
    const isSameDeckCode =
      (record?.deck_code_id ?? null) === (selectedDeckCodeOption?.id ?? null);

    setIsDisabled(isSameDeck && isSameDeckCode);
  }, [
    record?.deck_id,
    record?.deck_code_id,
    selectedDeckOption,
    selectedDeckCodeOption,
    deckcodeLoading,
    deckcodeOptions.length,
  ]);

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
      setSelectedDeckCodeOption(
        convertToDeckCodeOption(deckcodeData[0], deckcodeData.length),
      );
      // 初期化
      setIsDeckChangedByUser(false);
    }

    setImageLoadedForDeckCode(false);
    setIsLoadingDeckCodeOptions(false);
  }, [deckcodeData, isDeckChangedByUser]);

  /*
   *
   * 記録を更新する関数
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
      ignore_stats_flg: record ? record.ignore_stats_flg : false,
      tcg_meister_url: record ? record.tcg_meister_url : "",
      memo: record ? record.memo : "",
      event_date: record ? record.event_date : "",
      unofficial_event_id: record ? record.unofficial_event_id : "",
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

      triggerNotificationsRefresh();

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
      isDismissable={false}
      // 更新処理中(isUpdating)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
      isKeyboardDismissDisabled={isUpdating}
      hideCloseButton={isUpdating}
      onOpenChange={() => {
        if (isUpdating) return;
        onOpenChange();
      }}
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
        closeButton: "text-xl",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-lg px-3">使用したデッキを編集</ModalHeader>
            <ModalBody className="px-3 py-1 gap-3">
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">デッキ</label>
                  <div>
                    <WindowedSelect
                      theme={reactSelectTheme}
                      windowThreshold={50}
                      minMenuHeight={330}
                      maxMenuHeight={330}
                      placeholder={
                        <div className="flex items-center gap-2">
                          <div className="text-xl">
                            <CgSearch />
                          </div>
                          <span className="text-sm">デッキ</span>
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
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                      menuPlacement="bottom"
                      menuShouldScrollIntoView={true}
                      onMenuClose={() => {
                        focusSinkRef.current?.focus();
                      }}
                      formatOptionLabel={(option, { context }) => {
                        const opt = option as DeckOption;
                        if (context === "menu") {
                          return (
                            <div className="text-sm truncate border-1 p-2">
                              <div className="grid min-w-0">
                                <span className="truncate">
                                  登録日：{opt.created_at}
                                </span>

                                <div className="pl-0.5 flex items-center gap-2 min-w-0">
                                  <DeckSprites
                                    sprites={opt.pokemon_sprites}
                                    size={28}
                                  />
                                  <span className="truncate">{opt.name}</span>
                                </div>

                                <span className="pt-1">
                                  <div className="relative w-full aspect-2/1 overflow-hidden">
                                    {!imageLoadedForDeck && (
                                      <Skeleton className="absolute inset-0 rounded-lg" />
                                    )}
                                    <Image
                                      radius="none"
                                      shadow="none"
                                      alt={
                                        opt.latest_deck_code?.code || "デッキコードなし"
                                      }
                                      src={
                                        opt.latest_deck_code?.code
                                          ? `https://xx8nnpgt.user.webaccel.jp/images/decks/${opt.latest_deck_code.code}.jpg`
                                          : "https://www.pokemon-card.com/deck/deckView.php/deckID/"
                                      }
                                      className="w-full h-full object-cover"
                                      onLoad={() => setImageLoadedForDeck(true)}
                                    />
                                  </div>
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="pl-1 flex items-center gap-2 text-sm min-w-0">
                            <DeckSprites
                              sprites={opt.pokemon_sprites}
                              size={28}
                            />
                            <span className="truncate">{opt.name}</span>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">バージョン</label>
                  <div>
                    <Select
                      theme={reactSelectTheme}
                      minMenuHeight={270}
                      maxMenuHeight={270}
                      placeholder={
                        <div className="flex items-center gap-2">
                          <span className="text-sm">バージョン</span>
                        </div>
                      }
                      isLoading={isLoadingDeckCodeOptions}
                      isDisabled={isLoadingDeckCodeOptions || !selectedDeckOption}
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
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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
                                  {option.label}
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
                              {option.label}
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
                {/* セレクターを閉じたときのフォーカス受け皿（キーボードを閉じるために使用） */}
                <div
                  ref={focusSinkRef}
                  tabIndex={-1}
                  className="sr-only"
                  aria-hidden="true"
                />
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
