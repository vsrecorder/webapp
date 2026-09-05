import type { Metadata } from "next";
import NextLink from "next/link";

import { auth } from "@app/auth";

import BackLink from "@app/components/molecules/BackLink";
import TemplateSharedDecksByUser from "@app/components/templates/SharedDecksByUser";

import { DeckCodePostGetByUserIdResponseType } from "@app/types/deck_code_post";
import { deckCodePostUserPath, sharedDecksPath } from "@app/utils/deckCodePost";
import { getDeckCodePostsByUser } from "@app/utils/deckCodePostServer";

type Props = {
  params: Promise<{ id: string }>;
};

// 投稿者の公開情報・集計・投稿の1ページ目を閲覧者付きで取る(auth() と getDeckCodePostsByUser は
// リクエスト内でキャッシュされ、generateMetadata と描画で上流への取得は1回になる)。
//
// 上流は、公開中の投稿が1件も無いユーザでも投稿者の公開情報と0件の集計を返す。
// null になるのはユーザ自体が無い(または不正なID)ときだけ。
async function getPage(id: string): Promise<DeckCodePostGetByUserIdResponseType | null> {
  const session = await auth();

  return await getDeckCodePostsByUser(id, session?.user.id ?? null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPage(id);

  if (!data) {
    return { title: "みんなの公開デッキ", robots: { index: false, follow: false } };
  }

  const user = data.user;
  const title = `${user.name}さんの公開デッキ`;
  // 公開中のデッキが無いページは中身が無いので索引には載せない(リンクも張られない)
  const robots = data.post_count === 0 ? { index: false, follow: false } : undefined;
  const description = `${user.name}さんがバトレコのみんなの公開デッキに載せているポケモンカードのデッキコード一覧です。`;
  const path = deckCodePostUserPath(user.id);

  return {
    title,
    description,
    robots,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "profile",
      title,
      description,
      locale: "ja_JP",
      siteName: "バトレコ",
    },
    twitter: {
      card: "summary_large_image",
      site: "@vsrecorder_mobi",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const [session, data] = await Promise.all([auth(), getPage(id)]);

  // 存在しないIDのときは 404 ページを出さず、案内を出して一覧へ戻せるようにする
  if (!data) {
    return <EmptyUserPage />;
  }

  return (
    <TemplateSharedDecksByUser
      userId={data.user.id}
      viewerId={session?.user.id ?? null}
      initial={data}
    />
  );
}

// 存在しないユーザIDで投稿者ページを開いたときの表示。
function EmptyUserPage() {
  return (
    <div className="flex w-full flex-col gap-3 pt-2 pb-6 lg:mx-auto lg:max-w-2xl">
      <BackLink href={sharedDecksPath} label="みんなの公開デッキ" />

      <div className="flex flex-col items-center gap-3 rounded-large bg-content1 p-8 text-center shadow-small">
        <div className="text-sm text-default-500">
          公開中のデッキはありません。
          <br />
          取り下げられたか、まだ公開されていません。
        </div>
        <NextLink
          href={sharedDecksPath}
          className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary active:opacity-70"
        >
          みんなの公開デッキを見る
        </NextLink>
      </div>
    </div>
  );
}
