import type { Metadata } from "next";

import { auth } from "@app/auth";

import TemplateSharedDecks from "@app/components/templates/SharedDecks";

import { getDeckCodePostFirstPage } from "@app/utils/deckCodePostServer";

const title = "みんなの公開デッキ";
const description =
  "バトレコのユーザが公開したポケモンカードのデッキコード一覧。現在の環境で組まれたデッキのカードリストとACE SPECを確認し、コードをコピーしてそのまま使えます。";

// ログイン不要で見られる公開ページ。検索エンジンにも載せる。
export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/shared_decks",
  },
  openGraph: {
    url: "/shared_decks",
    type: "website",
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

export default async function Page() {
  const session = await auth();
  const viewerId = session?.user.id ?? null;

  // 1ページ目はサーバで取って HTML に載せる。クローラは /api を読めない(robots で除外)ため、
  // ここで投稿へのリンクを出さないと個別ページが見つからない。取れなければクライアントが取り直す。
  const initial = await getDeckCodePostFirstPage(viewerId);

  return <TemplateSharedDecks viewerId={viewerId} initial={initial ?? undefined} />;
}
