import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@app/auth";

import TemplateSharedDecksByUser from "@app/components/templates/SharedDecksByUser";

import { DeckCodePostGetByUserIdResponseType } from "@app/types/deck_code_post";
import { deckCodePostUserPath } from "@app/utils/deckCodePost";
import { getDeckCodePostsByUser } from "@app/utils/deckCodePostServer";

type Props = {
  params: Promise<{ id: string }>;
};

// 投稿者の公開情報・集計・投稿の1ページ目を閲覧者付きで取る(auth() と getDeckCodePostsByUser は
// リクエスト内でキャッシュされ、generateMetadata と描画で上流への取得は1回になる)。
//
// 公開中の投稿が1件も無いユーザは「存在しない」扱いにする。投稿者ページはログイン不要で
// 開けるので、ここで弾かないと任意のユーザIDから名前やアイコンを引けてしまう
// (公開しているのはみんなの公開デッキに投稿した人の情報だけ、という線を守る)。
async function getPage(id: string): Promise<DeckCodePostGetByUserIdResponseType | null> {
  const session = await auth();
  const data = await getDeckCodePostsByUser(id, session?.user.id ?? null);
  if (!data || data.post_count === 0) return null;

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPage(id);

  if (!data) {
    return { title: "みんなの公開デッキ", robots: { index: false, follow: false } };
  }

  const user = data.user;
  const title = `${user.name}さんの公開デッキ`;
  const description = `${user.name}さんがバトレコのみんなの公開デッキに載せているポケモンカードのデッキコード一覧です。`;
  const path = deckCodePostUserPath(user.id);

  return {
    title,
    description,
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

  if (!data) {
    notFound();
  }

  return (
    <TemplateSharedDecksByUser
      userId={data.user.id}
      viewerId={session?.user.id ?? null}
      initial={data}
    />
  );
}
