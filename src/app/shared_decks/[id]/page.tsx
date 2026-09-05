import type { Metadata } from "next";
import { notFound } from "next/navigation";

import NextLink from "next/link";

import { auth } from "@app/auth";

import BackLink from "@app/components/molecules/BackLink";
import TemplateSharedDeckById from "@app/components/templates/SharedDeckById";

import { DeckCodePostGetByIdResponseType } from "@app/types/deck_code_post";
import { deckCodePostPath, sharedDecksPath } from "@app/utils/deckCodePost";
import { DeckCodePostFetchResult, getDeckCodePost } from "@app/utils/deckCodePostServer";
import { ensureDeckCodePostOgImage } from "@app/utils/deckCodePostOg";
import { OG_SIZE } from "@app/utils/ogImage";

type Props = {
  params: Promise<{ id: string }>;
};

// 投稿を閲覧者付きで取る(ログイン中なら「自分がいいね済みか」が入る)。
// auth() と getDeckCodePost はどちらもリクエスト内でキャッシュされるため、
// generateMetadata とページの描画で上流への取得は1回になる。
async function getPost(id: string): Promise<DeckCodePostFetchResult> {
  const session = await auth();
  return getDeckCodePost(id, session?.user.id ?? null);
}

function buildTitle(post: DeckCodePostGetByIdResponseType): string {
  return `${post.deck_name} | ${post.user.name}さんの公開デッキ`;
}

function buildDescription(post: DeckCodePostGetByIdResponseType): string {
  const ace = post.ace_spec_card_name ? `ACE SPEC は${post.ace_spec_card_name}。` : "";
  return `${post.user.name}さんがバトレコで公開したデッキ「${post.deck_name}」。${ace}60枚のカードリストとデッキコードを掲載しています。コードをコピーしてそのまま使えます。`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getPost(id);

  if (result.status !== "ok") {
    return { title: "みんなの公開デッキ", robots: { index: false, follow: false } };
  }

  const post = result.post;
  const title = buildTitle(post);
  const description = buildDescription(post);
  const path = deckCodePostPath(post.id);

  // 公開直後に先回りで生成してあれば、ここはキーの確認だけで済む
  const ogImageUrl = await ensureDeckCodePostOgImage(post);

  return {
    title,
    description,
    // 運営が非表示にした投稿は投稿者本人にだけ返るページなので、索引させない
    robots: post.hidden ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: path,
    },
    openGraph: {
      url: path,
      type: "article",
      title,
      description,
      locale: "ja_JP",
      siteName: "バトレコ",
      images: ogImageUrl ? [{ url: ogImageUrl, ...OG_SIZE, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: "@vsrecorder_mobi",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const [session, result] = await Promise.all([auth(), getPost(id)]);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "gone") {
    return (
      <div className="flex w-full flex-col gap-3 pt-2 pb-6 lg:mx-auto lg:max-w-2xl">
        <BackLink href={sharedDecksPath} label="みんなの公開デッキ" />
        <div className="flex flex-col items-center gap-3 rounded-large bg-content1 p-8 text-center">
          <div className="text-base font-bold">このデッキは公開を終了しました</div>
          {/* 取り下げ・デッキの削除・運営の非表示のどれかだが、理由は出さない(非表示を外から区別できないようにする) */}
          <p className="text-sm text-default-500">この投稿は現在表示できません。</p>
          <NextLink href="/shared_decks" className="text-sm font-bold text-primary">
            みんなの公開デッキへ
          </NextLink>
        </div>
      </div>
    );
  }

  return <TemplateSharedDeckById post={result.post} viewerId={session?.user.id ?? null} />;
}
