"use client";

import { useCallback } from "react";

import NextLink from "next/link";

import { Avatar, Button, ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import DesignationChip from "@app/components/molecules/DesignationChip";
import { FILTER_SHEET_LIST_HEIGHT_PX } from "@app/components/organisms/DeckCodePost/FilterSheet";

import { useOffsetPagination } from "@app/hooks/useOffsetPagination";
import { DeckCodePostLikerType, DeckCodePostType } from "@app/types/deck_code_post";
import { deckCodePostUserPath, fetchDeckCodePostLikers, formatRelativeTime } from "@app/utils/deckCodePost";

const PAGE_SIZE = 30;

const likerId = (liker: DeckCodePostLikerType) => liker.user.id;

type Props = {
  post: DeckCodePostType | null;
  isOpen: boolean;
  onOpenChange: () => void;
};

/*
 * 投稿にいいねした人の一覧シート。アイコン・名前・称号・押した時刻を新しい順に並べ、
 * 30人ずつ読み足す。開くたびに先頭から取り直す(閉じている間に増えたいいねを反映する)。
 */
export default function DeckCodePostLikersModal({ post, isOpen, onOpenChange }: Props) {
  const postId = post?.id ?? null;

  const fetchPage = useCallback(
    async (offset: number) => {
      if (!postId) return { items: [], meta: undefined };
      const data = await fetchDeckCodePostLikers(postId, PAGE_SIZE, offset);
      return { items: data.likers, meta: undefined };
    },
    [postId],
  );

  // 閉じている間は key を null にして空に戻し、開いたときに先頭から読む
  const { items: likers, isLoading, isLoadingMore, hasMore, error, loadMore } =
    useOffsetPagination<DeckCodePostLikerType>({
      key: isOpen ? postId : null,
      pageSize: PAGE_SIZE,
      fetchPage,
      getId: likerId,
    });

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2 text-base">
              いいねした人
              {post && <span className="text-sm font-normal text-default-500">{post.like_count}人</span>}
            </ModalHeader>
            <ModalBody className="pb-6">
              {/* 高さは絞り込みシート(環境・ACE SPEC)と同じ値で固定し、収まらない分はこの中だけを
                  スクロールして見る。いいねの人数や読み込み状態でシートの大きさが変わらないようにする */}
              <div className="overflow-y-auto" style={{ height: FILTER_SHEET_LIST_HEIGHT_PX }}>
                {isLoading && likers.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <Spinner size="sm" />
                  </div>
                )}
                {error && (
                  <div className="flex h-full items-center justify-center text-sm text-danger">
                    読み込めませんでした
                  </div>
                )}
                {likers.length === 0 && !isLoading && !error && (
                  <div className="flex h-full items-center justify-center text-sm text-default-400">
                    まだいいねはありません
                  </div>
                )}
                <ul className="flex flex-col divide-y divide-default-200">
                  {likers.map((liker) => (
                    <li key={liker.user.id} className="flex items-center gap-3 py-2">
                      <NextLink
                        href={deckCodePostUserPath(liker.user.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
                      >
                        <Avatar src={liker.user.image_url || undefined} name={liker.user.name} size="sm" className="shrink-0" />
                        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-bold">{liker.user.name}</span>
                          <DesignationChip tier={liker.user.designation_tier} />
                        </span>
                      </NextLink>
                      <span className="shrink-0 text-tiny text-default-400">{formatRelativeTime(liker.created_at)}</span>
                    </li>
                  ))}
                </ul>
                {isLoadingMore && (
                  <div className="flex justify-center py-3">
                    <Spinner size="sm" />
                  </div>
                )}
                {hasMore && !isLoadingMore && (
                  <Button size="sm" variant="flat" onPress={loadMore} className="mt-2 w-full">
                    もっと見る
                  </Button>
                )}
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
