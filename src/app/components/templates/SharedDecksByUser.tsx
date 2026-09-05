"use client";

import { useCallback, useState } from "react";

import { Avatar, Button, useDisclosure } from "@heroui/react";

import DesignationChip from "@app/components/molecules/DesignationChip";
import BackLink from "@app/components/molecules/BackLink";
import DeckCodePostCard from "@app/components/organisms/DeckCodePost/DeckCodePostCard";
import LoginPromptModal from "@app/components/organisms/DeckCodePost/LoginPromptModal";

import { useOffsetPagination } from "@app/hooks/useOffsetPagination";
import {
  DeckCodePostGetByUserIdResponseType,
  DeckCodePostType,
  DeckCodePostUserType,
} from "@app/types/deck_code_post";
import { swrFetcher, sharedDecksPath } from "@app/utils/deckCodePost";

const PAGE_SIZE = 20;

const postId = (post: DeckCodePostType) => post.id;

// 投稿者の公開情報と集計(ページの付随情報)
type UserSummary = {
  user: DeckCodePostUserType;
  postCount: number;
  likeCountTotal: number;
};

function toSummary(data: DeckCodePostGetByUserIdResponseType): UserSummary {
  return { user: data.user, postCount: data.post_count, likeCountTotal: data.like_count_total };
}

type Props = {
  userId: string;
  viewerId: string | null;
  // サーバで取った投稿者の公開情報・集計・投稿の1ページ目
  initial: DeckCodePostGetByUserIdResponseType;
};

/*
 * 投稿者ページ。公開情報(アイコン・名前・ランクと称号・公開デッキ数・もらったいいね)と
 * 公開中の投稿だけで組み、対戦記録や非公開デッキは出さない。ログイン不要。
 * 1ページ目はサーバ描画(HTML に投稿へのリンクが載る)で、「もっと見る」だけをここで取る。
 */
export default function TemplateSharedDecksByUser({ userId, viewerId, initial }: Props) {
  const fetchPage = useCallback(
    async (offset: number) => {
      const data = await swrFetcher<DeckCodePostGetByUserIdResponseType>(
        `/api/users/${userId}/deck_code_posts?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      return { items: data.posts, meta: toSummary(data) };
    },
    [userId],
  );

  const {
    items: posts,
    meta,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    updateItem: updatePost,
  } = useOffsetPagination<DeckCodePostType, UserSummary>({
    key: userId,
    pageSize: PAGE_SIZE,
    fetchPage,
    getId: postId,
    initial: { items: initial.posts, meta: toSummary(initial) },
  });
  const { user, postCount, likeCountTotal } = meta ?? toSummary(initial);

  const loginModal = useDisclosure();
  const [loginTitle, setLoginTitle] = useState("ログインが必要です");
  // 投稿カードは memo しているので、渡す関数の参照を固定して無駄な再描画を防ぐ
  const onOpenLogin = loginModal.onOpen;
  const requireLogin = useCallback(
    (title: string) => {
      setLoginTitle(title);
      onOpenLogin();
    },
    [onOpenLogin],
  );

  return (
    <>
      <LoginPromptModal isOpen={loginModal.isOpen} onOpenChange={loginModal.onOpenChange} title={loginTitle} />

      <div className="flex w-full flex-col gap-3 pt-2 pb-6 lg:mx-auto lg:max-w-2xl">
        <BackLink href={sharedDecksPath} label="みんなの公開デッキ" />

        <div className="flex flex-col gap-3 rounded-large bg-content1 p-4 shadow-small">
            <div className="flex items-center gap-3">
              <Avatar src={user.image_url || undefined} name={user.name} className="h-14 w-14 shrink-0 text-xl" />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="truncate text-base font-bold">{user.name}</div>
                <DesignationChip tier={user.designation_tier} size="md" className="w-fit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-medium bg-default-100 px-3 py-2">
                <div className="text-tiny font-bold text-default-500">公開デッキ</div>
                <div className="text-lg font-black tabular-nums">{postCount}</div>
              </div>
              <div className="rounded-medium bg-default-100 px-3 py-2">
                <div className="text-tiny font-bold text-default-500">もらったいいね</div>
                <div className="text-lg font-black tabular-nums">{likeCountTotal}</div>
              </div>
            </div>
        </div>

        {posts.length === 0 && (
          <div className="rounded-large bg-content1 p-6 text-center text-sm text-default-500">
            公開中のデッキはありません。
          </div>
        )}

        {posts.map((post, index) => (
          <DeckCodePostCard
            key={post.id}
            post={post}
            viewerId={viewerId}
            onChange={updatePost}
            onRequireLogin={requireLogin}
            imageLoading={index < 2 ? "eager" : "lazy"}
          />
        ))}

        {error && (
          <div className="rounded-large bg-content1 p-4 text-center text-sm text-default-500">
            読み込めませんでした。
          </div>
        )}

        {hasMore && (
          <Button variant="flat" isLoading={isLoadingMore} onPress={loadMore}>
            もっと見る
          </Button>
        )}
      </div>
    </>
  );
}
