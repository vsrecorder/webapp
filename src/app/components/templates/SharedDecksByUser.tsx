"use client";

import { useCallback, useState } from "react";

import NextLink from "next/link";

import { Avatar, Button, useDisclosure } from "@heroui/react";

import DesignationChip from "@app/components/molecules/DesignationChip";
import BackLink from "@app/components/molecules/BackLink";
import DeckCodePostCard from "@app/components/organisms/DeckCodePost/DeckCodePostCard";
import LoginPromptModal from "@app/components/organisms/DeckCodePost/LoginPromptModal";

import { useOffsetPagination } from "@app/hooks/useOffsetPagination";
import {
  usePostListLeaveRecorder,
  useRefreshOnRestore,
  useRestoredPostList,
  useScrollBackOnRestore,
} from "@app/hooks/usePostListReturn";
import {
  DeckCodePostGetByUserIdResponseType,
  DeckCodePostType,
  DeckCodePostUserType,
} from "@app/types/deck_code_post";
import { swrFetcher, sharedDecksPath } from "@app/utils/deckCodePost";
import {
  SHARED_DECKS_USER_RETURN_KEY,
  SharedDecksUserReturnState,
  sharedDeckPostAnchorId,
} from "@app/utils/sharedDecksReturn";

const PAGE_SIZE = 20;

// 戻ってきたとき、押したカードを置く高さ(離れる前の高さを覚えていなかったとき)。ヘッダーの下あたり
const RETURN_FALLBACK_TOP = 80;

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
 *
 * 個別ページや別の投稿者ページから戻ってきたときは、離れる前に読み込んであった投稿を
 * そのまま出し、押したカードを元の高さへ戻す(みんなの公開デッキの一覧と同じ仕組み。
 * utils/sharedDecksReturn)。控えは同じ投稿者のページでだけ使う。
 */
export default function TemplateSharedDecksByUser(props: Props) {
  const { userId } = props;
  const restored = useRestoredPostList<SharedDecksUserReturnState>(
    SHARED_DECKS_USER_RETURN_KEY,
    (state) => state.userId === userId,
  );

  return (
    <SharedDecksByUserList
      key={restored ? `restored-${userId}` : `fresh-${userId}`}
      {...props}
      restored={restored}
    />
  );
}

function SharedDecksByUserList({
  userId,
  viewerId,
  initial,
  restored,
}: Props & { restored: SharedDecksUserReturnState | null }) {
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
    refreshItems: refreshPosts,
  } = useOffsetPagination<DeckCodePostType, UserSummary>({
    key: userId,
    pageSize: PAGE_SIZE,
    fetchPage,
    getId: postId,
    // 戻ってきたときは離れる前に読み込んであった投稿を出す。投稿者の集計はサーバで取った新しい値
    initial: restored
      ? { items: restored.posts, meta: toSummary(initial), hasMore: restored.hasMore }
      : { items: initial.posts, meta: toSummary(initial) },
  });

  // 戻ってきたら、押したカードを離れる前と同じ画面上の高さへ置く
  useScrollBackOnRestore(SHARED_DECKS_USER_RETURN_KEY, restored, RETURN_FALLBACK_TOP);
  // 控えから描いた一覧の中身(いいねなど)を、位置を動かさずに最新へ寄せる
  useRefreshOnRestore(restored, refreshPosts);

  // 一覧を離れるリンクが押されたら、戻ってきたときのために今の一覧を控える
  const rememberLeavingFrom = usePostListLeaveRecorder<SharedDecksUserReturnState>(
    SHARED_DECKS_USER_RETURN_KEY,
    { userId, posts, hasMore },
  );
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
          <div className="flex flex-col items-center gap-3 rounded-large bg-content1 p-6 text-center text-sm text-default-500">
            公開中のデッキはありません。
            {/* 自分のページなら公開のしかたへ案内する(全部取り下げた直後にここへ来るため) */}
            {viewerId === userId && (
              <NextLink
                href="/decks"
                className="rounded-full bg-primary/10 px-4 py-2 font-bold text-primary active:opacity-70"
              >
                自分のデッキから公開する
              </NextLink>
            )}
          </div>
        )}

        {/* 外側の要素は戻ってきたときの目印と、一覧を離れるリンクの押下を拾うためのもの
            (いいねした人のモーダルの中のリンクも、React のイベントの伝わり方でここに届く) */}
        {posts.map((post, index) => (
          <div
            key={post.id}
            id={sharedDeckPostAnchorId(SHARED_DECKS_USER_RETURN_KEY, post.id)}
            onClickCapture={(event) => rememberLeavingFrom(post.id, event)}
          >
            <DeckCodePostCard
              post={post}
              viewerId={viewerId}
              onChange={updatePost}
              onRequireLogin={requireLogin}
              imageLoading={index < 2 ? "eager" : "lazy"}
            />
          </div>
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
