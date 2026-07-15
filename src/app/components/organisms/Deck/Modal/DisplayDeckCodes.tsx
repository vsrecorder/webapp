import { useRef } from "react";

import { SetStateAction, Dispatch } from "react";

import { useCallback, useEffect, useState } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { Skeleton } from "@heroui/react";
//import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";
import { Spinner } from "@heroui/spinner";

import { Alert } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Button } from "@heroui/react";
import { Textarea } from "@heroui/react";

import { addToast, closeToast } from "@heroui/react";

import {
  LuTrash2,
  LuLayers,
  LuFilePen,
  LuBook,
  LuBookPlus,
  LuClock,
  LuSquarePen,
  LuPlus,
} from "react-icons/lu";

import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";
import FetchError from "@app/components/molecules/FetchError";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType, DeckCodeUpdateRequestType } from "@app/types/deck_code";

async function fetchDeckCodesByDeckId(deck_id: string) {
  try {
    const res = await fetch(`/api/decks/${deck_id}/deckcodes`, {
      cache: "no-store",
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
  } catch (error) {
    throw error;
  }
}

type Props = {
  deck: DeckGetByIdResponseType | null;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  onOpenCreateDeckCode?: () => void;
};

export default function DisplayDeckCodesModal({
  deck,
  deckcode,
  setDeckCode,
  isOpen,
  onOpenChange,
  onClose,
  onOpenCreateDeckCode,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayDeckCode, setDisplayDeckCode] = useState<DeckCodeType | null>(null);
  const [displayDeckCodes, setDisplayDeckCodes] = useState<DeckCodeType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const {
    isOpen: isOpenForDeleteDeckCodeModal,
    onOpen: onOpenForDeleteDeckCodeModal,
    onOpenChange: onOpenChangeForDeleteDeckCodeModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForEditMemoModal,
    onOpen: onOpenForEditMemoModal,
    onOpenChange: onOpenChangeForEditMemoModal,
  } = useDisclosure();

  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  // メモ編集用。編集対象のバージョンと入力中のメモ本文を保持する
  const [editMemoDeckCode, setEditMemoDeckCode] = useState<DeckCodeType | null>(null);
  const [memoInput, setMemoInput] = useState<string>("");
  const [isMemoSaving, setIsMemoSaving] = useState<boolean>(false);

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

  // バージョン一覧だけを取得（失敗時のリロードから再利用）
  const loadDeckCodes = useCallback(async () => {
    if (!isOpen || !deck || !deck.id || !deck.latest_deck_code.id) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCodesByDeckId(deck.id);
      setDisplayDeckCodes(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isOpen, deck]);

  useEffect(() => {
    loadDeckCodes();
  }, [loadDeckCodes]);

  // 新しいバージョンが作成されたら、一覧の先頭に動的に追加する
  useEffect(() => {
    if (!isOpen || !deckcode?.id) return;

    setDisplayDeckCodes((prev) => {
      // まだ未取得（0件）の場合はそのまま先頭に
      if (!prev) return [deckcode];

      // すでに一覧に存在する場合は何もしない（重複防止）
      if (prev.some((dc) => dc.id === deckcode.id)) return prev;

      return [deckcode, ...prev];
    });
  }, [isOpen, deckcode]);

  if (!deck) {
    return;
  }

  const deleteDeckCode = async (onClose: () => void) => {
    setIsDisabled(true);

    const toastId = addToast({
      title: "削除中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const res = await fetch(`/api/deckcodes/${displayDeckCode?.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 409) {
        throw new Error(
          "このバージョンのデッキを利用した記録が存在するため削除できません",
        );
      }

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "削除完了",
        description: "削除しました",
        color: "success",
        timeout: 3000,
      });

      // 削除したバージョンを一覧から除外
      setDisplayDeckCodes((prev) => {
        if (!prev) return prev;

        const filtered = prev.filter((dc) => dc.id !== displayDeckCode?.id);

        // deckcodeも更新
        setDeckCode((prevDeckCode) => {
          if (!prevDeckCode) return prevDeckCode;

          // 削除対象が最新のものだった場合、次に新しいバージョンに変える
          if (prevDeckCode.id === displayDeckCode?.id) {
            if (filtered.length > 0) {
              return filtered[0];
            }

            return null;
          }

          return prevDeckCode;
        });

        return filtered;
      });

      // deckcodeをリセット
      setDisplayDeckCode(null);

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "削除失敗",
        description: (
          <>
            削除に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  // メモ編集モーダルを開く。対象バージョンと現在のメモを入力欄へ反映する
  const openEditMemo = (target: DeckCodeType) => {
    setEditMemoDeckCode(target);
    setMemoInput(target.memo ?? "");
    onOpenForEditMemoModal();
  };

  const updateMemo = async (onClose: () => void) => {
    if (!editMemoDeckCode) return;

    setIsMemoSaving(true);

    const toastId = addToast({
      title: "メモを保存中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const data: DeckCodeUpdateRequestType = {
        private_code_flg: editMemoDeckCode.private_code_flg,
        memo: memoInput,
      };

      const res = await fetch(`/api/deckcodes/${editMemoDeckCode.id}`, {
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

      const updated: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "メモを保存しました",
        color: "success",
        timeout: 3000,
      });

      // 一覧の該当バージョンを更新
      setDisplayDeckCodes((prev) =>
        prev
          ? prev.map((dc) => (dc.id === updated.id ? { ...dc, memo: updated.memo } : dc))
          : prev,
      );

      // 表示中のデッキコードが編集対象なら同期する
      setDeckCode((prev) =>
        prev && prev.id === updated.id ? { ...prev, memo: updated.memo } : prev,
      );

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "メモの保存に失敗",
        description: (
          <>
            メモの保存に失敗しました
            <br />
            {errorMessage}
          </>
        ),
        color: "danger",
        timeout: 5000,
      });

      onClose();
    }
  };

  const isArchived = deck ? new Date(deck.archived_at).getFullYear() !== 1 : false;

  // バージョンが1件のときは、タイムラインの続きとして次バージョン作成を促す（アーカイブ済みは非表示）
  const showNextVersionPrompt =
    displayDeckCodes?.length === 1 && !!onOpenCreateDeckCode && !isArchived;

  return (
    <>
      <Modal
        isOpen={isOpenForDeleteDeckCodeModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        isDismissable={!isDisabled}
        onOpenChange={onOpenChangeForDeleteDeckCodeModal}
        onClose={() => {
          setIsSelected(false);
          setIsDisabled(false);
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex items-center gap-2">
                このバージョンを削除しますか？
              </ModalHeader>
              <ModalBody className="px-2 py-1">
                <Alert color="danger">
                  <Checkbox
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
                    deleteDeckCode(onClose);
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

      <Modal
        isOpen={isOpenForEditMemoModal}
        size={"sm"}
        placement="center"
        // 保存中(isMemoSaving)はESC・onOpenChange経由のクローズを無効化する
        isKeyboardDismissDisabled={isMemoSaving}
        hideCloseButton={isMemoSaving}
        isDismissable={false}
        onOpenChange={() => {
          if (isMemoSaving) return;
          onOpenChangeForEditMemoModal();
        }}
        onClose={() => {
          setIsMemoSaving(false);
          setEditMemoDeckCode(null);
          setMemoInput("");
        }}
        classNames={{
          base: "sm:max-w-full",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex flex-col gap-1">
                {editMemoDeckCode?.memo ? "メモを編集" : "メモを追加"}
              </ModalHeader>
              <ModalBody className="px-3 py-1">
                <Textarea
                  size="md"
                  isDisabled={isMemoSaving}
                  label="メモ"
                  placeholder="このバージョンのメモを残そう"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isMemoSaving}
                  onPress={() => {
                    onClose();
                  }}
                  className="font-bold"
                >
                  閉じる
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={isMemoSaving}
                  onPress={() => {
                    updateMemo(onClose);
                  }}
                  className="font-bold"
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isOpen}
        size="md"
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        onOpenChange={onOpenChange}
        onClose={() => {}}
        className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                <div>バージョン一覧</div>
              </ModalHeader>
              <ModalBody className="px-2 py-3 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                <>
                  {loading ? (
                    <Spinner size="lg" className="pt-32" />
                  ) : !error ? (
                    <ol className="relative">
                      <div className="flex flex-col">
                        {(!displayDeckCodes || displayDeckCodes.length === 0) &&
                          (isArchived ? (
                            <div className="flex flex-col items-center gap-3 py-10 px-3 text-center">
                              <LuLayers className="text-default-300 text-4xl" />
                              <div className="text-default-400 text-sm">
                                バージョンが記録されていません
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-5 py-8 px-3">
                              <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                                <LuLayers className="text-white text-4xl" />
                              </div>

                              <div className="text-center">
                                <div className="font-bold text-lg">
                                  デッキのバージョンを作成しよう
                                </div>
                                <div className="text-default-400 text-sm mt-1">
                                  デッキの変遷を残して、強化の歴史を振り返ろう
                                </div>
                              </div>

                              <div className="w-full flex flex-col gap-2.5">
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuLayers className="text-blue-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">
                                      変更履歴を追跡
                                    </div>
                                    <div className="text-tiny text-default-400">
                                      どのカードを入れ替えたか一目でわかる
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuFilePen className="text-green-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">差分を比較</div>
                                    <div className="text-tiny text-default-400">
                                      バージョン間のカード増減をひと目で確認
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-default-100 rounded-xl px-4 py-3">
                                  <LuBook className="text-purple-500 text-xl shrink-0" />
                                  <div>
                                    <div className="font-bold text-sm">
                                      過去のデッキコードを保存
                                    </div>
                                    <div className="text-tiny text-default-400">
                                      バージョン変更前後の構成をいつでも見返せる
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {onOpenCreateDeckCode && (
                                <Button
                                  color="primary"
                                  variant="solid"
                                  size="lg"
                                  startContent={<LuBookPlus className="text-xl" />}
                                  onPress={() => {
                                    onOpenCreateDeckCode();
                                  }}
                                  className="font-bold w-full"
                                >
                                  最初のバージョンを作成する
                                </Button>
                              )}
                            </div>
                          ))}

                        {displayDeckCodes?.map(
                          (deckcode: DeckCodeType, index: number) => {
                            const date = new Date(deckcode.created_at).toLocaleString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              },
                            );

                            const isLastCodeItem =
                              index === displayDeckCodes.length - 1;
                            const lineVisible = !isLastCodeItem || showNextVersionPrompt;
                            const lineDashed = isLastCodeItem && showNextVersionPrompt;

                            return (
                              <li key={deckcode.id} className="flex gap-2.5">
                                {/* タイムラインのガター。ドットと時刻ラベルを同じ高さ(h-4)の
                                    ボックスで揃えることで水平方向に一列に並べ、リング
                                    (bg-content1)でラインとの重なりを切り抜いて見せる */}
                                <div className="flex flex-col items-center w-2.5 shrink-0">
                                  <div className="flex items-center justify-center h-4 shrink-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-content1 shrink-0" />
                                  </div>
                                  {lineVisible && (
                                    <span
                                      className={`w-0 flex-1 mt-1.5 border-l border-primary/30 ${
                                        lineDashed ? "border-dashed" : ""
                                      }`}
                                    />
                                  )}
                                </div>
                                <div
                                  className={`min-w-0 flex-1 ${
                                    lineVisible ? "pb-5" : "pb-1"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 h-4">
                                    <LuClock className="text-[11px] text-default-300 shrink-0" />
                                    <span className="text-tiny text-default-500">
                                      作成日時：
                                      {date}
                                    </span>
                                  </div>

                                  <div className="mt-1.5">
                                    {deckcode.code ? (
                                      <div className="rounded-xl bg-default-100 p-3 flex flex-col gap-2.5">
                                        {/* 両端配置 */}
                                        <div className="flex items-center justify-between gap-2">
                                          {/* 左側 */}
                                          <div className="flex items-center gap-2">
                                            <div className="font-bold text-small">
                                              バージョン{displayDeckCodes.length - index}
                                            </div>
                                            {index === 0 && (
                                              <span className="text-tiny font-bold text-white bg-primary rounded-full px-2 py-0.5">
                                                最新
                                              </span>
                                            )}
                                            {displayDeckCodes.length > 1 &&
                                              index === displayDeckCodes.length - 1 && (
                                                <span className="text-tiny font-bold text-default-500 bg-content1 rounded-full px-2 py-0.5">
                                                  初回
                                                </span>
                                              )}
                                          </div>

                                          {/* 右側 */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDisplayDeckCode(deckcode);
                                              onOpenForDeleteDeckCodeModal();
                                            }}
                                            className="flex items-center justify-center w-7 h-7 rounded-full bg-content1 text-red-500 active:opacity-70 shrink-0"
                                          >
                                            <LuTrash2 className="text-sm" />
                                          </button>
                                        </div>

                                        {/* デッキコード表示は他画面（DeckCodeCard）と統一。
                                            バージョン履歴のカードは bg-default-100 のため、
                                            背景のみ bg-content1 にしてコントラストを確保する。 */}
                                        <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-content1 px-3 py-2">
                                          <span className="shrink-0 text-tiny text-default-500">
                                            デッキコード
                                          </span>
                                          <Snippet
                                            size="sm"
                                            radius="none"
                                            timeout={3000}
                                            disableTooltip={true}
                                            hideSymbol={true}
                                            classNames={{
                                              base: "min-w-0 bg-transparent p-0",
                                              pre: "truncate",
                                            }}
                                          >
                                            {deckcode?.code ? deckcode.code : "なし"}
                                          </Snippet>
                                        </div>

                                        <div className="relative w-full aspect-2/1">
                                          {!imageLoaded && (
                                            <Skeleton className="absolute inset-0 rounded-lg" />
                                          )}
                                          <Image
                                            radius="sm"
                                            shadow="none"
                                            alt={deckcode.code}
                                            src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`}
                                            className=""
                                            onLoad={() => setImageLoaded(true)}
                                          />
                                        </div>

                                        {(index !== displayDeckCodes.length - 1 ||
                                          deckcode.memo ||
                                          !isArchived) && (
                                          <div className="flex flex-col gap-2 pt-2 border-t border-default-200">
                                            {index !== displayDeckCodes.length - 1 && (
                                              <DeckCardDiff
                                                current_deckcode={displayDeckCodes[index]}
                                                previous_deckcode={
                                                  displayDeckCodes[index + 1]
                                                }
                                              />
                                            )}
                                            {deckcode.memo ? (
                                              <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="font-bold text-tiny">
                                                    メモ
                                                  </div>
                                                  {!isArchived && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        openEditMemo(deckcode)
                                                      }
                                                      className="flex items-center gap-1 text-tiny text-default-500 active:opacity-70"
                                                    >
                                                      <LuSquarePen className="text-xs" />
                                                      編集
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="text-tiny text-default-600 whitespace-pre-wrap wrap-break-word">
                                                  {deckcode.memo}
                                                </div>
                                              </div>
                                            ) : (
                                              !isArchived && (
                                                <button
                                                  type="button"
                                                  onClick={() => openEditMemo(deckcode)}
                                                  className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-default-300 py-1.5 text-tiny text-default-500 active:opacity-70"
                                                >
                                                  <LuPlus className="text-xs" />
                                                  メモを追加
                                                </button>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <></>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          },
                        )}

                        {showNextVersionPrompt && (
                          <li className="flex gap-2.5">
                            <div className="flex flex-col items-center w-2.5 shrink-0">
                              {/* 未作成を示す中空ノード */}
                              <div className="flex items-center justify-center h-4 shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-content1 shrink-0" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 pb-1">
                              <div className="flex items-center gap-1 h-4">
                                <span className="text-tiny text-default-400">
                                  次のバージョン
                                </span>
                              </div>

                              <div className="mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenCreateDeckCode?.();
                                  }}
                                  className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-5 transition-colors hover:border-primary/60 hover:bg-primary/10 active:opacity-80"
                                >
                                  <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center transition-colors group-hover:bg-primary-200">
                                    <LuBookPlus className="text-2xl text-primary" />
                                  </div>
                                  <div className="font-bold text-sm text-primary">
                                    次のバージョンを作成
                                  </div>
                                  <div className="text-tiny text-default-400 text-center">
                                    デッキを更新したら記録して、
                                    <br />
                                    変化を時系列で振り返ろう
                                  </div>
                                </button>
                              </div>
                            </div>
                          </li>
                        )}
                      </div>
                    </ol>
                  ) : (
                    <FetchError onRetry={loadDeckCodes} compact />
                  )}
                </>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
