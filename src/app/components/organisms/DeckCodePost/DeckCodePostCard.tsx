"use client";

import { memo, useRef, useState } from "react";

import NextLink from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, Card, CardBody, addToast, useDisclosure } from "@heroui/react";

import { FaXTwitter } from "react-icons/fa6";
import { LuExternalLink, LuHeart, LuLayers } from "react-icons/lu";

import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import DeckSprites from "@app/components/molecules/DeckSprites";
import DesignationChip from "@app/components/molecules/DesignationChip";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import DeckCodePostAceSpecRow from "@app/components/organisms/DeckCodePost/DeckCodePostAceSpecRow";
import DeckCodePostLikersModal from "@app/components/organisms/DeckCodePost/DeckCodePostLikersModal";

import { useHydrated } from "@app/hooks/useHydrated";
import { useInView } from "@app/hooks/useInView";
import { createLazyModal } from "@app/utils/lazyModal";
import {
  deckCodePostPath,
  deckCodePostShareUrl,
  deckCodePostUserPath,
  formatPublishedDate,
  formatRelativeTime,
  likeDeckCodePost,
  officialDeckUrl,
  unlikeDeckCodePost,
} from "@app/utils/deckCodePost";

import { DeckCodePostType } from "@app/types/deck_code_post";

// 取り込みに使うデッキ作成モーダルは重い(デッキ画像・タグ選択など)ため、押すまで読み込まない
const CreateDeckModal = createLazyModal(
  () => import("@app/components/organisms/Deck/Modal/CreateDeckModal"),
);

// 重ねて出す「いいねした人」のアイコン数(バックエンドが埋め込む人数と同じ)
const MAX_STACKED_LIKERS = 5;

type Props = {
  post: DeckCodePostType;
  // いいね等で投稿が更新されたときに親へ返す(一覧側で差し替える)
  onChange?: (post: DeckCodePostType) => void;
  // 閲覧者のユーザID。未ログインなら null
  viewerId: string | null;
  // 未ログインでログインが要る操作をしたとき(いいね・取り込み)
  onRequireLogin?: (title: string) => void;
  // デッキ名を個別ページへのリンクにする(一覧で true、個別ページでは false)
  linkToDetail?: boolean;
  // デッキ画像・アイコンの読み込み方。一覧では最初の数枚だけ "eager"、残りは "lazy" にして
  // 画面外のカードの画像(1枚 120〜140 KB)を初回リクエストから外す
  imageLoading?: "lazy" | "eager";
};

/*
 * みんなの公開デッキの投稿カード。タイムライン・個別ページ・投稿者ページで同じものを使う。
 *
 * 構成はデッキ詳細モーダルの上半分と同じ部品(デッキ画像・コード欄・カードリスト)で、
 * 投稿者・スプライト＋デッキ名・ACE SPEC・いいねを足したもの。
 * ひとこと・タグ・通報は持たない(自由記述を置かない方針)。
 */
