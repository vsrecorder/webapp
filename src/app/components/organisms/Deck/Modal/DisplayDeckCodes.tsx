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

//import { Chip } from "@heroui/react";
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
  LuArrowUpToLine,
} from "react-icons/lu";

import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import FetchError from "@app/components/molecules/FetchError";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";

import { DeckGetByIdResponseType } from "@app/types/deck";
import {
  DeckCodeType,
  DeckCodeCreateRequestType,
  DeckCodeUpdateRequestType,
} from "@app/types/deck_code";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";
import { closingPassthroughClassNames } from "@app/utils/modal";

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
  // base を渡すとそのバージョンを基準に新バージョンを作成する（省略時は最新が基準）
  onOpenCreateDeckCode?: (base?: DeckCodeType) => void;
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

  const {
    isOpen: isOpenForMakeLatestModal,
    onOpen: onOpenForMakeLatestModal,
    onOpenChange: onOpenChangeForMakeLatestModal,
  } = useDisclosure();

  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  // 「このバージョンを最新にする」対象のバージョンと処理中フラグ
  const [makeLatestDeckCode, setMakeLatestDeckCode] = useState<DeckCodeType | null>(null);
  const [isMakingLatest, setIsMakingLatest] = useState<boolean>(false);

  // メモ編集用。編集対象のバージョンと入力中のメモ本文を保持する
  const [editMemoDeckCode, setEditMemoDeckCode] = useState<DeckCodeType | null>(null);
  const [memoInput, setMemoInput] = useState<string>("");
  const [isMemoSaving, setIsMemoSaving] = useState<boolean>(false);

  const attachHeader = useModalDragToClose(onClose);

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

  // 「このバージョンを最新にする」確認モーダルを開く
  const openMakeLatest = (target: DeckCodeType) => {
    setMakeLatestDeckCode(target);
    onOpenForMakeLatestModal();
  };

  // 選択したバージョンと同じデッキコードで新しいバージョンを作成し、最新にする。
  // 新規作成のため、元のバージョンはそのまま履歴に残る。
  const makeLatest = async (onClose: () => void) => {
    if (!deck || !makeLatestDeckCode) return;

    setIsMakingLatest(true);

    const toastId = addToast({
      title: "最新のバージョンにしています",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const data: DeckCodeCreateRequestType = {
        deck_id: deck.id,
        code: makeLatestDeckCode.code,
        private_code_flg: makeLatestDeckCode.private_code_flg,
        memo: makeLatestDeckCode.memo,
      };

      const res = await fetch(`/api/deckcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
      }

      const ret: DeckCodeType = await res.json();

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "最新のバージョンにしました",
        description: "同じデッキコードで新しいバージョンを作成しました",
        color: "success",
        timeout: 3000,
      });

      // 表示中のデッキコードを新バージョンに更新する。
      // deckcode の変化を監視する useEffect が一覧の先頭へ追加する。
      setDeckCode(ret);

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "最新のバージョンにできませんでした",
        description: (
          <>
            最新のバージョンにできませんでした
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

  // バージョンが2件以上あるときは、各バージョンから新バージョンを作成できるようにする
  // （そのバージョンを基準にした差分・デッキコードで作成する）。アーカイブ済みは非表示。
  const showPerVersionCreate =
    (displayDeckCodes?.length ?? 0) >= 2 && !!onOpenCreateDeckCode && !isArchived;

  // バージョンが2件以上あるとき、過去バージョンを「最新にする」（同じデッキコードで
  // 新バージョンを作成する）導線を出す。最新バージョン自身とアーカイブ済みは非表示。
  const showMakeLatest = (displayDeckCodes?.length ?? 0) >= 2 && !isArchived;

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
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
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
        isOpen={isOpenForMakeLatestModal}
        size={"sm"}
        placement="center"
        hideCloseButton={isMakingLatest}
        isDismissable={!isMakingLatest}
        isKeyboardDismissDisabled={isMakingLatest}
        onOpenChange={() => {
          if (isMakingLatest) return;
          onOpenChangeForMakeLatestModal();
        }}
        onClose={() => {
          setIsMakingLatest(false);
          setMakeLatestDeckCode(null);
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex items-center gap-2">
                このバージョンを最新にしますか？
              </ModalHeader>
              <ModalBody className="px-3 py-1">
                <div className="flex flex-col gap-2">
                  <div className="text-tiny text-default-500">
                    同じデッキコードで新しいバージョンを作成し、最新のバージョンにします。
                    元のバージョンはそのまま履歴に残ります。
                  </div>
                  {makeLatestDeckCode?.code && (
                    <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-default-100 px-3 py-2">
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
                        {makeLatestDeckCode.code}
                      </Snippet>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="solid"
                  isDisabled={isMakingLatest}
                  onPress={() => {
                    onClose();
                  }}
                  className="font-bold"
                >
                  戻る
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  isDisabled={isMakingLatest}
                  startContent={<LuArrowUpToLine className="text-base" />}
                  onPress={() => {
                    makeLatest(onClose);
                  }}
                  className="font-bold"
                >
                  最新にする
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
        // min() でシート高の上限を可視領域(--visual-viewport-height)にし、
        // iOS でキーボード表示中に入力欄がキーボードの裏に隠れるのを防ぐ。
        // mx-0 はHeroUI既定の左右マージン(mx-1)を打ち消し、シートを画面幅いっぱいに広げる
        // （バージョンのカードを少しでも広く見せるため。sm以上のsm:mx-6はそのまま）
        className="h-[min(calc(100dvh-104px),var(--visual-viewport-height,100dvh))] max-h-[min(calc(100dvh-104px),var(--visual-viewport-height,100dvh))] mt-26 my-0 mx-0 rounded-b-none"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-xl",
          ...closingPassthroughClassNames(isOpen),
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                ref={attachHeader}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                <div>バージョン一覧</div>
              </ModalHeader>
              {/* px-1: バージョンのカードを広く見せつつ、画面端に貼り付かない余白を残す。
                  ドットのリング(4px)がちょうど画面端に収まる幅でもある */}
              <ModalBody className="px-1 py-3 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
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

                            const isLastCodeItem = index === displayDeckCodes.length - 1;
                            const lineVisible = !isLastCodeItem || showNextVersionPrompt;
                            const lineDashed = isLastCodeItem && showNextVersionPrompt;

                            return (
                              // gapはドットのリング(4px)とカードが接しない範囲で詰め、
                              // カードを少しでも広く見せる
                              <li key={deckcode.id} className="flex gap-2">
                                {/* タイムラインのガター。ドットと時刻ラベルを同じ高さ(h-4)の
                                    ボックスで揃えることで水平方向に一列に並べ、リング
                                    (bg-content1)でラインとの重なりを切り抜いて見せる */}
                                <div className="flex flex-col items-center w-2.5 shrink-0">
                                  <div className="flex items-center justify-center h-4 shrink-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-content1 shrink-0" />
                                  </div>
                                  {lineVisible && (
                                    <span
                                      className={`w-0 flex-1 mt-1.5 border-l-2 border-primary/30 ${
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

                                  {/* -ml-2 でカードだけをガターのgap分(8px)だけ左へ張り出す。
                                      ドット・縦線・作成日時ラベルの位置はそのままにして、
                                      カードの左端をドットの右端に接するところまで寄せる */}
                                  <div className="mt-1.5 -ml-2">
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

                                        <ZoomableDeckImage code={deckcode.code} />

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

                                        {/* カードリスト。バージョンごとに畳んでおき、
                                            開いたバージョンの内訳だけを取得する */}
                                        <CardListAccordion
                                          code={deckcode.code}
                                          background="content1"
                                        />

                                        {(index !== displayDeckCodes.length - 1 ||
                                          deckcode.memo ||
                                          !isArchived) && (
                                          <div className="flex flex-col gap-2 pt-2 border-t border-default-200">
                                            {index !== displayDeckCodes.length - 1 && (
                                              <DeckCardDiff
                                                current_code={
                                                  displayDeckCodes[index]?.code ?? ""
                                                }
                                                previous_code={
                                                  displayDeckCodes[index + 1]?.code ?? ""
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

                                        {/* このバージョンを最新にする導線（同じデッキコードで
                                            新バージョンを作成する）。すでに最新(index===0)には出さない */}
                                        {showMakeLatest && index !== 0 && (
                                          <button
                                            type="button"
                                            onClick={() => openMakeLatest(deckcode)}
                                            className="flex items-center justify-center gap-1.5 rounded-lg bg-content1 py-2 text-tiny font-bold text-primary active:opacity-70"
                                          >
                                            <LuArrowUpToLine className="text-sm" />
                                            このバージョンを最新にする
                                          </button>
                                        )}

                                        {/* このバージョンを基準に新バージョンを作成する導線。
                                            差分・デッキコードはこのバージョンを基準にする */}
                                        {showPerVersionCreate && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onOpenCreateDeckCode?.(deckcode)
                                            }
                                            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-2 text-tiny font-bold text-primary active:opacity-70"
                                          >
                                            <LuBookPlus className="text-sm" />
                                            このバージョンから新しく作成
                                          </button>
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
                          // 各バージョンのliと同じgapにして左端を揃える
                          <li className="flex gap-2">
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

                              {/* 各バージョンのカードと左端を揃える */}
                              <div className="mt-1.5 -ml-2">
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
                    // ModalBodyの左右余白は狭いため、エラーカードだけ余白を足す
                    <div className="px-2">
                      <FetchError onRetry={loadDeckCodes} compact />
                    </div>
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
