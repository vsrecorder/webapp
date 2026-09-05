"use client";

import { useCallback, useState } from "react";

import { Button, useDisclosure } from "@heroui/react";

import { LuCopy, LuEyeOff } from "react-icons/lu";

import BackLink from "@app/components/molecules/BackLink";

import { sharedDecksPath } from "@app/utils/deckCodePost";
import DeckCodePostCard from "@app/components/organisms/DeckCodePost/DeckCodePostCard";
import LoginPromptModal from "@app/components/organisms/DeckCodePost/LoginPromptModal";

import { DeckCodePostType } from "@app/types/deck_code_post";
import { copyDeckCode } from "@app/utils/deckCodeClipboard";

type Props = {
  post: DeckCodePostType;
  viewerId: string | null;
};

/*
 * 公開したデッキの個別ページ(X でシェアされる URL の着地先)。
 * 投稿カードをそのまま1枚で見せ、未ログインの人には下部に固定の CTA を出す。
 */
export default function TemplateSharedDeckById({ post: initial, viewerId }: Props) {
  // サーバ側で閲覧者付きに取ってあるので「自分がいいね済みか」も入っている。いいねの結果で差し替える
  const [post, setPost] = useState(initial);
  const loginModal = useDisclosure();
  const [loginTitle, setLoginTitle] = useState("ログインが必要です");

  const onOpenLogin = loginModal.onOpen;
  const requireLogin = useCallback(
    (title: string) => {
      setLoginTitle(title);
      onOpenLogin();
    },
    [onOpenLogin],
  );

  const copyCode = () => copyDeckCode(post.code);

  return (
    <>
      <LoginPromptModal isOpen={loginModal.isOpen} onOpenChange={loginModal.onOpenChange} title={loginTitle} />

      {/* 上余白: ヘッダ直下に戻るリンクとカードが詰まって窮屈に見えないよう、上と要素間を空ける。
          下余白: 未ログインは固定の CTA バーの高さぶん、ログイン中も少し空けてカードが下端に貼り付かないようにする */}
      <div className={`flex w-full flex-col gap-3 pt-2 lg:mx-auto lg:max-w-2xl ${viewerId ? "pb-6" : "pb-24"}`}>
        <BackLink href={sharedDecksPath} label="みんなの公開デッキ" />

        {/* 投稿者本人にだけ返る非表示の状態。ほかの人にはこの投稿自体が「公開を終了しました」になる */}
        {post.hidden && (
          <div className="flex items-start gap-2.5 rounded-large border border-warning/30 bg-warning/10 p-3 text-sm">
            <LuEyeOff className="mt-0.5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <div className="font-bold">この投稿は運営により非表示になっています</div>
              <p className="text-xs leading-relaxed text-default-600">
                ほかの人には表示されません。デッキ詳細の公開スイッチから取り下げることはできますが、同じデッキコードを公開し直すことはできません。
              </p>
            </div>
          </div>
        )}

        <DeckCodePostCard
          post={post}
          viewerId={viewerId}
          onChange={setPost}
          onRequireLogin={requireLogin}
          linkToDetail={false}
        />

        {!viewerId && (
          <div className="rounded-large border border-primary/20 bg-primary/5 p-3 text-sm">
            <div className="font-bold">このデッキを使うには</div>
            <p className="mt-1 text-xs leading-relaxed text-default-500">
              コードをコピーして、公式サイトのデッキ構築に貼り付けられます。バトレコに登録すると、このまま自分のデッキとして取り込み、対戦記録もつけられます。
            </p>
          </div>
        )}
      </div>

      {/* 未ログインの人向けの固定 CTA */}
      {!viewerId && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-[1fr_1.7fr] gap-2 border-t border-default-200 bg-background/90 px-3 pt-2 backdrop-blur-md"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <Button variant="flat" onPress={copyCode} startContent={<LuCopy />}>
            コードをコピー
          </Button>
          <Button color="primary" onPress={() => requireLogin("取り込むにはログインが必要です")}>
            無料で登録して取り込む
          </Button>
        </div>
      )}
    </>
  );
}