function DeckCodePostCard({
  post,
  onChange,
  viewerId,
  onRequireLogin,
  linkToDetail = true,
  imageLoading = "eager",
}: Props) {
  const hydrated = useHydrated();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  // ACE SPEC はカードが見えてから取る(一覧の初期表示で全件分の通信を出さない)
  const inView = useInView(rootRef);

  const [liking, setLiking] = useState(false);
  const likersModal = useDisclosure();
  const importModal = useDisclosure();

  const toggleLike = async () => {
    if (!viewerId) {
      onRequireLogin?.("いいねするにはログインが必要です");
      return;
    }
    if (liking) return;

    setLiking(true);

    // 先に画面を切り替え、失敗したら戻す
    const optimistic: DeckCodePostType = {
      ...post,
      liked_by_me: !post.liked_by_me,
      like_count: Math.max(0, post.like_count + (post.liked_by_me ? -1 : 1)),
    };
    onChange?.(optimistic);

    try {
      const updated = post.liked_by_me
        ? await unlikeDeckCodePost(post.id)
        : await likeDeckCodePost(post.id);
      onChange?.(updated);
    } catch {
      onChange?.(post);
      addToast({ title: "いいねできませんでした", description: "時間をおいてもう一度お試しください", color: "danger" });
    } finally {
      setLiking(false);
    }
  };

  const openImport = () => {
    if (!viewerId) {
      onRequireLogin?.("デッキ登録にはログインが必要です");
      return;
    }
    importModal.onOpen();
  };

  const share = () => {
    window.open(deckCodePostShareUrl(post, window.location.origin), "_blank", "noopener,noreferrer");
  };

  const stacked = post.recent_likers.slice(0, MAX_STACKED_LIKERS);
  const rest = Math.max(0, post.like_count - stacked.length);

  return (
    <Card ref={rootRef} shadow="sm" className="w-full" data-testid="deck-code-post-card">
      <CardBody className="flex flex-col gap-2.5 p-3">
        {/* 投稿者 */}
        <div className="flex items-center gap-2">
          <NextLink
            href={deckCodePostUserPath(post.user.id)}
            className="flex min-w-0 flex-1 items-center gap-2 active:opacity-70"
          >
            <Avatar
              src={post.user.image_url || undefined}
              name={post.user.name}
              imgProps={{ loading: imageLoading }}
              className="h-9 w-9 shrink-0"
            />
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="truncate text-sm font-bold">{post.user.name}</span>
              <DesignationChip tier={post.user.designation_tier} />
            </span>
          </NextLink>
          {/* 個別ページはサーバ描画されるため、ハイドレーションが済むまでは時計に依らない日付を出す */}
          <span className="shrink-0 text-tiny text-default-400">
            {hydrated ? formatRelativeTime(post.published_at) : formatPublishedDate(post.published_at)}
          </span>
        </div>

        {/* スプライトを上、デッキ名を下に中央揃えで置く(マイデッキのギャラリー表示と同じ形)。
            スプライトが未登録の枠は unknown を出して常に2体分を並べる(マイデッキと同じ)。
            デッキ名は折り返さない(truncate)ため、min-w-0 を挟まないと最小コンテンツ幅が
            名前の全長まで広がり、カードごと横に伸びてしまう。 */}
        <div className="flex w-full min-w-0 flex-col items-center gap-1">
          <DeckSprites sprites={post.pokemon_sprites} size={48} loading={imageLoading} />
          {linkToDetail ? (
            <NextLink
              href={deckCodePostPath(post.id)}
              className="w-full min-w-0 truncate text-center font-bold text-large active:opacity-70"
            >
              {post.deck_name}
            </NextLink>
          ) : (
            <h1 className="w-full min-w-0 truncate text-center font-bold text-large">
              {post.deck_name}
            </h1>
          )}
        </div>

        <ZoomableDeckImage code={post.code} alt={post.deck_name} loading={imageLoading} />

        <CopyableDeckCode code={post.code} />

        <CardListAccordion code={post.code} />

        <DeckCodePostAceSpecRow
          aceSpec={{
            card_id: post.ace_spec_card_id,
            card_name: post.ace_spec_card_name,
            image_url: post.ace_spec_image_url,
          }}
          code={post.code}
          enabled={inView}
        />

        {/* いいね(ハート＋数)と、いいねした人。高さはハートのピル(26px)に合わせて 28px に固定し、
            骨格(DeckCodePostCardSkeleton)と揃える */}
        <div className="flex min-h-7 items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={post.liked_by_me}
            aria-label={post.liked_by_me ? "いいねを取り消す" : "いいね"}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-transform active:scale-90 ${
              post.liked_by_me
                ? "border-danger bg-danger/10 text-danger"
                : "border-default-200 text-default-500"
            }`}
          >
            <LuHeart className={post.liked_by_me ? "fill-current" : ""} />
            <span className="tabular-nums">{post.like_count}</span>
          </button>

          <button
            type="button"
            onClick={likersModal.onOpen}
            aria-label="いいねした人を見る"
            className="flex min-w-0 items-center gap-1.5 active:opacity-70"
          >
            {stacked.length > 0 && (
              <span className="flex">
                {stacked.map((liker, index) => (
                  <Avatar
                    key={liker.id}
                    src={liker.image_url || undefined}
                    name={liker.name}
                    imgProps={{ loading: imageLoading }}
                    className={`h-6 w-6 shrink-0 text-[0.5rem] ring-2 ring-content1 ${index === 0 ? "" : "-ml-2"}`}
                  />
                ))}
              </span>
            )}
            <span className="truncate text-[0.625rem] text-default-500">
              {post.like_count === 0 ? "まだいいねはありません" : rest > 0 ? `ほか${rest}人` : ""}
            </span>
          </button>

        </div>

        {/* 操作。アイコンだけでは何をするか分からないため、名前を添えた同じ幅のボタンを3つ並べる。
            「デッキ登録」はこの機能の主目的(自分のデッキとして使う)なので色を付けて目立たせる */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={share}
            aria-label="X にポストする"
            className="flex h-8 items-center justify-center gap-1 rounded-lg bg-default-100 text-xs font-bold text-default-600 active:opacity-70"
          >
            <FaXTwitter className="shrink-0" />
            ポスト
          </button>
          <a
            href={officialDeckUrl(post.code)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="公式サイトのデッキ構築で開く"
            className="flex h-8 items-center justify-center gap-1 rounded-lg bg-default-100 text-xs font-bold text-default-600 active:opacity-70"
          >
            <LuExternalLink className="shrink-0" />
            デッキ構築
          </a>
          <button
            type="button"
            onClick={openImport}
            aria-label="自分のデッキとして登録する"
            className="flex h-8 items-center justify-center gap-1 rounded-lg bg-primary/10 text-xs font-bold text-primary active:opacity-70"
          >
            {/* ナビバーの「デッキ一覧」と同じアイコンにして、登録先がデッキ一覧だと分かるようにする */}
            <LuLayers className="shrink-0" />
            デッキ登録
          </button>
        </div>
      </CardBody>

      <DeckCodePostLikersModal
        post={post}
        isOpen={likersModal.isOpen}
        onOpenChange={likersModal.onOpenChange}
      />

      {/* 取り込む: コード・デッキ名・スプライトを入れた状態でデッキ作成モーダルを開く
          (投稿を見た人がそのまま登録できるように。名前もアイコンも登録前に変えられる) */}
      <CreateDeckModal
        deck_code={post.code}
        initialName={post.deck_name}
        initialSprites={post.pokemon_sprites}
        isOpen={importModal.isOpen}
        onOpenChange={importModal.onOpenChange}
        onCreated={() => {
          // 取り込んだ回数は運営の指標として数えるだけなので、失敗しても画面には影響させない
          fetch(`/api/deck_code_posts/${post.id}/import`, { method: "POST" }).catch(() => {});
          addToast({ title: "自分のデッキに登録しました", color: "success" });
          router.push("/decks");
        }}
      />
    </Card>
  );
}

// 一覧で1件にいいねしても、変わっていない他のカードを描き直さないようにする。
// 親から渡す関数(onChange / onRequireLogin)は useCallback で同じ参照を保つこと。
export default memo(DeckCodePostCard);
