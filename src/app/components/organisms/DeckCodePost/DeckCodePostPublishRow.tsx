"use client";

import { ReactNode, useState } from "react";

import NextLink from "next/link";

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  addToast,
  useDisclosure,
} from "@heroui/react";

import { LuCheck, LuExternalLink, LuUsers, LuX } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";

import { useDeckActivePosts } from "@app/hooks/useDeckActivePosts";
import {
  DeckCodePostApiError,
  deckCodePostPath,
  publishDeckCode,
  unpublishDeckCodePost,
} from "@app/utils/deckCodePost";

type Props = {
  deckId: string;
  deckCodeId: string;
  // 行の補足に出すバージョンの呼び名(例: 「最新バージョン(3)」)。無ければ出さない
  versionLabel?: string;
  // アーカイブしたデッキは公開できない(公開中のものはアーカイブ時に取り下がる)
  isArchived?: boolean;
  // 置く面の地色。バージョン履歴(bg-default-100)の上では content1 にする
  background?: "default-100" | "content1";
};

/*
 * 「みんなの公開デッキに載せる」のスイッチ。デッキ詳細モーダル(最新バージョン)と
 * バージョン履歴(各バージョン)の両方に置き、同じデッキの投稿状態(useDeckActivePosts)を
 * 共有する。オン・オフどちらも確認シートを通す。
 *
 * デッキとコードの公開/非公開設定は条件にしない(いまは設定を変える画面がなく、
 * 作成時に必ず非公開になるため)。
 */
export default function DeckCodePostPublishRow({
  deckId,
  deckCodeId,
  versionLabel,
  isArchived = false,
  background = "default-100",
}: Props) {
  const { byDeckCodeId, isLoading, mutate } = useDeckActivePosts(deckId);
  const post = byDeckCodeId.get(deckCodeId) ?? null;
  const [pending, setPending] = useState(false);

  const publishModal = useDisclosure();
  const unpublishModal = useDisclosure();

  const handleToggle = (next: boolean) => {
    if (pending || isArchived) return;
    if (next) {
      publishModal.onOpen();
    } else {
      unpublishModal.onOpen();
    }
  };

  const publish = async (onClose: () => void) => {
    setPending(true);
    try {
      await publishDeckCode(deckCodeId);
      await mutate();
      addToast({ title: "みんなの公開デッキに載せました", color: "success" });
      onClose();
    } catch (e) {
      const status = e instanceof DeckCodePostApiError ? e.status : 0;
      addToast({
        title: "公開できませんでした",
        description:
          status === 429
            ? "同じコードの公開し直しは24時間に1回までです"
            : status === 409
              ? "アーカイブしたデッキは公開できません"
              : status === 403
                ? "このデッキコードの投稿は運営により非表示になっているため、公開し直せません"
                : "時間をおいてもう一度お試しください",
        color: "danger",
      });
    } finally {
      setPending(false);
    }
  };

  const unpublish = async (onClose: () => void) => {
    if (!post) return;
    setPending(true);
    try {
      await unpublishDeckCodePost(post.id);
      await mutate();
      addToast({ title: "公開をやめました", color: "default" });
      onClose();
    } catch {
      addToast({
        title: "取り下げられませんでした",
        description: "時間をおいてもう一度お試しください",
        color: "danger",
      });
    } finally {
      setPending(false);
    }
  };

  const bg = background === "content1" ? "bg-content1" : "bg-default-100";
  const status = isArchived
    ? "アーカイブしたデッキは公開できません"
    : post?.hidden
      ? "運営により非表示 · ほかの人には表示されません"
      : post
        ? `公開中 · いいね ${post.like_count}`
        : "みんなの公開デッキには載っていません";
  // 「最新バージョン(3) · 公開中 · いいね 2」のように、バージョン名があれば頭に添える
  const caption = [isArchived ? null : versionLabel, status].filter(Boolean).join(" · ");

  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${post?.hidden ? "bg-warning/10" : post ? "bg-primary/10" : bg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <LuUsers className={`shrink-0 ${post?.hidden ? "text-warning-600" : post ? "text-primary" : "text-default-500"}`} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={`text-tiny font-bold ${post?.hidden ? "text-warning-600" : post ? "text-primary" : "text-default-600"}`}>
            みんなの公開デッキに載せる
          </div>
          <div className="flex items-center gap-1 text-[0.625rem] text-default-500">
            <span className="truncate">{caption}</span>
            {post && !post.hidden && (
              <NextLink
                href={deckCodePostPath(post.id)}
                className="inline-flex shrink-0 items-center gap-0.5 text-primary active:opacity-70"
              >
                見る
                <LuExternalLink className="text-[0.625rem]" />
              </NextLink>
            )}
          </div>
        </div>
        <Switch
          size="sm"
          aria-label="みんなの公開デッキに載せる"
          isSelected={!!post}
          isDisabled={isArchived || pending || isLoading}
          onValueChange={handleToggle}
        />
      </div>

      {/* 公開の確認 */}
      <ConfirmSheet
        isOpen={publishModal.isOpen}
        onOpenChange={publishModal.onOpenChange}
        title="みんなの公開デッキに載せる"
        confirmLabel="公開する"
        confirmColor="primary"
        cancelLabel="やめる"
        pending={pending}
        onConfirm={publish}
      >
        <p className="text-default-600">
          このバージョンのデッキコードが、ログインしていない人にも見えるタイムラインと個別ページに載ります。
        </p>
        <BulletGroup title="公開されるもの">
          {["デッキ名とスプライト", "デッキ画像・デッキコード・カードリスト", "ACE SPEC", "あなたの名前・アイコン・ランク・称号"].map((t) => (
            <Bullet key={t} ok>
              {t}
            </Bullet>
          ))}
        </BulletGroup>
        <BulletGroup title="公開されないもの">
          {["バージョンのメモ", "あなたが付けたタグ", "対戦記録と勝敗", "きずなLv."].map((t) => (
            <Bullet key={t} muted>
              {t}
            </Bullet>
          ))}
        </BulletGroup>
      </ConfirmSheet>

      {/* 取り下げの確認 */}
      <ConfirmSheet
        isOpen={unpublishModal.isOpen}
        onOpenChange={unpublishModal.onOpenChange}
        title="公開をやめますか？"
        confirmLabel="公開をやめる"
        confirmColor="danger"
        cancelLabel="やめない"
        pending={pending}
        onConfirm={unpublish}
      >
        <Bullet>みんなの公開デッキから消え、ほかの人の一覧にも出なくなります。</Bullet>
        <Bullet>
          ついている <b className="text-foreground">いいね {post?.like_count ?? 0}</b> は消えます。公開し直しても戻りません。
        </Bullet>
        {post?.hidden ? (
          <Bullet>この投稿は運営により非表示になっているため、同じデッキコードを公開し直すことはできません。</Bullet>
        ) : (
          <Bullet ok>デッキとバージョンはそのまま残ります。同じコードの公開し直しは24時間に1回までです。</Bullet>
        )}
      </ConfirmSheet>
    </>
  );
}

