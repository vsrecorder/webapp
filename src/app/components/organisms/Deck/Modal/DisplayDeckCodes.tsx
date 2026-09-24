import { SetStateAction, Dispatch } from "react";

import { useEffect, useRef, useState } from "react";

import { mutate } from "swr";

import { useSession } from "next-auth/react";

import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

//import { Chip } from "@heroui/react";
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
  LuTrophy,
} from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import DeckCodePostPublishRow from "@app/components/organisms/DeckCodePost/DeckCodePostPublishRow";
import FetchError from "@app/components/molecules/FetchError";
import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import TagChips from "@app/components/molecules/TagChips";
import TagSelector from "@app/components/organisms/Tag/TagSelector";
import {
  DeckVersionRecordStrip,
  DeckVersionWinRateOverview,
  deckVersionElementId,
} from "@app/components/organisms/Deck/DeckVersionStats";

import { DeckGetByIdResponseType } from "@app/types/deck";
import {
  DeckCodeType,
  DeckCodeUpdateRequestType,
} from "@app/types/deck_code";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { useSeededResource } from "@app/hooks/useSeededResource";
import { useRevalidateDeckCodes } from "@app/hooks/useDeckCodes";
import { deckActivePostsKey } from "@app/hooks/useDeckActivePosts";
import { useModalEntered } from "@app/hooks/useModalEntered";
import { useDeckCodeUsage } from "@app/hooks/useDeckCodeUsage";
import { pickBestVersionId } from "@app/utils/deckVersionStats";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";
import { closingPassthroughClassNames } from "@app/utils/modal";
import { formatJSTDateTimeWithWeekday, isZeroDate } from "@app/utils/date";

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
  // 追加・削除のあとにバージョン件数(ShowDeckModal の「◯件」など)を取り直すため。
  // この一覧は SWR ではなく useSeededResource で持っているので、件数側とは別のキャッシュになる
  const revalidateDeckCodes = useRevalidateDeckCodes();

  const [displayDeckCode, setDisplayDeckCode] = useState<DeckCodeType | null>(null);
  // バージョン一覧。開いている間だけ取り(閉じている間は鍵なし)、失敗時は retry で取り直す。
  // 作成・削除の結果は setData で一覧へ反映する
  const {
    data: displayDeckCodes,
    setData: setDisplayDeckCodes,
    loading,
    error,
    retry: loadDeckCodes,
  } = useSeededResource(
    isOpen && deck?.id && deck.latest_deck_code?.id ? deck.id : null,
    fetchDeckCodesByDeckId,
  );

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

  // バージョン編集用。編集対象のバージョンと、入力中のメモ本文・付与タグを保持する
  const [editMemoDeckCode, setEditMemoDeckCode] = useState<DeckCodeType | null>(null);
  const [memoInput, setMemoInput] = useState<string>("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [isMemoSaving, setIsMemoSaving] = useState<boolean>(false);
  // タグ管理中は「閉じる」「保存」やモーダルのクローズを無効化する
  const [isTagManaging, setIsTagManaging] = useState<boolean>(false);

  // バージョンごとの戦績。開いている間、自分のデッキのときだけ取る(成績は本人にしか見せない)
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { stat: versionUsageStat } = useDeckCodeUsage(
    isOpen && deck && userId && deck.user_id === userId ? userId : null,
    deck?.id,
  );

  const attachHeader = useModalDragToClose(onClose);

  // 入場アニメーションが着地するまでバージョン一覧の実体化を遅らせる
  // (着地前に大きなコミットが走るとシートの動きが止まるため)。
  const entered = useModalEntered(isOpen);

  // 一覧のスクロールコンテナ（ModalBody）。新バージョン追加時に最上部へ戻すために使う
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // 一覧の先頭に新バージョンを差し込んだ回数。進むたびに描画後、最上部へ戻す
  const [scrollToTopRequest, setScrollToTopRequest] = useState(0);

  // 新しいバージョンが作成されたら、一覧の先頭に動的に追加する。
  // effect で足すと古い一覧での描画が一度挟まるので、前回の deckcode を控えておき描画中に足す
  const [seenDeckcode, setSeenDeckcode] = useState(deckcode);
  if (seenDeckcode !== deckcode) {
    setSeenDeckcode(deckcode);

    // すでに一覧に存在する場合は何もしない（重複防止。削除で表示中のバージョンが
    // 繰り上がったときに、下のスクロール処理を誤って走らせないためでもある）
    if (isOpen && deckcode?.id && !displayDeckCodes?.some((dc) => dc.id === deckcode.id)) {
      // まだ未取得（0件）の場合はそのまま先頭に
      setDisplayDeckCodes((prev) => (prev ? [deckcode, ...prev] : [deckcode]));

      // 追加した新バージョンは一覧の先頭に入るため、描画後に最上部へ戻す。
      // 「このバージョンから新しく作成」は一覧の途中から呼ばれるので、
      // そのままだと作成した最新バージョンが画面外に残ってしまう
      setScrollToTopRequest((n) => n + 1);
    }
  }

  // 先頭に差し込んだ新バージョンが描画されてから最上部へスクロールする。
  // 先頭への挿入直後はスクロールアンカリングで位置が押し下げられるため、
  // 描画が反映されたこのタイミングで戻す
  useEffect(() => {
    if (scrollToTopRequest === 0) return;

    bodyRef.current?.scrollTo({ top: 0 });
  }, [scrollToTopRequest]);

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

      // 削除したバージョンを一覧から除外する。
      // 親の setDeckCode は、この更新関数の中ではなく外で呼ぶ
      // (別コンポーネントのレンダー中に親を更新すると React の警告対象になり、
      //  StrictMode では更新関数が二度走る)。
      const filtered = (displayDeckCodes ?? []).filter(
        (dc) => dc.id !== displayDeckCode?.id,
      );

      setDisplayDeckCodes(filtered);

      // 表示中(親が持つ deckcode)が削除対象だったら、次に新しいバージョンへ差し替える
      if (deckcode?.id === displayDeckCode?.id) {
        setDeckCode(filtered.length > 0 ? filtered[0] : null);
      }

      // 件数を出している側は SWR キャッシュを見ているので、ここで取り直す。
      // 表示中でないバージョンを消したときは deckcode の ID が変わらず、
      // useDeckCodes 側の取り直しが働かないため、この呼び出しが必要になる
      revalidateDeckCodes(deck?.id);

      // サーバはバージョンの削除と同時に、そのバージョンの投稿(みんなの公開デッキ)も
      // 取り下げる(DeckCode.Delete の UnpublishByDeckCodeId)。公開中の数を出している
      // 側はそれを知らないので、ここで取り直す
      if (deck?.id) {
        mutate(deckActivePostsKey(deck.id));
      }

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

  // バージョン編集モーダルを開く。対象バージョンの現在のメモ・付与タグを入力欄へ反映する
  const openEditMemo = (target: DeckCodeType) => {
    setEditMemoDeckCode(target);
    setMemoInput(target.memo ?? "");
    setEditTagIds((target.tags ?? []).map((tag) => tag.id));
    onOpenForEditMemoModal();
  };

  const updateMemo = async (onClose: () => void) => {
    if (!editMemoDeckCode) return;

    setIsMemoSaving(true);

    const toastId = addToast({
      title: "保存中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      const data: DeckCodeUpdateRequestType = {
        private_code_flg: editMemoDeckCode.private_code_flg,
        memo: memoInput,
        // メモと付与タグをまとめて更新する。
        tag_ids: editTagIds,
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
        title: "保存しました",
        color: "success",
        timeout: 3000,
      });

      // 一覧の該当バージョンのメモ・タグを更新
      setDisplayDeckCodes((prev) =>
        prev
          ? prev.map((dc) =>
              dc.id === updated.id
                ? { ...dc, memo: updated.memo, tags: updated.tags }
                : dc,
            )
          : prev,
      );

      // 表示中のデッキコードが編集対象なら同期する
      setDeckCode((prev) =>
        prev && prev.id === updated.id
          ? { ...prev, memo: updated.memo, tags: updated.tags }
          : prev,
      );

      // デッキ詳細のバージョン一覧は SWR キャッシュのメモ・タグを出しているので取り直す。
      // 編集では deckcode の ID が変わらず、useDeckCodes 側の取り直しは働かない
      revalidateDeckCodes(deck?.id);

      onClose();
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "不明なエラーが発生しました";

      if (toastId) {
        closeToast(toastId);
      }

      addToast({
        title: "保存に失敗",
        description: (
          <>
            保存に失敗しました
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

  const isArchived = deck ? !isZeroDate(deck.archived_at) : false;

  // バージョンが1件のときは、タイムラインの続きとして次バージョン作成を促す（アーカイブ済みは非表示）
  const showNextVersionPrompt =
    displayDeckCodes?.length === 1 && !!onOpenCreateDeckCode && !isArchived;

  // バージョンが2件以上あるときは、各バージョンから新バージョンを作成できるようにする
  // （そのバージョンを基準にした差分・デッキコードで作成する）。アーカイブ済みは非表示。
  const showPerVersionCreate =
    (displayDeckCodes?.length ?? 0) >= 2 && !!onOpenCreateDeckCode && !isArchived;

  // 勝率を出せる版が2つ以上あるときだけ、最も勝てていた版に印を付ける
  const bestVersionId =
    versionUsageStat && displayDeckCodes
      ? pickBestVersionId(
          versionUsageStat.deck_codes,
          displayDeckCodes.map((dc) => dc.id),
        )
      : null;
  const versionUsageById = new Map(
    (versionUsageStat?.deck_codes ?? []).map((u) => [u.deck_code_id, u]),
  );
  // 推移は比べる相手があって、どこかの版で対戦しているときだけ出す
  const showWinRateOverview =
    !!versionUsageStat &&
    (displayDeckCodes?.length ?? 0) >= 2 &&
    versionUsageStat.deck_codes.some((u) => u.count > 0);

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
                    name="delete-deck-code-confirm"
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
        // 保存中(isMemoSaving)はESC・onOpenChange経由のクローズを無効化する。
        // タグ管理中(isTagManaging)は塞がない: 管理モードは「×で削除できる」表示に変わるだけで、
        // 削除は確認を挟んで即時反映されるため、閉じても失われる編集が無い
        // (閉じたときに onClose が管理モードも解除する)
        isKeyboardDismissDisabled={isMemoSaving}
        hideCloseButton={isMemoSaving}
        isDismissable={false}
        onOpenChange={() => {
          if (isMemoSaving) return;
          onOpenChangeForEditMemoModal();
        }}
        onClose={() => {
          setIsMemoSaving(false);
          setIsTagManaging(false);
          setEditMemoDeckCode(null);
          setMemoInput("");
          setEditTagIds([]);
        }}
        classNames={{
          base: "sm:max-w-full",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-3 flex flex-col gap-1">
                メモ・タグを編集
              </ModalHeader>
              <ModalBody className="px-3 py-1 gap-3">
                <Textarea
                  size="md"
                  isDisabled={isMemoSaving}
                  label="メモ"
                  placeholder="このバージョンのメモを残そう"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                />

                {!isMemoSaving && (
                  <TagSelector
                    selectedTagIds={editTagIds}
                    onChange={setEditTagIds}
                    label="このバージョンのタグ"
                    onManageModeChange={setIsTagManaging}
                  />
                )}
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
                  isDisabled={isMemoSaving || isTagManaging}
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
              <ModalBody
                ref={bodyRef}
                className="px-1 py-3 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
              >
                <>
                  {loading || !entered ? (
                    <Spinner size="lg" className="pt-32" />
                  ) : !error ? (
                    <>
                      {showWinRateOverview && versionUsageStat && displayDeckCodes && (
                        <DeckVersionWinRateOverview
                          deckcodes={displayDeckCodes}
                          usageStat={versionUsageStat}
                          bestId={bestVersionId}
                        />
                      )}
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
                                  <LuLayers className="text-primary text-xl shrink-0" />
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
                            const date = formatJSTDateTimeWithWeekday(
                              deckcode.created_at,
                            );

                            const isLastCodeItem = index === displayDeckCodes.length - 1;
                            const lineVisible = !isLastCodeItem || showNextVersionPrompt;
                            const lineDashed = isLastCodeItem && showNextVersionPrompt;

                            return (
                              // gapはドットのリング(4px)とカードが接しない範囲で詰め、
                              // カードを少しでも広く見せる
                              // id は上の勝率の推移から、この版へスクロールするため
                              <li
                                key={deckcode.id}
                                id={deckVersionElementId(deckcode.id)}
                                className="flex gap-2 scroll-mt-3"
                              >
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
                                    <LuClock className="text-[0.6875rem] text-default-300 shrink-0" />
                                    <span className="text-tiny text-default-500">
                                      作成日時：
                                      {date}
                                    </span>
                                  </div>

                                  {/* -ml-1 でカードだけをガターのgap(8px)の半分だけ左へ張り出す。
                                      ドット・縦線・作成日時ラベルの位置はそのままにして、
                                      カードの左端をドットの少し右に寄せる。mr-1 は右端を
                                      上の「バージョンごとの勝率」パネルの右端に揃えるため */}
                                  <div className="mt-1.5 -ml-1 mr-1">
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
                                            {deckcode.id === bestVersionId && (
                                              <span className="flex items-center gap-0.5 text-tiny font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                                <LuTrophy className="text-[0.6875rem]" />
                                                最高勝率
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

                                        {versionUsageStat && (
                                          <DeckVersionRecordStrip
                                            usage={versionUsageById.get(deckcode.id)}
                                            isBest={deckcode.id === bestVersionId}
                                          />
                                        )}

                                        <ZoomableDeckImage code={deckcode.code} />

                                        {/* バージョン履歴のカードは bg-default-100 のため、
                                            背景のみ bg-content1 にしてコントラストを確保する。 */}
                                        <CopyableDeckCode
                                          code={deckcode?.code}
                                          background="content1"
                                        />

                                        {/* カードリスト。バージョンごとに畳んでおき、
                                            開いたバージョンの内訳だけを取得する */}
                                        <CardListAccordion
                                          code={deckcode.code}
                                          background="content1"
                                        />

                                        {/* みんなの公開デッキの公開スイッチ。バージョンごとに公開できる */}
                                        {deck && (
                                          <DeckCodePostPublishRow
                                            deckId={deck.id}
                                            deckCodeId={deckcode.id}
                                            background="content1"
                                            isArchived={isArchived}
                                            versionLabel={index === 0 ? "最新バージョン" : undefined}
                                          />
                                        )}

                                        {(index !== displayDeckCodes.length - 1 ||
                                          deckcode.memo ||
                                          (deckcode.tags &&
                                            deckcode.tags.length > 0) ||
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

                                            {/* タグ。各バージョンごとに表示し、編集で
                                                メモ・タグ編集モーダルを開く */}
                                            <div className="flex flex-col gap-1">
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="font-bold text-tiny">
                                                  タグ
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
                                              {deckcode.tags &&
                                              deckcode.tags.length > 0 ? (
                                                <TagChips tags={deckcode.tags} />
                                              ) : (
                                                <div className="text-tiny text-default-400">
                                                  タグなし
                                                </div>
                                              )}
                                            </div>
                                          </div>
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

                              {/* 各バージョンのカードと左右の端を揃える */}
                              <div className="mt-1.5 -ml-1 mr-1">
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
                    </>
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
