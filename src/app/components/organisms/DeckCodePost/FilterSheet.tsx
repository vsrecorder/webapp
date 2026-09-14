"use client";

import { ReactNode } from "react";

import { ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";

import { LuCheck } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";

/*
 * みんなの公開デッキの絞り込みシート(環境・ACE SPEC)の共通部分。
 *
 * どの条件を選ぶシートでも、開いたときの大きさ・見出し・候補の行の形を同じにするために
 * ここへまとめている。中身(候補の並び)は呼び出し側が FilterSheetRow で組む。
 */

/*
 * 候補一覧の高さ。候補の数(環境によって変わる)や読み込み状態でシートの大きさが変わらないよう固定し、
 * シートごとに大きさが違って見えないよう共通の値にしている。
 *
 * 基準は候補ちょうど7件ぶん = 1行 60px(画像 h-10 ＋ py-2 ＋ border-2)× 7 ＋ 行間 6px × 6。
 */
export const FILTER_SHEET_LIST_HEIGHT_PX = 7 * 60 + 6 * 6;

type SheetProps = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 記録情報・バージョン一覧と同じく、ヘッダー(または先頭までスクロールした本文)を
  // 下へドラッグして閉じるために使う
  onClose: () => void;
  // 見出し(「環境を選ぶ」「ACE SPEC で絞り込む」)
  title: string;
  // 解除できる絞り込みでだけ渡す。渡すと見出しの右に「絞り込みを解除」を出す
  onClear?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  // 候補が1件も無いときの文言。渡さなければ何も出さない
  emptyMessage?: ReactNode;
  isEmpty?: boolean;
  // 候補の行(FilterSheetRow)。onClose を受けて選択後にシートを閉じる
  children: (onClose: () => void) => ReactNode;
};

export default function FilterSheet({
  isOpen,
  onOpenChange,
  onClose: onCloseSheet,
  title,
  onClear,
  isLoading = false,
  hasError = false,
  emptyMessage,
  isEmpty = false,
  children,
}: SheetProps) {
  const attachHeader = useModalDragToClose(onCloseSheet);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={onCloseSheet}
      placement="bottom"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader ref={attachHeader} className="flex flex-col gap-1 cursor-grab touch-none">
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div className="flex items-center justify-between gap-2">
                <span>{title}</span>
                {onClear && (
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      onClose();
                    }}
                    className="shrink-0 rounded-full bg-default-100 px-3 py-1 text-tiny font-bold text-default-600 active:opacity-70"
                  >
                    絞り込みを解除
                  </button>
                )}
              </div>
            </ModalHeader>
            <ModalBody className="pb-6">
              {/* 高さを固定し、収まらない候補はこの中だけをスクロールして見る */}
              <div className="overflow-y-auto" style={{ height: FILTER_SHEET_LIST_HEIGHT_PX }}>
                {isLoading && (
                  <div className="flex h-full items-center justify-center">
                    <Spinner size="sm" />
                  </div>
                )}
                {hasError && (
                  <div className="flex h-full items-center justify-center text-sm text-danger">
                    読み込めませんでした
                  </div>
                )}
                {!isLoading && !hasError && isEmpty && emptyMessage && (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-default-400">
                    {emptyMessage}
                  </div>
                )}
                <ul className="flex flex-col gap-1.5">{children(onClose)}</ul>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

type RowProps = {
  // 先頭に置く画像(ACE SPEC のカード画像など)。無ければ出さない
  imageUrl?: string;
  title: string;
  // 補足(環境の期間など)
  subtitle?: string;
  // 右端の補足(投稿数・「現在」の印など)
  meta?: ReactNode;
  selected: boolean;
  onClick: () => void;
};

// 候補1件。選択中は枠の色と右端のチェックで示す。
export function FilterSheetRow({ imageUrl, title, subtitle, meta, selected, onClick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`flex w-full items-center gap-2.5 rounded-large border-2 px-2.5 py-2 text-left active:opacity-70 ${
          selected ? "border-primary bg-primary/10" : "border-transparent bg-default-100"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-10 w-auto shrink-0 rounded-[3px]" loading="lazy" />
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold">{title}</span>
          {subtitle && <span className="truncate text-tiny text-default-400">{subtitle}</span>}
        </span>
        {meta}
        {selected && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <LuCheck className="text-xs" />
          </span>
        )}
      </button>
    </li>
  );
}