// 下から出る確認シート。本文(children)の下に「実行」と「やめる」を縦に並べる。
// 公開と取り下げの2つで同じ骨組みを使う(片方だけ体裁が変わらないようにする)。
function ConfirmSheet({
  isOpen,
  onOpenChange,
  title,
  confirmLabel,
  confirmColor,
  cancelLabel,
  pending,
  onConfirm,
  children,
}: {
  isOpen: boolean;
  onOpenChange: () => void;
  title: string;
  confirmLabel: string;
  confirmColor: "primary" | "danger";
  cancelLabel: string;
  // 実行中は閉じられず、ボタンも押せない
  pending: boolean;
  onConfirm: (onClose: () => void) => void;
  children: ReactNode;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom"
      scrollBehavior="inside"
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-base">{title}</ModalHeader>
            <ModalBody className="gap-4 text-sm">{children}</ModalBody>
            <ModalFooter className="flex-col gap-2 pb-6">
              <Button color={confirmColor} fullWidth isLoading={pending} onPress={() => onConfirm(onClose)}>
                {confirmLabel}
              </Button>
              <Button variant="light" fullWidth isDisabled={pending} onPress={onClose}>
                {cancelLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// 見出し付きの箇条書き(「公開されるもの」「公開されないもの」)
function BulletGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-tiny font-bold tracking-wider text-default-500">{title}</div>
      {children}
    </div>
  );
}

// 箇条書きの1行。ok はチェック(残る・公開される)、それ以外は ×(消える・公開されない)。
// muted は行ごと薄くする(公開されないものの一覧)。
function Bullet({ ok = false, muted = false, children }: { ok?: boolean; muted?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-2 ${muted ? "text-default-500" : "text-default-600"}`}>
      {ok ? (
        <LuCheck className="mt-0.5 shrink-0 text-success" />
      ) : (
        <LuX className="mt-0.5 shrink-0 text-default-400" />
      )}
      <span>{children}</span>
    </div>
  );
}
